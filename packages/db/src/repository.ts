import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

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
import type { DatabaseHandle } from "./database.js";

export type ScenarioRunState = "started" | "sealed" | "revealed" | "completed";

export type HistoricalSnapshotRecord = {
  snapshotId: string;
  provider: "binance";
  symbol: string;
  interval: string;
  asOf: string;
  contentHash: string;
  snapshot: HistoricalMarketSnapshot;
  createdAt: string;
};

export type CreateScenarioRunInput = {
  runId: string;
  userId: string;
  scenarioId: string;
  scenarioVersion: string;
  idempotencyKey: string;
};

export type PlatformProvider = "telegram" | "base" | "minipay" | "solana";

export type PlatformIdentityInput = {
  provider: PlatformProvider;
  providerUserId: string;
};

export type CreateAuthSessionInput = {
  sessionId: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
};

export type AuthSessionRecord = CreateAuthSessionInput & {
  revokedAt: string | null;
};

export type ScenarioRunRecord = CreateScenarioRunInput & {
  state: ScenarioRunState;
  decision: DecisionTrace | null;
  score: ScoreResult | null;
  createdAt: string;
  sealedAt: string | null;
  revealedAt: string | null;
  completedAt: string | null;
};

function parseJson(value: string | null): unknown | null {
  return value === null ? null : JSON.parse(value) as unknown;
}

function readScenarioRunRow(row: {
  runId: string;
  userId: string;
  scenarioId: string;
  scenarioVersion: string;
  state: ScenarioRunState;
  idempotencyKey: string;
  decisionJson: string | null;
  scoreJson: string | null;
  createdAt: string;
  sealedAt: string | null;
  revealedAt: string | null;
  completedAt: string | null;
}): ScenarioRunRecord {
  return {
    runId: row.runId,
    userId: row.userId,
    scenarioId: row.scenarioId,
    scenarioVersion: row.scenarioVersion,
    state: row.state,
    idempotencyKey: row.idempotencyKey,
    decision: row.decisionJson === null
      ? null
      : DecisionTraceSchema.parse(parseJson(row.decisionJson)),
    score: row.scoreJson === null
      ? null
      : ScoreResultSchema.parse(parseJson(row.scoreJson)),
    createdAt: row.createdAt,
    sealedAt: row.sealedAt,
    revealedAt: row.revealedAt,
    completedAt: row.completedAt
  };
}

export function getOrCreateUserForIdentity(
  { sqlite }: DatabaseHandle,
  input: PlatformIdentityInput
): { userId: string; created: boolean } {
  const transaction = sqlite.transaction(() => {
    const existingIdentity = sqlite.prepare(`
      SELECT user_id AS userId
      FROM user_identities
      WHERE provider = ? AND provider_user_id = ?
    `).get(input.provider, input.providerUserId) as { userId: string } | undefined;

    if (existingIdentity) {
      return { userId: existingIdentity.userId, created: false };
    }

    const externalId = `${input.provider}:${input.providerUserId}`;
    const existingUser = sqlite.prepare(`
      SELECT user_id AS userId
      FROM users
      WHERE external_id = ?
    `).get(externalId) as { userId: string } | undefined;
    const userId = existingUser?.userId ?? randomUUID();
    const createdAt = new Date().toISOString();

    sqlite.prepare(`
      INSERT INTO users (user_id, external_id, created_at)
      VALUES (?, ?, ?)
      ON CONFLICT(external_id) DO NOTHING
    `).run(userId, externalId, createdAt);

    sqlite.prepare(`
      INSERT INTO user_identities (
        identity_id,
        user_id,
        provider,
        provider_user_id,
        created_at
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(provider, provider_user_id) DO NOTHING
    `).run(randomUUID(), userId, input.provider, input.providerUserId, createdAt);

    const identity = sqlite.prepare(`
      SELECT user_id AS userId
      FROM user_identities
      WHERE provider = ? AND provider_user_id = ?
    `).get(input.provider, input.providerUserId) as { userId: string } | undefined;

    if (!identity) {
      throw new Error("User identity was not persisted");
    }

    return { userId: identity.userId, created: !existingUser };
  });

  return transaction();
}

export function consumeAuthReplayKey(
  { sqlite }: DatabaseHandle,
  replayKey: string,
  expiresAtMs: number,
  nowMs = Date.now()
): boolean {
  const now = new Date(nowMs).toISOString();
  const expiresAt = new Date(expiresAtMs).toISOString();
  const transaction = sqlite.transaction(() => {
    sqlite.prepare("DELETE FROM auth_replay_keys WHERE expires_at <= ?").run(now);
    return sqlite.prepare(`
      INSERT INTO auth_replay_keys (replay_key, expires_at)
      VALUES (?, ?)
      ON CONFLICT(replay_key) DO NOTHING
    `).run(replayKey, expiresAt).changes === 1;
  });

  return transaction();
}

export function createAuthSession(
  { sqlite }: DatabaseHandle,
  input: CreateAuthSessionInput
): AuthSessionRecord {
  sqlite.prepare(`
    INSERT INTO auth_sessions (
      session_id,
      user_id,
      token_hash,
      created_at,
      expires_at
    ) VALUES (?, ?, ?, ?, ?)
  `).run(
    input.sessionId,
    input.userId,
    input.tokenHash,
    input.createdAt,
    input.expiresAt
  );

  return {
    ...input,
    revokedAt: null
  };
}

export function getActiveAuthSession(
  { sqlite }: DatabaseHandle,
  tokenHash: string,
  now = new Date().toISOString()
): AuthSessionRecord | undefined {
  const row = sqlite.prepare(`
    SELECT
      session_id AS sessionId,
      user_id AS userId,
      token_hash AS tokenHash,
      created_at AS createdAt,
      expires_at AS expiresAt,
      revoked_at AS revokedAt
    FROM auth_sessions
    WHERE token_hash = ?
      AND revoked_at IS NULL
      AND expires_at > ?
  `).get(tokenHash, now) as AuthSessionRecord | undefined;

  return row;
}

export function revokeAuthSession(
  { sqlite }: DatabaseHandle,
  sessionId: string,
  revokedAt = new Date().toISOString()
): boolean {
  return sqlite.prepare(`
    UPDATE auth_sessions
    SET revoked_at = ?
    WHERE session_id = ? AND revoked_at IS NULL
  `).run(revokedAt, sessionId).changes === 1;
}

export function upsertHistoricalSnapshot(
  { sqlite }: DatabaseHandle,
  snapshot: HistoricalMarketSnapshot,
  snapshotId: string = randomUUID(),
  createdAt: string = new Date().toISOString()
): HistoricalSnapshotRecord {
  const parsed = HistoricalMarketSnapshotSchema.parse(snapshot);
  sqlite.prepare(`
    INSERT INTO historical_snapshots (
      snapshot_id,
      provider,
      symbol,
      interval,
      as_of,
      content_hash,
      snapshot_json,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(content_hash) DO NOTHING
  `).run(
    snapshotId,
    parsed.provider,
    parsed.symbol,
    parsed.interval,
    parsed.asOf,
    parsed.provenance.contentHash,
    JSON.stringify(parsed),
    createdAt
  );

  const row = sqlite.prepare(`
    SELECT
      snapshot_id AS snapshotId,
      provider,
      symbol,
      interval,
      as_of AS asOf,
      content_hash AS contentHash,
      snapshot_json AS snapshotJson,
      created_at AS createdAt
    FROM historical_snapshots
    WHERE content_hash = ?
  `).get(parsed.provenance.contentHash) as {
    snapshotId: string;
    provider: "binance";
    symbol: string;
    interval: string;
    asOf: string;
    contentHash: string;
    snapshotJson: string;
    createdAt: string;
  } | undefined;

  if (!row) {
    throw new Error(`Historical snapshot was not persisted: ${parsed.provenance.contentHash}`);
  }

  return {
    snapshotId: row.snapshotId,
    provider: row.provider,
    symbol: row.symbol,
    interval: row.interval,
    asOf: row.asOf,
    contentHash: row.contentHash,
    snapshot: HistoricalMarketSnapshotSchema.parse(JSON.parse(row.snapshotJson) as unknown),
    createdAt: row.createdAt
  };
}

export function getHistoricalSnapshot(
  { sqlite }: DatabaseHandle,
  snapshotId: string
): HistoricalSnapshotRecord | undefined {
  const row = sqlite.prepare(`
    SELECT
      snapshot_id AS snapshotId,
      provider,
      symbol,
      interval,
      as_of AS asOf,
      content_hash AS contentHash,
      snapshot_json AS snapshotJson,
      created_at AS createdAt
    FROM historical_snapshots
    WHERE snapshot_id = ?
  `).get(snapshotId) as {
    snapshotId: string;
    provider: "binance";
    symbol: string;
    interval: string;
    asOf: string;
    contentHash: string;
    snapshotJson: string;
    createdAt: string;
  } | undefined;

  if (!row) {
    return undefined;
  }

  return {
    snapshotId: row.snapshotId,
    provider: row.provider,
    symbol: row.symbol,
    interval: row.interval,
    asOf: row.asOf,
    contentHash: row.contentHash,
    snapshot: HistoricalMarketSnapshotSchema.parse(JSON.parse(row.snapshotJson) as unknown),
    createdAt: row.createdAt
  };
}

export function getScenarioPackage(
  { sqlite }: DatabaseHandle,
  scenarioId: string,
  version: string
): ScenarioPackage | undefined {
  const record = sqlite.prepare(`
    SELECT package_json AS packageJson
    FROM scenarios
    WHERE scenario_id = ? AND version = ?
  `).get(scenarioId, version) as { packageJson: string } | undefined;

  if (!record) {
    return undefined;
  }

  return ScenarioPackageSchema.parse(JSON.parse(record.packageJson) as unknown);
}

export function getScenarioRun(
  { sqlite }: DatabaseHandle,
  runId: string,
  userId: string
): ScenarioRunRecord | undefined {
  const row = sqlite.prepare(`
    SELECT
      run_id AS runId,
      user_id AS userId,
      scenario_id AS scenarioId,
      scenario_version AS scenarioVersion,
      state,
      idempotency_key AS idempotencyKey,
      decision_json AS decisionJson,
      score_json AS scoreJson,
      created_at AS createdAt,
      sealed_at AS sealedAt,
      revealed_at AS revealedAt,
      completed_at AS completedAt
    FROM scenario_runs
    WHERE run_id = ? AND user_id = ?
  `).get(runId, userId) as {
    runId: string;
    userId: string;
    scenarioId: string;
    scenarioVersion: string;
    state: ScenarioRunState;
    idempotencyKey: string;
    decisionJson: string | null;
    scoreJson: string | null;
    createdAt: string;
    sealedAt: string | null;
    revealedAt: string | null;
    completedAt: string | null;
  } | undefined;

  return row ? readScenarioRunRow(row) : undefined;
}

export function createScenarioRun(
  handle: DatabaseHandle,
  input: CreateScenarioRunInput
): ScenarioRunRecord {
  const { sqlite } = handle;
  const createdAt = new Date().toISOString();
  sqlite.prepare(`
    INSERT INTO scenario_runs (
      run_id,
      user_id,
      scenario_id,
      scenario_version,
      state,
      idempotency_key,
      created_at
    ) VALUES (?, ?, ?, ?, 'started', ?, ?)
    ON CONFLICT(idempotency_key) DO NOTHING
  `).run(
    input.runId,
    input.userId,
    input.scenarioId,
    input.scenarioVersion,
    input.idempotencyKey,
    createdAt
  );

  const record = getScenarioRun(handle, input.runId, input.userId)
    ?? (() => {
      const row = sqlite.prepare(`
        SELECT
          run_id AS runId,
          user_id AS userId,
          scenario_id AS scenarioId,
          scenario_version AS scenarioVersion,
          state,
          idempotency_key AS idempotencyKey,
          decision_json AS decisionJson,
          score_json AS scoreJson,
          created_at AS createdAt,
          sealed_at AS sealedAt,
          revealed_at AS revealedAt,
          completed_at AS completedAt
        FROM scenario_runs
        WHERE idempotency_key = ?
      `).get(input.idempotencyKey) as {
        runId: string;
        userId: string;
        scenarioId: string;
        scenarioVersion: string;
        state: ScenarioRunState;
        idempotencyKey: string;
        decisionJson: string | null;
        scoreJson: string | null;
        createdAt: string;
        sealedAt: string | null;
        revealedAt: string | null;
        completedAt: string | null;
      } | undefined;

      return row ? readScenarioRunRow(row) : undefined;
    })();

  if (!record) {
    throw new Error(`Scenario run was not persisted: ${input.idempotencyKey}`);
  }

  if (
    record.userId !== input.userId
    || record.scenarioId !== input.scenarioId
    || record.scenarioVersion !== input.scenarioVersion
  ) {
    throw new Error(`Idempotency key is bound to a different scenario run: ${input.idempotencyKey}`);
  }

  return record;
}

export function sealScenarioRun(
  handle: DatabaseHandle,
  runId: string,
  userId: string,
  decision: DecisionTrace,
  score: ScoreResult
): ScenarioRunRecord {
  const { sqlite } = handle;
  const parsedDecision = DecisionTraceSchema.parse(decision);
  const parsedScore = ScoreResultSchema.parse(score);
  const current = getScenarioRun(handle, runId, userId);

  if (!current) {
    throw new Error(`Scenario run was not found: ${runId}`);
  }

  if (current.state !== "started") {
    if (current.decision && isDeepStrictEqual(current.decision, parsedDecision)) {
      return current;
    }
    throw new Error(`Scenario run is already sealed: ${runId}`);
  }

  const sealedAt = new Date().toISOString();
  sqlite.prepare(`
    UPDATE scenario_runs
    SET state = 'sealed', decision_json = ?, score_json = ?, sealed_at = ?
    WHERE run_id = ? AND user_id = ? AND state = 'started'
  `).run(
    JSON.stringify(parsedDecision),
    JSON.stringify(parsedScore),
    sealedAt,
    runId,
    userId
  );

  const sealed = getScenarioRun(handle, runId, userId);
  if (!sealed) {
    throw new Error(`Scenario run disappeared while sealing: ${runId}`);
  }

  if (sealed.state !== "sealed" && sealed.state !== "revealed" && sealed.state !== "completed") {
    throw new Error(`Scenario run was not sealed: ${runId}`);
  }

  return sealed;
}

export function revealScenarioRun(
  handle: DatabaseHandle,
  runId: string,
  userId: string
): ScenarioRunRecord {
  const { sqlite } = handle;
  const current = getScenarioRun(handle, runId, userId);

  if (!current) {
    throw new Error(`Scenario run was not found: ${runId}`);
  }

  if (current.state === "started") {
    throw new Error(`Scenario run must be sealed before reveal: ${runId}`);
  }

  if (current.state === "revealed" || current.state === "completed") {
    return current;
  }

  const revealedAt = new Date().toISOString();
  sqlite.prepare(`
    UPDATE scenario_runs
    SET state = 'revealed', revealed_at = ?
    WHERE run_id = ? AND user_id = ? AND state = 'sealed'
  `).run(revealedAt, runId, userId);

  const revealed = getScenarioRun(handle, runId, userId);
  if (!revealed || (revealed.state !== "revealed" && revealed.state !== "completed")) {
    throw new Error(`Scenario run was not revealed: ${runId}`);
  }

  return revealed;
}
