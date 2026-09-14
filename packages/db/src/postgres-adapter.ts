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
  ScenarioRunRecord,
  ScenarioRunState
} from "./repository.js";
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
