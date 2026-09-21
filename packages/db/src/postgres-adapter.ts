import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import { Pool, type PoolClient } from "pg";

import {
  DecisionTraceSchema,
  HistoricalMarketSnapshotSchema,
  ScenarioPackageSchema,
  ScoreResultSchema,
  type DecisionTrace,
  type HistoricalMarketSnapshot,
  type ScenarioPackage,
  type ScoreResult
} from "../../contracts/src/index.js";
import { applyPostgresMigrations } from "./postgres-migrations.js";
import type {
  AuthSessionRecord,
  CreateAuthSessionInput,
  CreateScenarioRunInput,
  HistoricalSnapshotRecord,
  PlatformIdentityInput,
  ScenarioPackageSummary,
  ScenarioRunRecord,
  ScenarioRunState,
  ScenarioRunSummary
} from "./repository.js";
import type { LedgerEvent, UserBalance } from "../../contracts/src/economy.js";
import type { Purchase } from "../../contracts/src/catalog.js";
import type { ReferralRecord } from "./store.js";
import {
  applyEventToState,
  buildUserBalance,
  defaultEconomyState,
  type LedgerEventInput
} from "./ledger.js";
import type { PersistencePort } from "./ports.js";

type QueryRow = Record<string, unknown>;

type SqlQueryable = {
  query<T extends QueryRow = QueryRow>(
    text: string,
    values?: unknown[]
  ): Promise<{ rows: T[] }>;
};

export type PostgresPersistenceAdapterOptions = {
  connectionString?: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  pool?: Pool;
};

type ScenarioRunDbRow = {
  runId: string;
  userId: string;
  scenarioId: string;
  scenarioVersion: string;
  state: string;
  idempotencyKey: string;
  decisionJson: unknown;
  scoreJson: unknown;
  createdAt: unknown;
  sealedAt: unknown;
  revealedAt: unknown;
  completedAt: unknown;
};

function sql(executor: SqlQueryable | PoolClient): SqlQueryable {
  return executor as SqlQueryable;
}

async function queryRows<T extends QueryRow>(
  executor: SqlQueryable | PoolClient,
  text: string,
  values: readonly unknown[] = []
): Promise<T[]> {
  return (await sql(executor).query<T>(text, [...values])).rows;
}

function purchaseRowToPurchase(row: QueryRow | undefined): Purchase | undefined {
  if (!row) {
    return undefined;
  }
  return {
    purchaseId: String(row.purchase_id),
    userId: String(row.user_id),
    kind: String(row.kind) as Purchase["kind"],
    itemId: String(row.item_id),
    priceCoins: Number(row.price_coins),
    invoiceId: row.invoice_id === null ? undefined : String(row.invoice_id),
    state: String(row.state) as Purchase["state"],
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    refundedAt:
      row.refunded_at === null || row.refunded_at === undefined
        ? undefined
        : row.refunded_at instanceof Date
          ? row.refunded_at.toISOString()
          : String(row.refunded_at)
  };
}

function referralRowToRecord(row: QueryRow): ReferralRecord {
  return {
    code: String(row.code),
    inviterId: String(row.inviter_id),
    inviteeId: row.invitee_id === null ? null : String(row.invitee_id),
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    attributedAt:
      row.attributed_at === null
        ? null
        : row.attributed_at instanceof Date
          ? row.attributed_at.toISOString()
          : String(row.attributed_at),
    windowExpiresAt:
      row.window_expires_at === null
        ? null
        : row.window_expires_at instanceof Date
          ? row.window_expires_at.toISOString()
          : String(row.window_expires_at),
    activatedAt:
      row.activated_at === null
        ? null
        : row.activated_at instanceof Date
          ? row.activated_at.toISOString()
          : String(row.activated_at),
    inviteeValidScenarios: Number(row.invitee_valid_scenarios),
    purchaseBonusAt:
      row.purchase_bonus_at === null
        ? null
        : row.purchase_bonus_at instanceof Date
          ? row.purchase_bonus_at.toISOString()
          : String(row.purchase_bonus_at),
    state: String(row.state) as ReferralRecord["state"]
  };
}

function readEconomyStateRow(row: QueryRow): {
  xpTotal: number;
  accountLevel: number;
  xpDayUtc: string;
  xpDayAmount: number;
  masteryStars: number;
  energy: number;
  energyCap: number;
  energyRegenAt: string;
  updatedAt: string;
} {
  return {
    xpTotal: Number(row.xpTotal),
    accountLevel: Number(row.accountLevel),
    xpDayUtc: String(row.xpDayUtc),
    xpDayAmount: Number(row.xpDayAmount),
    masteryStars: Number(row.masteryStars),
    energy: Number(row.energy),
    energyCap: Number(row.energyCap),
    energyRegenAt:
      row.energyRegenAt instanceof Date
        ? row.energyRegenAt.toISOString()
        : String(row.energyRegenAt),
    updatedAt:
      row.updatedAt instanceof Date
        ? row.updatedAt.toISOString()
        : String(row.updatedAt)
  };
}

function parseJsonValue(value: unknown): unknown | null {
  if (value === null) {
    return null;
  }
  return typeof value === "string" ? JSON.parse(value) as unknown : value;
}

function readTimestamp(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  throw new Error("PostgreSQL returned an unsupported timestamp value");
}

function readRequiredTimestamp(value: unknown): string {
  const timestamp = readTimestamp(value);
  if (!timestamp) {
    throw new Error("PostgreSQL returned a missing required timestamp");
  }
  return timestamp;
}

function readScenarioRunRow(row: ScenarioRunDbRow): ScenarioRunRecord {
  const state = row.state as ScenarioRunState;
  if (!(["started", "sealed", "revealed", "completed"] as string[]).includes(state)) {
    throw new Error(`Unknown scenario run state: ${row.state}`);
  }

  return {
    runId: row.runId,
    userId: row.userId,
    scenarioId: row.scenarioId,
    scenarioVersion: row.scenarioVersion,
    state,
    idempotencyKey: row.idempotencyKey,
    decision: row.decisionJson === null
      ? null
      : DecisionTraceSchema.parse(parseJsonValue(row.decisionJson)),
    score: row.scoreJson === null
      ? null
      : ScoreResultSchema.parse(parseJsonValue(row.scoreJson)),
    createdAt: readRequiredTimestamp(row.createdAt),
    sealedAt: readTimestamp(row.sealedAt),
    revealedAt: readTimestamp(row.revealedAt),
    completedAt: readTimestamp(row.completedAt)
  };
}

const SCENARIO_RUN_SELECT = `
  SELECT
    run_id AS "runId",
    user_id AS "userId",
    scenario_id AS "scenarioId",
    scenario_version AS "scenarioVersion",
    state,
    idempotency_key AS "idempotencyKey",
    decision_json AS "decisionJson",
    score_json AS "scoreJson",
    created_at AS "createdAt",
    sealed_at AS "sealedAt",
    revealed_at AS "revealedAt",
    completed_at AS "completedAt"
  FROM scenario_runs
`;

export class PostgresPersistenceAdapter implements PersistencePort {
  public readonly pool: Pool;
  private readonly ownsPool: boolean;

  public constructor(options: PostgresPersistenceAdapterOptions) {
    if (options.pool) {
      this.pool = options.pool;
      this.ownsPool = false;
      return;
    }

    if (!options.connectionString) {
      throw new Error("PostgreSQL persistence requires DATABASE_URL");
    }

    this.pool = new Pool({
      connectionString: options.connectionString,
      ...(options.max === undefined ? {} : { max: options.max }),
      ...(options.idleTimeoutMillis === undefined ? {} : { idleTimeoutMillis: options.idleTimeoutMillis }),
      ...(options.connectionTimeoutMillis === undefined ? {} : { connectionTimeoutMillis: options.connectionTimeoutMillis })
    });
    this.ownsPool = true;
  }

  public async migrate(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await applyPostgresMigrations({
        query: async (text, parameters) => ({
          rows: await queryRows(client, text, parameters ?? [])
        })
      });
    } finally {
      client.release();
    }
  }

  public async checkReadiness(): Promise<void> {
    const rows = await queryRows<{ tableName: string | null }>(this.pool, `
      SELECT to_regclass('public.scenarios') AS "tableName";
    `);
    if (rows[0]?.tableName !== "scenarios") {
      throw new Error("PostgreSQL schema is not migrated");
    }
  }

  public async close(): Promise<void> {
    if (this.ownsPool) {
      await this.pool.end();
    }
  }

  public async getOrCreateUserForIdentity(
    input: PlatformIdentityInput
  ): Promise<{ userId: string; created: boolean }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN;");
      const existingIdentity = (await queryRows<{ userId: string }>(client, `
        SELECT user_id AS "userId"
        FROM user_identities
        WHERE provider = $1 AND provider_user_id = $2
      `, [input.provider, input.providerUserId]))[0];

      if (existingIdentity) {
        await client.query("COMMIT;");
        return { userId: existingIdentity.userId, created: false };
      }

      const externalId = `${input.provider}:${input.providerUserId}`;
      const candidateUserId = randomUUID();
      const createdAt = new Date().toISOString();
      const insertedUser = await queryRows<{ userId: string }>(client, `
        INSERT INTO users (user_id, external_id, created_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (external_id) DO NOTHING
        RETURNING user_id AS "userId"
      `, [candidateUserId, externalId, createdAt]);
      const persistedUser = insertedUser[0] ?? (await queryRows<{ userId: string }>(client, `
        SELECT user_id AS "userId"
        FROM users
        WHERE external_id = $1
      `, [externalId]))[0];

      if (!persistedUser) {
        throw new Error("User was not persisted");
      }

      await queryRows(client, `
        INSERT INTO user_identities (
          identity_id,
          user_id,
          provider,
          provider_user_id,
          created_at
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (provider, provider_user_id) DO NOTHING
      `, [randomUUID(), persistedUser.userId, input.provider, input.providerUserId, createdAt]);
      const identity = (await queryRows<{ userId: string }>(client, `
        SELECT user_id AS "userId"
        FROM user_identities
        WHERE provider = $1 AND provider_user_id = $2
      `, [input.provider, input.providerUserId]))[0];

      if (!identity) {
        throw new Error("User identity was not persisted");
      }

      await client.query("COMMIT;");
      return { userId: identity.userId, created: insertedUser.length === 1 };
    } catch (error) {
      await client.query("ROLLBACK;");
      throw error;
    } finally {
      client.release();
    }
  }

  public async consumeAuthReplayKey(
    replayKey: string,
    expiresAtMs: number,
    nowMs = Date.now()
  ): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN;");
      await queryRows(client, "DELETE FROM auth_replay_keys WHERE expires_at <= $1;", [
        new Date(nowMs).toISOString()
      ]);
      const inserted = await queryRows<{ replayKey: string }>(client, `
        INSERT INTO auth_replay_keys (replay_key, expires_at)
        VALUES ($1, $2)
        ON CONFLICT (replay_key) DO NOTHING
        RETURNING replay_key AS "replayKey"
      `, [replayKey, new Date(expiresAtMs).toISOString()]);
      await client.query("COMMIT;");
      return inserted.length === 1;
    } catch (error) {
      await client.query("ROLLBACK;");
      throw error;
    } finally {
      client.release();
    }
  }

  public async createAuthSession(input: CreateAuthSessionInput): Promise<AuthSessionRecord> {
    await queryRows(this.pool, `
      INSERT INTO auth_sessions (
        session_id,
        user_id,
        token_hash,
        created_at,
        expires_at
      ) VALUES ($1, $2, $3, $4, $5)
    `, [input.sessionId, input.userId, input.tokenHash, input.createdAt, input.expiresAt]);

    return { ...input, revokedAt: null };
  }

  public async getActiveAuthSession(
    tokenHash: string,
    now = new Date().toISOString()
  ): Promise<AuthSessionRecord | undefined> {
    const row = (await queryRows<{
      sessionId: string;
      userId: string;
      tokenHash: string;
      createdAt: unknown;
      expiresAt: unknown;
      revokedAt: unknown;
    }>(this.pool, `
      SELECT
        session_id AS "sessionId",
        user_id AS "userId",
        token_hash AS "tokenHash",
        created_at AS "createdAt",
        expires_at AS "expiresAt",
        revoked_at AS "revokedAt"
      FROM auth_sessions
      WHERE token_hash = $1
        AND revoked_at IS NULL
        AND expires_at > $2
    `, [tokenHash, now]))[0];
    return row
      ? {
        sessionId: row.sessionId,
        userId: row.userId,
        tokenHash: row.tokenHash,
        createdAt: readRequiredTimestamp(row.createdAt),
        expiresAt: readRequiredTimestamp(row.expiresAt),
        revokedAt: readTimestamp(row.revokedAt)
      }
      : undefined;
  }

  public async revokeAuthSession(
    sessionId: string,
    revokedAt = new Date().toISOString()
  ): Promise<boolean> {
    const rows = await queryRows<{ sessionId: string }>(this.pool, `
      UPDATE auth_sessions
      SET revoked_at = $1
      WHERE session_id = $2 AND revoked_at IS NULL
      RETURNING session_id AS "sessionId"
    `, [revokedAt, sessionId]);
    return rows.length === 1;
  }

  public async upsertHistoricalSnapshot(
    snapshot: HistoricalMarketSnapshot,
    snapshotId: string = randomUUID(),
    createdAt: string = new Date().toISOString()
  ): Promise<HistoricalSnapshotRecord> {
    const parsed = HistoricalMarketSnapshotSchema.parse(snapshot);
    await queryRows(this.pool, `
      INSERT INTO historical_snapshots (
        snapshot_id,
        provider,
        symbol,
        interval,
        as_of,
        content_hash,
        snapshot_json,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
      ON CONFLICT (content_hash) DO NOTHING
    `, [
      snapshotId,
      parsed.provider,
      parsed.symbol,
      parsed.interval,
      parsed.asOf,
      parsed.provenance.contentHash,
      JSON.stringify(parsed),
      createdAt
    ]);
    const row = (await queryRows<{
      snapshotId: string;
      provider: "binance";
      symbol: string;
      interval: string;
      asOf: unknown;
      contentHash: string;
      snapshotJson: unknown;
      createdAt: unknown;
    }>(this.pool, `
      SELECT
        snapshot_id AS "snapshotId",
        provider,
        symbol,
        interval,
        as_of AS "asOf",
        content_hash AS "contentHash",
        snapshot_json AS "snapshotJson",
        created_at AS "createdAt"
      FROM historical_snapshots
      WHERE content_hash = $1
    `, [parsed.provenance.contentHash]))[0];

    if (!row) {
      throw new Error(`Historical snapshot was not persisted: ${parsed.provenance.contentHash}`);
    }

    return {
      snapshotId: row.snapshotId,
      provider: row.provider,
      symbol: row.symbol,
      interval: row.interval,
      asOf: readRequiredTimestamp(row.asOf),
      contentHash: row.contentHash,
      snapshot: HistoricalMarketSnapshotSchema.parse(parseJsonValue(row.snapshotJson)),
      createdAt: readRequiredTimestamp(row.createdAt)
    };
  }

  public async getHistoricalSnapshot(
    snapshotId: string
  ): Promise<HistoricalSnapshotRecord | undefined> {
    const row = (await queryRows<{
      snapshotId: string;
      provider: "binance";
      symbol: string;
      interval: string;
      asOf: unknown;
      contentHash: string;
      snapshotJson: unknown;
      createdAt: unknown;
    }>(this.pool, `
      SELECT
        snapshot_id AS "snapshotId",
        provider,
        symbol,
        interval,
        as_of AS "asOf",
        content_hash AS "contentHash",
        snapshot_json AS "snapshotJson",
        created_at AS "createdAt"
      FROM historical_snapshots
      WHERE snapshot_id = $1
    `, [snapshotId]))[0];

    if (!row) {
      return undefined;
    }

    return {
      snapshotId: row.snapshotId,
      provider: row.provider,
      symbol: row.symbol,
      interval: row.interval,
      asOf: readRequiredTimestamp(row.asOf),
      contentHash: row.contentHash,
      snapshot: HistoricalMarketSnapshotSchema.parse(parseJsonValue(row.snapshotJson)),
      createdAt: readRequiredTimestamp(row.createdAt)
    };
  }

  public async getScenarioPackage(
    scenarioId: string,
    version: string
  ): Promise<ScenarioPackage | undefined> {
    const row = (await queryRows<{ packageJson: unknown }>(this.pool, `
      SELECT package_json AS "packageJson"
      FROM scenarios
      WHERE scenario_id = $1 AND version = $2
    `, [scenarioId, version]))[0];
    return row
      ? ScenarioPackageSchema.parse(parseJsonValue(row.packageJson))
      : undefined;
  }

  public async upsertScenarioPackage(
    package_: ScenarioPackage,
    nowIso?: string
  ): Promise<{ created: boolean }> {
    const now = nowIso ?? new Date().toISOString();
    const existing = (
      await queryRows(
        this.pool,
        "SELECT package_json FROM scenarios WHERE scenario_id = $1 AND version = $2",
        [package_.scenarioId, package_.version]
      )
    )[0];
    if (existing) {
      const stored = parseJsonValue(existing.package_json);
      if (isDeepStrictEqual(stored, package_)) {
        return { created: false };
      }
      throw new Error(
        `Scenario ${package_.scenarioId}@${package_.version} already exists with different content`
      );
    }
    await queryRows(
      this.pool,
      `INSERT INTO scenarios (
        scenario_id, version, scenario_level, mode, content_version, data_version,
        future_hash, package_json, review_status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $10)`,
      [
        package_.scenarioId,
        package_.version,
        package_.scenarioLevel,
        package_.mode,
        package_.contentVersion,
        package_.dataVersion,
        package_.futureHash,
        JSON.stringify(package_),
        package_.reviewStatus,
        now
      ]
    );
    return { created: true };
  }

  public async setScenarioReviewStatus(
    scenarioId: string,
    version: string,
    status: string,
    nowIso?: string
  ): Promise<boolean> {
    const now = nowIso ?? new Date().toISOString();
    const rows = await queryRows(
      this.pool,
      `UPDATE scenarios SET review_status = $3, updated_at = $4
       WHERE scenario_id = $1 AND version = $2
       RETURNING scenario_id`,
      [scenarioId, version, status, now]
    );
    return rows.length > 0;
  }

  public async listScenarioPackages(): Promise<ScenarioPackageSummary[]> {
    const rows = await queryRows<{ packageJson: unknown }>(this.pool, `
      SELECT package_json AS "packageJson"
      FROM scenarios
      WHERE review_status IN ('validated', 'published')
      ORDER BY scenario_id, version
    `);
    return rows.map((row) => {
      const package_ = ScenarioPackageSchema.parse(parseJsonValue(row.packageJson));
      return {
        scenarioId: package_.scenarioId,
        version: package_.version,
        mode: package_.mode,
        scenarioLevel: package_.scenarioLevel,
        assetClass: package_.assetClass,
        assetId: package_.assetId,
        marketSegment: package_.marketSegment,
        timeframe: package_.timeframe,
        decisionPointT0: package_.decisionPoint.t0
      };
    });
  }

  public async createScenarioRun(input: CreateScenarioRunInput): Promise<ScenarioRunRecord> {
    const createdAt = new Date().toISOString();
    await queryRows(this.pool, `
      INSERT INTO scenario_runs (
        run_id,
        user_id,
        scenario_id,
        scenario_version,
        state,
        idempotency_key,
        created_at
      ) VALUES ($1, $2, $3, $4, 'started', $5, $6)
      ON CONFLICT (idempotency_key) DO NOTHING
    `, [
      input.runId,
      input.userId,
      input.scenarioId,
      input.scenarioVersion,
      input.idempotencyKey,
      createdAt
    ]);

    const record = (await queryRows<ScenarioRunDbRow>(this.pool, `
      ${SCENARIO_RUN_SELECT}
      WHERE idempotency_key = $1
    `, [input.idempotencyKey]))[0];
    if (!record) {
      throw new Error(`Scenario run was not persisted: ${input.idempotencyKey}`);
    }

    const result = readScenarioRunRow(record);
    if (
      result.userId !== input.userId
      || result.scenarioId !== input.scenarioId
      || result.scenarioVersion !== input.scenarioVersion
    ) {
      throw new Error(`Idempotency key is bound to a different scenario run: ${input.idempotencyKey}`);
    }
    return result;
  }

  public async listScenarioRunsForUser(userId: string): Promise<ScenarioRunSummary[]> {
    const rows = await queryRows<{
      runId: string;
      scenarioId: string;
      scenarioVersion: string;
      state: string;
      scoreJson: unknown;
      createdAt: unknown;
      sealedAt: unknown;
    }>(this.pool, `
      SELECT
        run_id AS "runId",
        scenario_id AS "scenarioId",
        scenario_version AS "scenarioVersion",
        state,
        score_json AS "scoreJson",
        created_at AS "createdAt",
        sealed_at AS "sealedAt"
      FROM scenario_runs
      WHERE user_id = $1
      ORDER BY created_at DESC, run_id DESC
    `, [userId]);

    return rows.map((row) => ({
      runId: row.runId,
      scenarioId: row.scenarioId,
      scenarioVersion: row.scenarioVersion,
      state: row.state as ScenarioRunSummary["state"],
      score:
        row.scoreJson === null || row.scoreJson === undefined
          ? null
          : ScoreResultSchema.parse(parseJsonValue(row.scoreJson)).score,
      createdAt: readRequiredTimestamp(row.createdAt),
      sealedAt: readTimestamp(row.sealedAt)
    }));
  }

  public async getScenarioRun(
    runId: string,
    userId: string
  ): Promise<ScenarioRunRecord | undefined> {
    const row = (await queryRows<ScenarioRunDbRow>(this.pool, `
      ${SCENARIO_RUN_SELECT}
      WHERE run_id = $1 AND user_id = $2
    `, [runId, userId]))[0];
    return row ? readScenarioRunRow(row) : undefined;
  }

  public async sealScenarioRun(
    runId: string,
    userId: string,
    decision: DecisionTrace,
    score: ScoreResult
  ): Promise<ScenarioRunRecord> {
    const parsedDecision = DecisionTraceSchema.parse(decision);
    const parsedScore = ScoreResultSchema.parse(score);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN;");
      const currentRow = (await queryRows<ScenarioRunDbRow>(client, `
        ${SCENARIO_RUN_SELECT}
        WHERE run_id = $1 AND user_id = $2
        FOR UPDATE
      `, [runId, userId]))[0];
      if (!currentRow) {
        throw new Error(`Scenario run was not found: ${runId}`);
      }
      const current = readScenarioRunRow(currentRow);
      if (current.state !== "started") {
        if (current.decision && isDeepStrictEqual(current.decision, parsedDecision)) {
          await client.query("COMMIT;");
          return current;
        }
        throw new Error(`Scenario run is already sealed: ${runId}`);
      }

      const sealedAt = new Date().toISOString();
      await queryRows(client, `
        UPDATE scenario_runs
        SET state = 'sealed', decision_json = $1::jsonb, score_json = $2::jsonb, sealed_at = $3
        WHERE run_id = $4 AND user_id = $5 AND state = 'started'
      `, [JSON.stringify(parsedDecision), JSON.stringify(parsedScore), sealedAt, runId, userId]);
      const sealedRow = (await queryRows<ScenarioRunDbRow>(client, `
        ${SCENARIO_RUN_SELECT}
        WHERE run_id = $1 AND user_id = $2
      `, [runId, userId]))[0];
      if (!sealedRow) {
        throw new Error(`Scenario run disappeared while sealing: ${runId}`);
      }
      const sealed = readScenarioRunRow(sealedRow);
      if (!["sealed", "revealed", "completed"].includes(sealed.state)) {
        throw new Error(`Scenario run was not sealed: ${runId}`);
      }
      await client.query("COMMIT;");
      return sealed;
    } catch (error) {
      await client.query("ROLLBACK;");
      throw error;
    } finally {
      client.release();
    }
  }

  public async sumPromoCoinsInRange(
    userId: string,
    fromIso: string,
    toIso: string
  ): Promise<number> {
    const rows = await queryRows(
      this.pool,
      `SELECT COALESCE(SUM(amount) FILTER (WHERE risk_state = 'cleared'), 0) AS total
       FROM ledger_events
       WHERE user_id = $1 AND asset = 'coins' AND promo = TRUE AND amount > 0
         AND created_at >= $2 AND created_at < $3`,
      [userId, fromIso, toIso]
    );
    return Number(rows[0]?.total ?? 0);
  }

  public async createPurchase(input: {
    purchaseId: string;
    userId: string;
    kind: Purchase["kind"];
    itemId: string;
    priceCoins: number;
    invoiceId?: string | undefined;
    idempotencyKey: string;
    createdAt: string;
  }): Promise<Purchase> {
    await queryRows(
      this.pool,
      `INSERT INTO purchases (
        purchase_id, user_id, kind, item_id, price_coins, invoice_id,
        idempotency_key, state, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', $8)`,
      [
        input.purchaseId,
        input.userId,
        input.kind,
        input.itemId,
        input.priceCoins,
        input.invoiceId ?? null,
        input.idempotencyKey,
        input.createdAt
      ]
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

  public async getPurchaseByIdempotencyKey(
    idempotencyKey: string
  ): Promise<Purchase | undefined> {
    const rows = await queryRows(
      this.pool,
      "SELECT * FROM purchases WHERE idempotency_key = $1",
      [idempotencyKey]
    );
    return purchaseRowToPurchase(rows[0]);
  }

  public async getPurchaseByInvoice(invoiceId: string): Promise<Purchase | undefined> {
    const rows = await queryRows(
      this.pool,
      "SELECT * FROM purchases WHERE invoice_id = $1",
      [invoiceId]
    );
    return purchaseRowToPurchase(rows[0]);
  }

  public async getPurchase(
    purchaseId: string,
    userId: string
  ): Promise<Purchase | undefined> {
    const rows = await queryRows(
      this.pool,
      "SELECT * FROM purchases WHERE purchase_id = $1 AND user_id = $2",
      [purchaseId, userId]
    );
    return purchaseRowToPurchase(rows[0]);
  }

  public async markPurchaseRefunded(
    purchaseId: string,
    userId: string,
    refundedAt: string
  ): Promise<boolean> {
    const rows = await queryRows(
      this.pool,
      `UPDATE purchases SET state = 'refunded', refunded_at = $3
       WHERE purchase_id = $1 AND user_id = $2 AND state = 'completed'
       RETURNING purchase_id`,
      [purchaseId, userId, refundedAt]
    );
    return rows.length > 0;
  }

  public async reserveSupply(
    itemId: string,
    supplyLimit: number | undefined
  ): Promise<boolean> {
    if (supplyLimit === undefined) {
      return true;
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN;");
      await queryRows(
        client,
        `INSERT INTO supply_counters (item_id, supply_limit, reserved)
         VALUES ($1, $2, 0)
         ON CONFLICT (item_id) DO NOTHING`,
        [itemId, supplyLimit]
      );
      const result = await queryRows(
        client,
        `UPDATE supply_counters SET reserved = reserved + 1
         WHERE item_id = $1 AND reserved + 1 <= supply_limit
         RETURNING item_id`,
        [itemId]
      );
      await client.query("COMMIT;");
      return result.length > 0;
    } catch (error) {
      await client.query("ROLLBACK;");
      throw error;
    } finally {
      client.release();
    }
  }

  public async releaseSupply(itemId: string): Promise<void> {
    await queryRows(
      this.pool,
      `UPDATE supply_counters SET reserved = GREATEST(0, reserved - 1) WHERE item_id = $1`,
      [itemId]
    );
  }

  public async grantEntitlement(input: {
    userId: string;
    entitlementKey: string;
    sourcePurchaseId: string;
    createdAt: string;
  }): Promise<{ inserted: boolean; entitlementId: string }> {
    const entitlementId = randomUUID();
    const inserted = await queryRows(
      this.pool,
      `INSERT INTO user_entitlements (
        entitlement_id, user_id, entitlement_key, source_purchase_id, created_at
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (entitlement_key) DO NOTHING
      RETURNING entitlement_id`,
      [
        entitlementId,
        input.userId,
        input.entitlementKey,
        input.sourcePurchaseId,
        input.createdAt
      ]
    );
    if (inserted.length > 0) {
      return { inserted: true, entitlementId };
    }
    const existing = await queryRows(
      this.pool,
      "SELECT entitlement_id FROM user_entitlements WHERE entitlement_key = $1",
      [input.entitlementKey]
    );
    return { inserted: false, entitlementId: String(existing[0]?.entitlement_id ?? entitlementId) };
  }

  public async revokeEntitlement(
    userId: string,
    entitlementKey: string,
    revokedAt: string
  ): Promise<boolean> {
    const rows = await queryRows(
      this.pool,
      `UPDATE user_entitlements SET revoked_at = $3
       WHERE user_id = $1 AND entitlement_key = $2 AND revoked_at IS NULL
       RETURNING entitlement_id`,
      [userId, entitlementKey, revokedAt]
    );
    return rows.length > 0;
  }

  public async listActiveEntitlements(
    userId: string
  ): Promise<Array<{ entitlementKey: string; sourcePurchaseId: string; createdAt: string }>> {
    const rows = await queryRows(
      this.pool,
      `SELECT entitlement_key, source_purchase_id, created_at
       FROM user_entitlements
       WHERE user_id = $1 AND revoked_at IS NULL
       ORDER BY created_at DESC`,
      [userId]
    );
    return rows.map((row) => ({
      entitlementKey: String(row.entitlement_key),
      sourcePurchaseId: String(row.source_purchase_id),
      createdAt:
        row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
    }));
  }

  public async getOrCreateReferral(input: {
    inviterId: string;
    code?: string | undefined;
    createdAt: string;
  }): Promise<{ created: boolean; referral: ReferralRecord }> {
    if (input.code) {
      const byCode = (
        await queryRows(this.pool, "SELECT * FROM referrals WHERE code = $1", [input.code])
      )[0];
      if (byCode) {
        return { created: false, referral: referralRowToRecord(byCode) };
      }
    }
    const byInviter = (
      await queryRows(
        this.pool,
        "SELECT * FROM referrals WHERE inviter_id = $1 AND state != 'rejected' LIMIT 1",
        [input.inviterId]
      )
    )[0];
    if (byInviter) {
      return { created: false, referral: referralRowToRecord(byInviter) };
    }
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code: string | undefined;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      let candidate = "SA-";
      for (let i = 0; i < 6; i += 1) {
        candidate += alphabet[Math.floor(Math.random() * alphabet.length)];
      }
      const exists = (await queryRows(this.pool, "SELECT code FROM referrals WHERE code = $1", [candidate]))[0];
      if (!exists) {
        code = candidate;
        break;
      }
    }
    if (code === undefined) {
      throw new Error("Could not allocate a unique referral code");
    }
    await queryRows(
      this.pool,
      "INSERT INTO referrals (code, inviter_id, created_at, state) VALUES ($1, $2, $3, 'invited')",
      [code, input.inviterId, input.createdAt]
    );
    const created = (await queryRows(this.pool, "SELECT * FROM referrals WHERE code = $1", [code]))[0];
    if (!created) {
      throw new Error("Referral row disappeared after insert");
    }
    return { created: true, referral: referralRowToRecord(created) };
  }

  public async getReferralByCode(code: string): Promise<ReferralRecord | undefined> {
    const row = (await queryRows(this.pool, "SELECT * FROM referrals WHERE code = $1", [code]))[0];
    return row ? referralRowToRecord(row) : undefined;
  }

  public async findReferralByInvitee(inviteeId: string): Promise<ReferralRecord | undefined> {
    const row = (
      await queryRows(
        this.pool,
        `SELECT * FROM referrals
         WHERE invitee_id = $1 AND state IN ('attributed', 'activated')
         ORDER BY attributed_at DESC
         LIMIT 1`,
        [inviteeId]
      )
    )[0];
    return row ? referralRowToRecord(row) : undefined;
  }

  public async attributeReferral(input: {
    code: string;
    inviteeId: string;
    attributedAt: string;
    windowExpiresAt: string;
  }): Promise<boolean> {
    const rows = await queryRows(
      this.pool,
      `UPDATE referrals SET
        invitee_id = $1, attributed_at = $2, window_expires_at = $3, state = 'attributed'
       WHERE code = $4 AND state = 'invited' AND invitee_id IS NULL
       RETURNING code`,
      [input.inviteeId, input.attributedAt, input.windowExpiresAt, input.code]
    );
    return rows.length > 0;
  }

  public async countValidScenarios(userId: string): Promise<number> {
    const rows = await queryRows(
      this.pool,
      `SELECT COUNT(*) AS count FROM scenario_runs
       WHERE user_id = $1 AND state IN ('sealed', 'revealed', 'completed')`,
      [userId]
    );
    return Number(rows[0]?.count ?? 0);
  }

  public async setReferralScenarioCount(
    code: string,
    inviteeValidScenarios: number
  ): Promise<void> {
    await queryRows(this.pool, "UPDATE referrals SET invitee_valid_scenarios = $1 WHERE code = $2", [
      inviteeValidScenarios,
      code
    ]);
  }

  public async activateReferral(code: string, activatedAt: string): Promise<boolean> {
    const rows = await queryRows(
      this.pool,
      `UPDATE referrals SET state = 'activated', activated_at = $2
       WHERE code = $1 AND state = 'attributed'
       RETURNING code`,
      [code, activatedAt]
    );
    return rows.length > 0;
  }

  public async grantReferralPurchaseBonus(
    code: string,
    bonusAt: string
  ): Promise<boolean> {
    const rows = await queryRows(
      this.pool,
      `UPDATE referrals SET purchase_bonus_at = $2
       WHERE code = $1 AND state = 'activated' AND purchase_bonus_at IS NULL
       RETURNING code`,
      [code, bonusAt]
    );
    return rows.length > 0;
  }

  public async recordLedgerEvent(
    input: LedgerEventInput
  ): Promise<{ inserted: boolean; event: LedgerEvent }> {
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

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN;");
      const existing = (
        await queryRows(
          client,
          "SELECT event_id FROM ledger_events WHERE idempotency_key = $1",
          [input.idempotencyKey]
        )
      )[0];
      if (existing) {
        await client.query("COMMIT;");
        return {
          inserted: false,
          event: { ...event, eventId: String(existing.event_id) }
        };
      }

      await queryRows(
        client,
        `INSERT INTO ledger_events (
          event_id, user_id, asset, amount, reason, source_id, scenario_id,
          idempotency_key, promo, risk_state, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`
      , [
          event.eventId,
          event.userId,
          event.asset,
          event.amount,
          event.reason,
          event.sourceId ?? null,
          event.scenarioId ?? null,
          event.idempotencyKey,
          event.promo,
          event.riskState,
          event.createdAt
        ]);

      const stateRow = (
        await queryRows(client, `
          SELECT
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
          WHERE user_id = $1
          FOR UPDATE
        `, [input.userId])
      )[0];

      const state = stateRow
        ? readEconomyStateRow(stateRow)
        : defaultEconomyState(input.userId, nowIso);
      const next = applyEventToState(state, input, nowIso);

      if (stateRow) {
        await queryRows(
          client,
          `UPDATE user_economy_state SET
            xp_total = $1, account_level = $2, xp_day_utc = $3, xp_day_amount = $4,
            mastery_stars = $5, energy = $6, energy_cap = $7, energy_regen_at = $8,
            updated_at = $9
          WHERE user_id = $10`,
          [
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
          ]
        );
      } else {
        await queryRows(
          client,
          `INSERT INTO user_economy_state (
            user_id, xp_total, account_level, xp_day_utc, xp_day_amount,
            mastery_stars, energy, energy_cap, energy_regen_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`
        , [
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
          ]);
      }

      await client.query("COMMIT;");
      return { inserted: true, event };
    } catch (error) {
      await client.query("ROLLBACK;");
      throw error;
    } finally {
      client.release();
    }
  }

  public async listLedgerEvents(
    userId: string,
    limit = 50
  ): Promise<LedgerEvent[]> {
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 500);
    const rows = await queryRows(
      this.pool,
      `SELECT * FROM ledger_events WHERE user_id = $1
       ORDER BY created_at DESC, event_id DESC
       LIMIT $2`,
      [userId, safeLimit]
    );
    return rows.map((row) => ({
      eventId: String(row.event_id),
      userId: String(row.user_id),
      asset: String(row.asset) as LedgerEvent["asset"],
      amount: Number(row.amount),
      reason: String(row.reason) as LedgerEvent["reason"],
      sourceId: row.source_id === null ? undefined : String(row.source_id),
      scenarioId: row.scenario_id === null ? undefined : String(row.scenario_id),
      idempotencyKey: String(row.idempotency_key),
      promo: Boolean(row.promo),
      riskState: String(row.risk_state) as LedgerEvent["riskState"],
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
    }));
  }

  public async deriveUserBalance(
    userId: string,
    nowIso?: string
  ): Promise<UserBalance> {
    const stamped = nowIso ?? new Date().toISOString();
    const stateRows = await queryRows(
      this.pool,
      `
      SELECT
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
      WHERE user_id = $1
    `,
      [userId]
    );
    const coinsRows = await queryRows(
      this.pool,
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE risk_state = 'cleared'), 0) AS total,
         COALESCE(SUM(amount) FILTER (WHERE promo = 1 AND risk_state = 'cleared'), 0) AS promoTotal
       FROM ledger_events
       WHERE user_id = $1 AND asset = 'coins'`
    , [userId]);

    const stateRow = stateRows[0];
    const state = stateRow
      ? {
          userId,
          ...readEconomyStateRow(stateRow),
          energyRegenAt:
            stateRow.energyRegenAt instanceof Date
              ? stateRow.energyRegenAt.toISOString()
              : String(stateRow.energyRegenAt)
        }
      : undefined;
    const total = Number(coinsRows[0]?.total ?? 0);
    const coins = total < 0 ? 0 : total;
    const coinsPromo = Math.max(0, Number(coinsRows[0]?.promoTotal ?? 0));

    return buildUserBalance({ userId, state, coins, coinsPromo, nowIso: stamped });
  }

  public async revealScenarioRun(
    runId: string,
    userId: string
  ): Promise<ScenarioRunRecord> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN;");
      const currentRow = (await queryRows<ScenarioRunDbRow>(client, `
        ${SCENARIO_RUN_SELECT}
        WHERE run_id = $1 AND user_id = $2
        FOR UPDATE
      `, [runId, userId]))[0];
      if (!currentRow) {
        throw new Error(`Scenario run was not found: ${runId}`);
      }
      const current = readScenarioRunRow(currentRow);
      if (current.state === "started") {
        throw new Error(`Scenario run must be sealed before reveal: ${runId}`);
      }
      if (current.state === "revealed" || current.state === "completed") {
        await client.query("COMMIT;");
        return current;
      }

      const revealedAt = new Date().toISOString();
      await queryRows(client, `
        UPDATE scenario_runs
        SET state = 'revealed', revealed_at = $1
        WHERE run_id = $2 AND user_id = $3 AND state = 'sealed'
      `, [revealedAt, runId, userId]);
      const revealedRow = (await queryRows<ScenarioRunDbRow>(client, `
        ${SCENARIO_RUN_SELECT}
        WHERE run_id = $1 AND user_id = $2
      `, [runId, userId]))[0];
      if (!revealedRow) {
        throw new Error(`Scenario run was not revealed: ${runId}`);
      }
      const revealed = readScenarioRunRow(revealedRow);
      if (revealed.state !== "revealed" && revealed.state !== "completed") {
        throw new Error(`Scenario run was not revealed: ${runId}`);
      }
      await client.query("COMMIT;");
      return revealed;
    } catch (error) {
      await client.query("ROLLBACK;");
      throw error;
    } finally {
      client.release();
    }
  }
}
