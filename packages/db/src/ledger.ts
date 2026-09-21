import { randomUUID } from "node:crypto";

import type { LedgerEvent, UserBalance } from "../../contracts/src/economy.js";
import {
  accountLevelFromXp,
  applyEnergyRegen,
  ENERGY_BASE_CAP,
  XP_DAILY_CAP
} from "../../domain/src/economy.js";
import type { DatabaseHandle } from "./database.js";

/**
 * Server-authoritative economy ledger (P1-7).
 *
 * The ledger is the source of truth for Coins; XP, Mastery Stars and
 * Energy keep a derived state row that is updated atomically with every
 * ledger event (and can be reconciled against the ledger at any time).
 * Duplicate events are rejected by idempotency key; balances can never
 * go negative.
 */

export type LedgerEventInput = {
  userId: string;
  asset: LedgerEvent["asset"];
  amount: number;
  reason: LedgerEvent["reason"];
  sourceId?: string;
  scenarioId?: string;
  idempotencyKey: string;
  promo?: boolean;
  riskState?: LedgerEvent["riskState"];
  createdAt?: string;
};

export type UserEconomyState = {
  userId: string;
  xpTotal: number;
  accountLevel: number;
  xpDayUtc: string;
  xpDayAmount: number;
  masteryStars: number;
  energy: number;
  energyCap: number;
  energyRegenAt: string;
  updatedAt: string;
};

type StateRow = {
  xpTotal: number;
  accountLevel: number;
  xpDayUtc: string;
  xpDayAmount: number;
  masteryStars: number;
  energy: number;
  energyCap: number;
  energyRegenAt: string;
  updatedAt: string;
};

export function utcDayKey(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10);
}

export function defaultEconomyState(userId: string, nowIso: string): StateRow {
  return {
    xpTotal: 0,
    accountLevel: 1,
    xpDayUtc: "",
    xpDayAmount: 0,
    masteryStars: 0,
    energy: ENERGY_BASE_CAP,
    energyCap: ENERGY_BASE_CAP,
    energyRegenAt: nowIso,
    updatedAt: nowIso
  };
}

export function applyEventToState(state: StateRow, input: LedgerEventInput, nowIso: string): StateRow {
  const next: StateRow = { ...state };

  switch (input.asset) {
    case "xp": {
      const xpTotal = state.xpTotal + input.amount;
      if (xpTotal < 0) {
        throw new Error(`ledger: XP total cannot go negative for user ${input.userId}`);
      }
      const day = utcDayKey(nowIso);
      if (input.amount > 0) {
        const sameDay = state.xpDayUtc === day;
        next.xpDayUtc = day;
        next.xpDayAmount = sameDay ? state.xpDayAmount + input.amount : input.amount;
      } else {
        next.xpDayAmount = Math.max(0, state.xpDayAmount + input.amount);
      }
      next.xpTotal = xpTotal;
      next.accountLevel = accountLevelFromXp(xpTotal).level;
      break;
    }
    case "mastery_stars": {
      const masteryStars = state.masteryStars + input.amount;
      if (masteryStars < 0) {
        throw new Error(
          `ledger: mastery stars cannot go negative for user ${input.userId}`
        );
      }
      next.masteryStars = masteryStars;
      break;
    }
    case "energy": {
      const energy = state.energy + input.amount;
      if (energy < 0) {
        throw new Error(`ledger: energy cannot go negative for user ${input.userId}`);
      }
      next.energy = Math.min(state.energyCap, energy);
      if (input.amount > 0) {
        next.energyRegenAt = next.energy >= state.energyCap ? state.energyRegenAt : nowIso;
      } else {
        next.energyRegenAt = nowIso;
      }
      break;
    }
    case "coins":
      // Coins are derived from the ledger itself; no state row needed.
      break;
  }

  next.updatedAt = nowIso;
  return next;
}

/**
 * Append an immutable ledger event and update the derived economy state
 * atomically. Returns `inserted: false` when the idempotency key already
 * exists (duplicate rewards are rejected, never double-granted).
 */
export function recordLedgerEvent(
  { sqlite }: DatabaseHandle,
  input: LedgerEventInput
): { inserted: boolean; event: LedgerEvent } {
  const nowIso = input.createdAt ?? new Date().toISOString();
  const event: LedgerEvent = {
    eventId: randomUUID(),
    userId: input.userId,
    asset: input.asset,
    amount: input.amount,
    reason: input.reason,
    sourceId: input.sourceId,
    scenarioId: input.scenarioId,
    idempotencyKey: input.idempotencyKey,
    promo: input.promo ?? false,
    riskState: input.riskState ?? "cleared",
    createdAt: nowIso
  };

  const apply = sqlite.transaction(() => {
    const existing = sqlite
      .prepare("SELECT event_id FROM ledger_events WHERE idempotency_key = ?")
      .get(input.idempotencyKey) as { event_id: string } | undefined;

    if (existing) {
      return { inserted: false as const, eventId: existing.event_id };
    }

    sqlite
      .prepare(
        `INSERT INTO ledger_events (
          event_id, user_id, asset, amount, reason, source_id, scenario_id,
          idempotency_key, promo, risk_state, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        event.eventId,
        event.userId,
        event.asset,
        event.amount,
        event.reason,
        event.sourceId ?? null,
        event.scenarioId ?? null,
        event.idempotencyKey,
        event.promo ? 1 : 0,
        event.riskState,
        event.createdAt
      );

    const row = sqlite
      .prepare(STATE_SELECT)
      .get(input.userId) as (StateRow & { user_id: string }) | undefined;
    const state = row ? readStateRow(row) : defaultEconomyState(input.userId, nowIso);
    const next = applyEventToState(state, input, nowIso);

    if (row) {
      sqlite
        .prepare(
          `UPDATE user_economy_state SET
            xp_total = ?, account_level = ?, xp_day_utc = ?, xp_day_amount = ?,
            mastery_stars = ?, energy = ?, energy_cap = ?, energy_regen_at = ?,
            updated_at = ?
          WHERE user_id = ?`
        )
        .run(
          next.xpTotal,
          next.accountLevel,
          next.xpDayUtc,
          next.xpDayAmount,
          next.masteryStars,
          next.energy,
          next.energyCap,
          next.energyRegenAt,
          next.updatedAt,
          input.userId
        );
    } else {
      sqlite
        .prepare(
          `INSERT INTO user_economy_state (
            user_id, xp_total, account_level, xp_day_utc, xp_day_amount,
            mastery_stars, energy, energy_cap, energy_regen_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          input.userId,
          next.xpTotal,
          next.accountLevel,
          next.xpDayUtc,
          next.xpDayAmount,
          next.masteryStars,
          next.energy,
          next.energyCap,
          next.energyRegenAt,
          next.updatedAt
        );
    }

    return { inserted: true as const, eventId: event.eventId };
  });

  const result = apply();
  const finalEvent: LedgerEvent = result.inserted
    ? event
    : { ...event, eventId: result.eventId };
  return { inserted: result.inserted, event: finalEvent };
}

const STATE_SELECT = `
  SELECT
    user_id,
    xp_total AS xpTotal,
    account_level AS accountLevel,
    xp_day_utc AS xpDayUtc,
    xp_day_amount AS xpDayAmount,
    mastery_stars AS masteryStars,
    energy,
    energy_cap AS energyCap,
    energy_regen_at AS energyRegenAt,
    updated_at AS updatedAt
  FROM user_economy_state
  WHERE user_id = ?
`;

function readStateRow(
  row: StateRow & { user_id: string }
): StateRow {
  return {
    xpTotal: row.xpTotal,
    accountLevel: row.accountLevel,
    xpDayUtc: row.xpDayUtc,
    xpDayAmount: row.xpDayAmount,
    masteryStars: row.masteryStars,
    energy: row.energy,
    energyCap: row.energyCap,
    energyRegenAt: row.energyRegenAt,
    updatedAt: row.updatedAt
  };
}

export function getEconomyState(
  { sqlite }: DatabaseHandle,
  userId: string
): UserEconomyState | undefined {
  const row = sqlite
    .prepare(STATE_SELECT)
    .get(userId) as (StateRow & { user_id: string }) | undefined;
  if (!row) {
    return undefined;
  }
  const state = readStateRow(row);
  return { ...state, userId: row.user_id };
}

export function listLedgerEvents(
  { sqlite }: DatabaseHandle,
  userId: string,
  limit = 50
): LedgerEvent[] {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 500);
  const rows = sqlite
    .prepare(
      `SELECT * FROM ledger_events WHERE user_id = ?
       ORDER BY created_at DESC, event_id DESC
       LIMIT ?`
    )
    .all(userId, safeLimit) as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    eventId: String(row.event_id),
    userId: String(row.user_id),
    asset: String(row.asset) as LedgerEvent["asset"],
    amount: Number(row.amount),
    reason: String(row.reason) as LedgerEvent["reason"],
    sourceId: row.source_id === null ? undefined : String(row.source_id),
    scenarioId: row.scenario_id === null ? undefined : String(row.scenario_id),
    idempotencyKey: String(row.idempotency_key),
    promo: Number(row.promo) === 1,
    riskState: String(row.risk_state) as LedgerEvent["riskState"],
    createdAt: String(row.created_at)
  }));
}

/**
 * Promo Coins granted to a user inside a UTC window (for the referral
 * monthly cap). Only cleared, positive, promo coin events count.
 */
export function sumPromoCoinsInRange(
  { sqlite }: DatabaseHandle,
  userId: string,
  fromIso: string,
  toIso: string
): number {
  const row = sqlite
    .prepare(
      `SELECT COALESCE(SUM(amount) FILTER (WHERE risk_state = 'cleared'), 0) AS total
       FROM ledger_events
       WHERE user_id = ? AND asset = 'coins' AND promo = 1 AND amount > 0
         AND created_at >= ? AND created_at < ?`
    )
    .get(userId, fromIso, toIso) as { total: number } | undefined;
  return row?.total ?? 0;
}

function sumCoins(
  { sqlite }: DatabaseHandle,
  userId: string
): { coins: number; coinsPromo: number } {
  const row = sqlite
    .prepare(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE risk_state = 'cleared'), 0) AS total,
         COALESCE(SUM(amount) FILTER (WHERE promo = 1 AND risk_state = 'cleared'), 0) AS promoTotal
       FROM ledger_events
       WHERE user_id = ? AND asset = 'coins'`
    )
    .get(userId) as { total: number; promoTotal: number } | undefined;
  const coins = row?.total ?? 0;
  const coinsPromo = row?.promoTotal ?? 0;
  if (coins < 0) {
    throw new Error(`ledger: derived coins balance is negative for user ${userId}`);
  }
  return { coins, coinsPromo: Math.max(0, coinsPromo) };
}

/**
 * Shared balance builder (SQLite and Postgres adapters): pure function of
 * the state row plus the Coins derived from the ledger.
 */
export function buildUserBalance(params: {
  userId: string;
  state?: UserEconomyState | undefined;
  coins: number;
  coinsPromo: number;
  nowIso: string;
}): UserBalance {
  const nowMs = Date.parse(params.nowIso);
  const xpTotal = params.state?.xpTotal ?? 0;
  const derived = accountLevelFromXp(xpTotal);

  const energy = params.state
    ? applyEnergyRegen({
        energy: params.state.energy,
        energyCap: params.state.energyCap,
        regenUpdatedAtMs: Date.parse(params.state.energyRegenAt),
        nowMs
      }).energy
    : ENERGY_BASE_CAP;

  return {
    userId: params.userId,
    coins: params.coins,
    coinsPromo: params.coinsPromo,
    xp: xpTotal,
    xpIntoLevel: derived.xpIntoLevel,
    xpToNext: derived.xpToNextLevel ?? 0,
    accountLevel: derived.level,
    masteryStars: params.state?.masteryStars ?? 0,
    energy,
    energyCap: params.state?.energyCap ?? ENERGY_BASE_CAP,
    xpToday:
      params.state && params.state.xpDayUtc === utcDayKey(params.nowIso)
        ? params.state.xpDayAmount
        : 0,
    xpDailyCap: XP_DAILY_CAP,
    asOf: params.nowIso
  };
}

/**
 * Server-derived balance snapshot (SQLite). Energy includes passive regen
 * as of `nowIso`; Coins are summed from the ledger (promo subset included).
 */
export function deriveUserBalance(
  handle: DatabaseHandle,
  userId: string,
  nowIso: string
): UserBalance {
  const state = getEconomyState(handle, userId);
  const { coins, coinsPromo } = sumCoins(handle, userId);
  return buildUserBalance({
    userId,
    state,
    coins,
    coinsPromo,
    nowIso
  });
}
