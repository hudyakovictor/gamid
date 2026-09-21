import { randomUUID } from "node:crypto";

import type { Purchase } from "../../contracts/src/catalog.js";
import type { DatabaseHandle } from "./database.js";

/**
 * Catalog, purchases, entitlements and referrals storage (P1-7b).
 *
 * Invariants:
 * - purchases are idempotent by idempotency_key and by invoice (a Coin Pack
 *   payment can only ever credit once);
 * - supply reservation is atomic (UPDATE ... WHERE reserved + 1 <= limit);
 * - entitlements are unique per user by entitlement_key and revocable on
 *   refund (only the source purchase can revoke them).
 */

export type PurchaseRecord = Purchase;

export type GrantEntitlementInput = {
  userId: string;
  entitlementKey: string;
  sourcePurchaseId: string;
  createdAt: string;
};

export function createPurchase(
  { sqlite }: DatabaseHandle,
  input: {
    purchaseId: string;
    userId: string;
    kind: Purchase["kind"];
    itemId: string;
    priceCoins: number;
    invoiceId?: string | undefined;
    idempotencyKey: string;
    createdAt: string;
  }
): PurchaseRecord {
  sqlite
    .prepare(
      `INSERT INTO purchases (
        purchase_id, user_id, kind, item_id, price_coins, invoice_id,
        idempotency_key, state, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?)`
    )
    .run(
      input.purchaseId,
      input.userId,
      input.kind,
      input.itemId,
      input.priceCoins,
      input.invoiceId ?? null,
      input.idempotencyKey,
      input.createdAt
    );
  return {
    purchaseId: input.purchaseId,
    userId: input.userId,
    kind: input.kind,
    itemId: input.itemId,
    priceCoins: input.priceCoins,
    invoiceId: input.invoiceId,
    state: "completed",
    createdAt: input.createdAt
  };
}

export function getPurchaseByIdempotencyKey(
  { sqlite }: DatabaseHandle,
  idempotencyKey: string
): PurchaseRecord | undefined {
  return purchaseRowToRecord(
    sqlite
      .prepare("SELECT * FROM purchases WHERE idempotency_key = ?")
      .get(idempotencyKey) as PurchaseRow | undefined
  );
}

export function getPurchaseByInvoice(
  { sqlite }: DatabaseHandle,
  invoiceId: string
): PurchaseRecord | undefined {
  return purchaseRowToRecord(
    sqlite
      .prepare("SELECT * FROM purchases WHERE invoice_id = ?")
      .get(invoiceId) as PurchaseRow | undefined
  );
}

export function getPurchase(
  { sqlite }: DatabaseHandle,
  purchaseId: string,
  userId: string
): PurchaseRecord | undefined {
  return purchaseRowToRecord(
    sqlite
      .prepare("SELECT * FROM purchases WHERE purchase_id = ? AND user_id = ?")
      .get(purchaseId, userId) as PurchaseRow | undefined
  );
}

export function markPurchaseRefunded(
  { sqlite }: DatabaseHandle,
  purchaseId: string,
  userId: string,
  refundedAt: string
): boolean {
  const result = sqlite
    .prepare(
      `UPDATE purchases SET state = 'refunded', refunded_at = ?
       WHERE purchase_id = ? AND user_id = ? AND state = 'completed'`
    )
    .run(refundedAt, purchaseId, userId);
  return result.changes > 0;
}

type PurchaseRow = {
  purchase_id: string;
  user_id: string;
  kind: "coin_pack" | "service" | "sku";
  item_id: string;
  price_coins: number;
  invoice_id: string | null;
  state: "completed" | "refunded";
  created_at: string;
  refunded_at: string | null;
};

function purchaseRowToRecord(row: PurchaseRow | undefined): PurchaseRecord | undefined {
  if (!row) {
    return undefined;
  }
  return {
    purchaseId: row.purchase_id,
    userId: row.user_id,
    kind: row.kind,
    itemId: row.item_id,
    priceCoins: row.price_coins,
    invoiceId: row.invoice_id ?? undefined,
    state: row.state,
    createdAt: row.created_at,
    refundedAt: row.refunded_at ?? undefined
  };
}

/**
 * Atomically reserve one unit of limited supply. Returns false when the
 * limit is exhausted (or the item has no configured supply).
 */
export function reserveSupply(
  { sqlite }: DatabaseHandle,
  itemId: string,
  supplyLimit: number | undefined
): boolean {
  if (supplyLimit === undefined) {
    return true;
  }
  const ensureRow = sqlite
    .prepare(
      `INSERT INTO supply_counters (item_id, supply_limit, reserved)
       VALUES (?, ?, 0)
       ON CONFLICT (item_id) DO UPDATE SET supply_limit = supply_limit`
    )
    .run(itemId, supplyLimit);
  void ensureRow;
  const result = sqlite
    .prepare(
      `UPDATE supply_counters SET reserved = reserved + 1
       WHERE item_id = ? AND reserved + 1 <= supply_limit`
    )
    .run(itemId);
  return result.changes > 0;
}

export function releaseSupply(
  { sqlite }: DatabaseHandle,
  itemId: string
): void {
  sqlite
    .prepare(
      `UPDATE supply_counters SET reserved = MAX(0, reserved - 1) WHERE item_id = ?`
    )
    .run(itemId);
}

export function grantEntitlement(
  { sqlite }: DatabaseHandle,
  input: GrantEntitlementInput
): { inserted: boolean; entitlementId: string } {
  const entitlementId = randomUUID();
  const result = sqlite
    .prepare(
      `INSERT INTO user_entitlements (
        entitlement_id, user_id, entitlement_key, source_purchase_id, created_at
      ) VALUES (?, ?, ?, ?, ?)`
    )
    .run(entitlementId, input.userId, input.entitlementKey, input.sourcePurchaseId, input.createdAt);

  if (result.changes === 0) {
    const existing = sqlite
      .prepare("SELECT entitlement_id FROM user_entitlements WHERE entitlement_key = ?")
      .get(input.entitlementKey) as { entitlement_id: string } | undefined;
    if (existing) {
      return { inserted: false, entitlementId: existing.entitlement_id };
    }
  }
  return { inserted: true, entitlementId };
}

export function revokeEntitlement(
  { sqlite }: DatabaseHandle,
  userId: string,
  entitlementKey: string,
  revokedAt: string
): boolean {
  const result = sqlite
    .prepare(
      `UPDATE user_entitlements SET revoked_at = ?
       WHERE user_id = ? AND entitlement_key = ? AND revoked_at IS NULL`
    )
    .run(revokedAt, userId, entitlementKey);
  return result.changes > 0;
}

export function listActiveEntitlements(
  { sqlite }: DatabaseHandle,
  userId: string
): Array<{ entitlementKey: string; sourcePurchaseId: string; createdAt: string }> {
  const rows = sqlite
    .prepare(
      `SELECT entitlement_key, source_purchase_id, created_at
       FROM user_entitlements
       WHERE user_id = ? AND revoked_at IS NULL
       ORDER BY created_at DESC`
    )
    .all(userId) as Array<{
    entitlement_key: string;
    source_purchase_id: string;
    created_at: string;
  }>;
  return rows.map((row) => ({
    entitlementKey: row.entitlement_key,
    sourcePurchaseId: row.source_purchase_id,
    createdAt: row.created_at
  }));
}

/* ------------------------------------------------------------------ */
/* Referrals                                                           */
/* ------------------------------------------------------------------ */

export type ReferralRecord = {
  code: string;
  inviterId: string;
  inviteeId: string | null;
  createdAt: string;
  attributedAt: string | null;
  windowExpiresAt: string | null;
  activatedAt: string | null;
  inviteeValidScenarios: number;
  purchaseBonusAt: string | null;
  state: "invited" | "attributed" | "activated" | "expired" | "rejected";
};

type ReferralRow = {
  code: string;
  inviter_id: string;
  invitee_id: string | null;
  created_at: string;
  attributed_at: string | null;
  window_expires_at: string | null;
  activated_at: string | null;
  invitee_valid_scenarios: number;
  purchase_bonus_at: string | null;
  state: "invited" | "attributed" | "activated" | "expired" | "rejected";
};

function referralRowToRecord(row: ReferralRow | undefined): ReferralRecord | undefined {
  if (!row) {
    return undefined;
  }
  return {
    code: row.code,
    inviterId: row.inviter_id,
    inviteeId: row.invitee_id,
    createdAt: row.created_at,
    attributedAt: row.attributed_at,
    windowExpiresAt: row.window_expires_at,
    activatedAt: row.activated_at,
    inviteeValidScenarios: row.invitee_valid_scenarios,
    purchaseBonusAt: row.purchase_bonus_at,
    state: row.state
  };
}

export function getOrCreateReferral(
  { sqlite }: DatabaseHandle,
  input: { inviterId: string; code?: string | undefined; createdAt: string }
): { created: boolean; referral: ReferralRecord } {
  if (input.code) {
    const existing = sqlite
      .prepare("SELECT * FROM referrals WHERE code = ?")
      .get(input.code) as ReferralRow | undefined;
    if (existing) {
      return { created: false, referral: referralRowToRecord(existing) as ReferralRecord };
    }
  }

  const existingByInviter = sqlite
    .prepare("SELECT * FROM referrals WHERE inviter_id = ? AND state != 'rejected' LIMIT 1")
    .get(input.inviterId) as ReferralRow | undefined;
  if (existingByInviter) {
    return { created: false, referral: referralRowToRecord(existingByInviter) as ReferralRecord };
  }

  const code = input.code ?? generateReferralCode(sqlite);
  sqlite
    .prepare(
      `INSERT INTO referrals (code, inviter_id, created_at, state) VALUES (?, ?, ?, 'invited')`
    )
    .run(code, input.inviterId, input.createdAt);
  const created = sqlite
    .prepare("SELECT * FROM referrals WHERE code = ?")
    .get(code) as ReferralRow;
  return { created: true, referral: referralRowToRecord(created) as ReferralRecord };
}

export function getReferralByCode(
  { sqlite }: DatabaseHandle,
  code: string
): ReferralRecord | undefined {
  return referralRowToRecord(
    sqlite.prepare("SELECT * FROM referrals WHERE code = ?").get(code) as ReferralRow | undefined
  );
}

export function findReferralByInvitee(
  { sqlite }: DatabaseHandle,
  inviteeId: string
): ReferralRecord | undefined {
  return referralRowToRecord(
    sqlite
      .prepare(
        `SELECT * FROM referrals
         WHERE invitee_id = ? AND state IN ('attributed', 'activated')
         ORDER BY attributed_at DESC
         LIMIT 1`
      )
      .get(inviteeId) as ReferralRow | undefined
  );
}

export function attributeReferral(
  { sqlite }: DatabaseHandle,
  input: { code: string; inviteeId: string; attributedAt: string; windowExpiresAt: string }
): boolean {
  const result = sqlite
    .prepare(
      `UPDATE referrals SET
        invitee_id = ?, attributed_at = ?, window_expires_at = ?, state = 'attributed'
       WHERE code = ? AND state = 'invited' AND invitee_id IS NULL`
    )
    .run(input.inviteeId, input.attributedAt, input.windowExpiresAt, input.code);
  return result.changes > 0;
}

export function countValidScenarios(
  { sqlite }: DatabaseHandle,
  userId: string
): number {
  const row = sqlite
    .prepare(
      `SELECT COUNT(*) AS count FROM scenario_runs
       WHERE user_id = ? AND state IN ('sealed', 'revealed', 'completed')`
    )
    .get(userId) as { count: number };
  return row.count;
}

export function setReferralScenarioCount(
  { sqlite }: DatabaseHandle,
  code: string,
  inviteeValidScenarios: number
): void {
  sqlite
    .prepare("UPDATE referrals SET invitee_valid_scenarios = ? WHERE code = ?")
    .run(inviteeValidScenarios, code);
}

export function activateReferral(
  { sqlite }: DatabaseHandle,
  code: string,
  activatedAt: string
): boolean {
  const result = sqlite
    .prepare(
      `UPDATE referrals SET state = 'activated', activated_at = ?
       WHERE code = ? AND state = 'attributed'`
    )
    .run(activatedAt, code);
  return result.changes > 0;
}

export function grantReferralPurchaseBonus(
  { sqlite }: DatabaseHandle,
  code: string,
  bonusAt: string
): boolean {
  const result = sqlite
    .prepare(
      `UPDATE referrals SET state = 'activated', purchase_bonus_at = ?
       WHERE code = ? AND state = 'activated' AND purchase_bonus_at IS NULL`
    )
    .run(bonusAt, code);
  return result.changes > 0;
}

export function generateReferralCode(sqlite: DatabaseHandle["sqlite"]): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    let code = "SA-";
    for (let i = 0; i < 6; i += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    const exists = sqlite.prepare("SELECT code FROM referrals WHERE code = ?").get(code);
    if (!exists) {
      return code;
    }
  }
  throw new Error("Could not allocate a unique referral code");
}
