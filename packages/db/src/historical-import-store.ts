import {
  HistoricalMarketSnapshotSchema,
  type HistoricalMarketSnapshot,
  type ScenarioPackage
} from "../../contracts/src/index.js";
import type { DatabaseHandle } from "./database.js";
import type { HistoricalSnapshotRecord } from "./repository.js";

/**
 * Historical pipeline persistence primitives (Batch 01 — Backend).
 *
 * Synchronous SQLite functions over `DatabaseHandle`. All multi-write flows
 * must run inside `PersistencePort.atomic()` (one transaction); these
 * primitives never open their own transactions so callers control atomicity.
 *
 * Concurrency safety comes from database constraints, never check-then-insert:
 * every insert uses `ON CONFLICT ... DO NOTHING` and classifies the outcome
 * with a follow-up read. Concurrent identical imports converge on one row.
 */

// ---------------------------------------------------------------------------
// Record types (shared by SQLite + Postgres renderings).
// ---------------------------------------------------------------------------

export type HistoricalImportStatus = "completed" | "conflict" | "rejected";

export type HistoricalImportRecord = {
  importId: string;
  importHash: string;
  status: HistoricalImportStatus;
  /** Raw summary_json payload (caller parses with the import-summary schema). */
  summaryJson: string;
  createdBy: string | null;
  createdAt: string;
};

export type SnapshotMetadataRecord = {
  snapshotId: string;
  licensingJson: string | null;
  captureJson: string | null;
  createdAt: string;
};

export type ScenarioSnapshotLinkRole = "source" | "public" | "future";

export type ScenarioSnapshotLinkRecord = {
  scenarioId: string;
  scenarioVersion: string;
  snapshotId: string;
  sourceId: string;
  snapshotContentHash: string;
  linkRole: ScenarioSnapshotLinkRole;
  createdAt: string;
};

export type ReviewTransitionRecord = {
  transitionId: string;
  scenarioId: string;
  scenarioVersion: string;
  fromStatus: string;
  toStatus: string;
  actorUserId: string;
  reason: string | null;
  createdAt: string;
};

export type HistoricalSnapshotSummary = {
  snapshotId: string;
  provider: string;
  symbol: string;
  interval: string;
  asOf: string;
  contentHash: string;
  candleCount: number;
  createdAt: string;
};

export const HISTORICAL_ADMIN_PAGE_LIMIT_MAX = 100;
export const HISTORICAL_ADMIN_PAGE_LIMIT_DEFAULT = 20;

export function clampPageLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return HISTORICAL_ADMIN_PAGE_LIMIT_DEFAULT;
  return Math.min(Math.max(Math.trunc(limit), 1), HISTORICAL_ADMIN_PAGE_LIMIT_MAX);
}

export function clampPageOffset(offset: number | undefined): number {
  if (offset === undefined || !Number.isFinite(offset)) return 0;
  return Math.max(Math.trunc(offset), 0);
}

// ---------------------------------------------------------------------------
// Scenario helpers (race-safe import path).
// ---------------------------------------------------------------------------

/**
 * Insert a scenario package, ignoring PK conflicts. Returns true when this
 * call inserted the row. Callers classify already-present vs conflicting by
 * reading the stored row afterwards (insert-first, never check-then-insert).
 */
export function insertScenarioPackageIgnoreConflict(
  { sqlite }: DatabaseHandle,
  package_: ScenarioPackage,
  nowIso?: string
): boolean {
  const now = nowIso ?? new Date().toISOString();
  const result = sqlite.prepare(`
    INSERT INTO scenarios (
      scenario_id, version, scenario_level, mode, content_version, data_version,
      future_hash, package_json, review_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(scenario_id, version) DO NOTHING
  `).run(
    package_.scenarioId,
    package_.version,
    package_.scenarioLevel,
    package_.mode,
    package_.contentVersion,
    package_.dataVersion,
    package_.futureHash,
    JSON.stringify(package_),
    package_.reviewStatus,
    now,
    now
  );
  return result.changes === 1;
}

/** Authoritative review-status COLUMN value (not package_json). */
export function getScenarioReviewStatusColumn(
  { sqlite }: DatabaseHandle,
  scenarioId: string,
  version: string
): string | undefined {
  const row = sqlite.prepare(`
    SELECT review_status AS reviewStatus
    FROM scenarios
    WHERE scenario_id = ? AND version = ?
  `).get(scenarioId, version) as { reviewStatus: string } | undefined;
  return row?.reviewStatus;
}

/** Raw stored package_json for fail-closed readiness (invalid rows stay readable). */
export function getStoredScenarioPackageJson(
  { sqlite }: DatabaseHandle,
  scenarioId: string,
  version: string
): unknown | undefined {
  const row = sqlite.prepare(`
    SELECT package_json AS packageJson
    FROM scenarios
    WHERE scenario_id = ? AND version = ?
  `).get(scenarioId, version) as { packageJson: string } | undefined;
  if (!row) return undefined;
  try {
    return JSON.parse(row.packageJson) as unknown;
  } catch {
    return row.packageJson;
  }
}

// ---------------------------------------------------------------------------
// Snapshot lookups.
// ---------------------------------------------------------------------------

/**
 * Insert-first snapshot write keyed by content hash. Returns true when this
 * call inserted the row. Callers classify already-present vs conflicting with
 * a follow-up read by content hash (insert-first, never check-then-insert).
 * The stored row's snapshot_id (not the candidate) is authoritative for links.
 */
export function insertHistoricalSnapshotIgnoreConflict(
  { sqlite }: DatabaseHandle,
  snapshot: HistoricalMarketSnapshot,
  snapshotId: string,
  createdAt: string
): boolean {
  const parsed = HistoricalMarketSnapshotSchema.parse(snapshot);
  const result = sqlite.prepare(`
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
  return result.changes === 1;
}

function readSnapshotRow(row: {
  snapshotId: string;
  provider: "binance";
  symbol: string;
  interval: string;
  asOf: string;
  contentHash: string;
  snapshotJson: string;
  createdAt: string;
}): HistoricalSnapshotRecord {
  return {
    snapshotId: row.snapshotId,
    provider: row.provider,
    symbol: row.symbol,
    interval: row.interval,
    asOf: row.asOf,
    contentHash: row.contentHash,
    snapshot: JSON.parse(row.snapshotJson) as HistoricalMarketSnapshot,
    createdAt: row.createdAt
  };
}

export function getHistoricalSnapshotByContentHash(
  { sqlite }: DatabaseHandle,
  contentHash: string
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
    WHERE content_hash = ?
  `).get(contentHash) as {
    snapshotId: string;
    provider: "binance";
    symbol: string;
    interval: string;
    asOf: string;
    contentHash: string;
    snapshotJson: string;
    createdAt: string;
  } | undefined;
  return row ? readSnapshotRow(row) : undefined;
}

export function listHistoricalSnapshots(
  { sqlite }: DatabaseHandle,
  options: { limit?: number; offset?: number } = {}
): HistoricalSnapshotSummary[] {
  const limit = clampPageLimit(options.limit);
  const offset = clampPageOffset(options.offset);
  const rows = sqlite.prepare(`
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
    ORDER BY created_at ASC, snapshot_id ASC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as Array<{
    snapshotId: string;
    provider: string;
    symbol: string;
    interval: string;
    asOf: string;
    contentHash: string;
    snapshotJson: string;
    createdAt: string;
  }>;
  return rows.map((row) => {
    let candleCount = 0;
    try {
      const parsed = JSON.parse(row.snapshotJson) as { candles?: unknown[] };
      candleCount = Array.isArray(parsed.candles) ? parsed.candles.length : 0;
    } catch {
      candleCount = 0;
    }
    return {
      snapshotId: row.snapshotId,
      provider: row.provider,
      symbol: row.symbol,
      interval: row.interval,
      asOf: row.asOf,
      contentHash: row.contentHash,
      candleCount,
      createdAt: row.createdAt
    };
  });
}

export function countHistoricalSnapshots({ sqlite }: DatabaseHandle): number {
  const row = sqlite.prepare(
    "SELECT COUNT(*) AS count FROM historical_snapshots"
  ).get() as { count: number };
  return row.count;
}

// ---------------------------------------------------------------------------
// Historical imports (idempotency ledger + audit summaries).
// ---------------------------------------------------------------------------

function readImportRow(row: {
  importId: string;
  importHash: string;
  status: HistoricalImportStatus;
  summaryJson: string;
  createdBy: string | null;
  createdAt: string;
}): HistoricalImportRecord {
  return {
    importId: row.importId,
    importHash: row.importHash,
    status: row.status,
    summaryJson: row.summaryJson,
    createdBy: row.createdBy,
    createdAt: row.createdAt
  };
}

export function createHistoricalImport(
  { sqlite }: DatabaseHandle,
  input: {
    importId: string;
    importHash: string;
    status: HistoricalImportStatus;
    summaryJson: string;
    createdBy: string | null;
    createdAt: string;
  }
): { created: boolean; record: HistoricalImportRecord } {
  sqlite.prepare(`
    INSERT INTO historical_imports (
      import_id, import_hash, status, summary_json, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(import_hash) DO NOTHING
  `).run(
    input.importId,
    input.importHash,
    input.status,
    input.summaryJson,
    input.createdBy,
    input.createdAt
  );
  const row = sqlite.prepare(`
    SELECT
      import_id AS importId,
      import_hash AS importHash,
      status,
      summary_json AS summaryJson,
      created_by AS createdBy,
      created_at AS createdAt
    FROM historical_imports
    WHERE import_hash = ?
  `).get(input.importHash) as {
    importId: string;
    importHash: string;
    status: HistoricalImportStatus;
    summaryJson: string;
    createdBy: string | null;
    createdAt: string;
  } | undefined;
  if (!row) {
    throw new Error(`Historical import was not persisted: ${input.importHash}`);
  }
  return { created: row.importId === input.importId, record: readImportRow(row) };
}

export function getHistoricalImport(
  { sqlite }: DatabaseHandle,
  importId: string
): HistoricalImportRecord | undefined {
  const row = sqlite.prepare(`
    SELECT
      import_id AS importId,
      import_hash AS importHash,
      status,
      summary_json AS summaryJson,
      created_by AS createdBy,
      created_at AS createdAt
    FROM historical_imports
    WHERE import_id = ?
  `).get(importId) as {
    importId: string;
    importHash: string;
    status: HistoricalImportStatus;
    summaryJson: string;
    createdBy: string | null;
    createdAt: string;
  } | undefined;
  return row ? readImportRow(row) : undefined;
}

export function getHistoricalImportByHash(
  { sqlite }: DatabaseHandle,
  importHash: string
): HistoricalImportRecord | undefined {
  const row = sqlite.prepare(`
    SELECT
      import_id AS importId,
      import_hash AS importHash,
      status,
      summary_json AS summaryJson,
      created_by AS createdBy,
      created_at AS createdAt
    FROM historical_imports
    WHERE import_hash = ?
  `).get(importHash) as {
    importId: string;
    importHash: string;
    status: HistoricalImportStatus;
    summaryJson: string;
    createdBy: string | null;
    createdAt: string;
  } | undefined;
  return row ? readImportRow(row) : undefined;
}

export function listHistoricalImports(
  { sqlite }: DatabaseHandle,
  options: { limit?: number; offset?: number } = {}
): HistoricalImportRecord[] {
  const limit = clampPageLimit(options.limit);
  const offset = clampPageOffset(options.offset);
  const rows = sqlite.prepare(`
    SELECT
      import_id AS importId,
      import_hash AS importHash,
      status,
      summary_json AS summaryJson,
      created_by AS createdBy,
      created_at AS createdAt
    FROM historical_imports
    ORDER BY created_at DESC, import_id DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as Array<{
    importId: string;
    importHash: string;
    status: HistoricalImportStatus;
    summaryJson: string;
    createdBy: string | null;
    createdAt: string;
  }>;
  return rows.map(readImportRow);
}

export function countHistoricalImports({ sqlite }: DatabaseHandle): number {
  const row = sqlite.prepare(
    "SELECT COUNT(*) AS count FROM historical_imports"
  ).get() as { count: number };
  return row.count;
}

// ---------------------------------------------------------------------------
// Snapshot metadata (immutable licensing + capture, first write wins).
// ---------------------------------------------------------------------------

export function upsertSnapshotMetadata(
  { sqlite }: DatabaseHandle,
  input: {
    snapshotId: string;
    licensingJson: string | null;
    captureJson: string | null;
    createdAt: string;
  }
): { created: boolean } {
  const result = sqlite.prepare(`
    INSERT INTO historical_snapshot_metadata (
      snapshot_id, licensing_json, capture_json, created_at
    ) VALUES (?, ?, ?, ?)
    ON CONFLICT(snapshot_id) DO NOTHING
  `).run(input.snapshotId, input.licensingJson, input.captureJson, input.createdAt);
  if (result.changes === 0) {
    // Monotonic gap-fill: complete NULL columns from later imports without
    // ever overwriting a present value (immutability preserved).
    sqlite.prepare(`
      UPDATE historical_snapshot_metadata
      SET
        licensing_json = COALESCE(licensing_json, ?),
        capture_json = COALESCE(capture_json, ?)
      WHERE snapshot_id = ?
    `).run(input.licensingJson, input.captureJson, input.snapshotId);
    return { created: false };
  }
  return { created: true };
}

export function getSnapshotMetadata(
  { sqlite }: DatabaseHandle,
  snapshotId: string
): SnapshotMetadataRecord | undefined {
  const row = sqlite.prepare(`
    SELECT
      snapshot_id AS snapshotId,
      licensing_json AS licensingJson,
      capture_json AS captureJson,
      created_at AS createdAt
    FROM historical_snapshot_metadata
    WHERE snapshot_id = ?
  `).get(snapshotId) as {
    snapshotId: string;
    licensingJson: string | null;
    captureJson: string | null;
    createdAt: string;
  } | undefined;
  return row
    ? {
      snapshotId: row.snapshotId,
      licensingJson: row.licensingJson,
      captureJson: row.captureJson,
      createdAt: row.createdAt
    }
    : undefined;
}

// ---------------------------------------------------------------------------
// Scenario-to-snapshot links.
// ---------------------------------------------------------------------------

function readLinkRow(row: {
  scenarioId: string;
  scenarioVersion: string;
  snapshotId: string;
  sourceId: string;
  snapshotContentHash: string;
  linkRole: ScenarioSnapshotLinkRole;
  createdAt: string;
}): ScenarioSnapshotLinkRecord {
  return { ...row };
}

export function createScenarioSnapshotLink(
  { sqlite }: DatabaseHandle,
  input: {
    scenarioId: string;
    scenarioVersion: string;
    snapshotId: string;
    sourceId: string;
    snapshotContentHash: string;
    linkRole: ScenarioSnapshotLinkRole;
    createdAt: string;
  }
): { created: boolean } {
  const result = sqlite.prepare(`
    INSERT INTO scenario_snapshot_links (
      scenario_id, scenario_version, snapshot_id, source_id,
      snapshot_content_hash, link_role, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(scenario_id, scenario_version, snapshot_id, source_id) DO NOTHING
  `).run(
    input.scenarioId,
    input.scenarioVersion,
    input.snapshotId,
    input.sourceId,
    input.snapshotContentHash,
    input.linkRole,
    input.createdAt
  );
  return { created: result.changes === 1 };
}

export function listScenarioSnapshotLinks(
  { sqlite }: DatabaseHandle,
  scenarioId: string,
  scenarioVersion: string
): ScenarioSnapshotLinkRecord[] {
  const rows = sqlite.prepare(`
    SELECT
      scenario_id AS scenarioId,
      scenario_version AS scenarioVersion,
      snapshot_id AS snapshotId,
      source_id AS sourceId,
      snapshot_content_hash AS snapshotContentHash,
      link_role AS linkRole,
      created_at AS createdAt
    FROM scenario_snapshot_links
    WHERE scenario_id = ? AND scenario_version = ?
    ORDER BY source_id ASC, snapshot_id ASC
  `).all(scenarioId, scenarioVersion) as Array<{
    scenarioId: string;
    scenarioVersion: string;
    snapshotId: string;
    sourceId: string;
    snapshotContentHash: string;
    linkRole: ScenarioSnapshotLinkRole;
    createdAt: string;
  }>;
  return rows.map(readLinkRow);
}

export function listLinksForSnapshot(
  { sqlite }: DatabaseHandle,
  snapshotId: string
): ScenarioSnapshotLinkRecord[] {
  const rows = sqlite.prepare(`
    SELECT
      scenario_id AS scenarioId,
      scenario_version AS scenarioVersion,
      snapshot_id AS snapshotId,
      source_id AS sourceId,
      snapshot_content_hash AS snapshotContentHash,
      link_role AS linkRole,
      created_at AS createdAt
    FROM scenario_snapshot_links
    WHERE snapshot_id = ?
    ORDER BY scenario_id ASC, scenario_version ASC, source_id ASC
  `).all(snapshotId) as Array<{
    scenarioId: string;
    scenarioVersion: string;
    snapshotId: string;
    sourceId: string;
    snapshotContentHash: string;
    linkRole: ScenarioSnapshotLinkRole;
    createdAt: string;
  }>;
  return rows.map(readLinkRow);
}

// ---------------------------------------------------------------------------
// Review-transition audit trail.
// ---------------------------------------------------------------------------

export function recordReviewTransition(
  { sqlite }: DatabaseHandle,
  input: {
    transitionId: string;
    scenarioId: string;
    scenarioVersion: string;
    fromStatus: string;
    toStatus: string;
    actorUserId: string;
    reason: string | null;
    createdAt: string;
  }
): void {
  sqlite.prepare(`
    INSERT INTO scenario_review_transitions (
      transition_id, scenario_id, scenario_version, from_status,
      to_status, actor_user_id, reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.transitionId,
    input.scenarioId,
    input.scenarioVersion,
    input.fromStatus,
    input.toStatus,
    input.actorUserId,
    input.reason,
    input.createdAt
  );
}

export function listReviewTransitions(
  { sqlite }: DatabaseHandle,
  scenarioId: string,
  scenarioVersion: string,
  options: { limit?: number; offset?: number } = {}
): ReviewTransitionRecord[] {
  const limit = clampPageLimit(options.limit);
  const offset = clampPageOffset(options.offset);
  const rows = sqlite.prepare(`
    SELECT
      transition_id AS transitionId,
      scenario_id AS scenarioId,
      scenario_version AS scenarioVersion,
      from_status AS fromStatus,
      to_status AS toStatus,
      actor_user_id AS actorUserId,
      reason,
      created_at AS createdAt
    FROM scenario_review_transitions
    WHERE scenario_id = ? AND scenario_version = ?
    ORDER BY created_at ASC, transition_id ASC
    LIMIT ? OFFSET ?
  `).all(scenarioId, scenarioVersion, limit, offset) as Array<{
    transitionId: string;
    scenarioId: string;
    scenarioVersion: string;
    fromStatus: string;
    toStatus: string;
    actorUserId: string;
    reason: string | null;
    createdAt: string;
  }>;
  return rows.map((row) => ({ ...row }));
}

export function countReviewTransitions(
  { sqlite }: DatabaseHandle,
  scenarioId: string,
  scenarioVersion: string
): number {
  const row = sqlite.prepare(`
    SELECT COUNT(*) AS count
    FROM scenario_review_transitions
    WHERE scenario_id = ? AND scenario_version = ?
  `).get(scenarioId, scenarioVersion) as { count: number };
  return row.count;
}
