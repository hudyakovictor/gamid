import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";

import type {
  HistoricalMarketSnapshot,
  ScenarioPackage
} from "../../contracts/src/index.js";
import {
  analyzeHistoricalImportInput,
  HistoricalImportParseError,
  stableStringify,
  type HistoricalImportIssue,
  type NormalizedHistoricalImportEnvelope
} from "../../domain/src/historical-import.js";
import {
  assertReviewTransition,
  type ReviewTransitionActor
} from "../../domain/src/review-policy.js";
import {
  evaluateScenarioReadiness,
  type ScenarioReadiness,
  type ScenarioReadinessLinkFact
} from "../../domain/src/readiness.js";
import type { PersistencePort } from "./ports.js";
import type { HistoricalImportStatus } from "./historical-import-store.js";

/**
 * Historical import orchestration (Batch 01 — Backend).
 *
 * Pure orchestration over `PersistencePort`: dry-run analysis, atomic real
 * import, review transitions with audit, and readiness assembly. Works
 * unchanged against SQLite and PostgreSQL because every guarantee comes from
 * database constraints (UNIQUE/PK/FK + ON CONFLICT DO NOTHING) and the
 * port's `atomic()` unit of work — never from check-then-insert.
 *
 * Layering note: this module imports pure domain logic (validation, policy,
 * readiness), following the existing `ledger.ts → domain/economy.ts`
 * precedent. The domain never imports persistence.
 */

// ---------------------------------------------------------------------------
// Errors.
// ---------------------------------------------------------------------------

export type HistoricalImportServiceErrorCode =
  | "forbidden"
  | "scenario_not_found"
  | "publication_not_ready"
  | "injected_failure"
  | "corrupt_import_record";

export class HistoricalImportServiceError extends Error {
  public readonly code: HistoricalImportServiceErrorCode;
  public readonly details: unknown;

  public constructor(code: HistoricalImportServiceErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "HistoricalImportServiceError";
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Deterministic identities (no ID consumption on dry-run or retry).
// ---------------------------------------------------------------------------

export function importIdFromHash(importHash: string): string {
  const hex = importHash.startsWith("sha256:")
    ? importHash.slice("sha256:".length)
    : createHash("sha256").update(importHash).digest("hex");
  return `imp-${hex}`;
}

export function snapshotIdFromHash(contentHash: string): string {
  const hex = contentHash.startsWith("sha256:")
    ? contentHash.slice("sha256:".length)
    : createHash("sha256").update(contentHash).digest("hex");
  return `snap-${hex}`;
}

/** Stable fingerprint for unparseable input (no importHash computable). */
function fingerprintRawInput(input: unknown): string {
  let canonical: string;
  try {
    canonical = stableStringify(input);
  } catch {
    canonical = `unstringifiable:${typeof input}`;
  }
  return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}

// ---------------------------------------------------------------------------
// Report schemas (validated at the service boundary; stored as JSON).
// ---------------------------------------------------------------------------

export const ImportItemOutcomeSchema = z.enum([
  "inserted",
  "already_present",
  "conflicting",
  "rejected"
]);

export type ImportItemOutcome = z.infer<typeof ImportItemOutcomeSchema>;

const ItemReasonSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1)
}).strict();

export type ImportItemReason = z.infer<typeof ItemReasonSchema>;

export const ScenarioImportItemSchema = z.object({
  scenarioId: z.string().min(1),
  version: z.string().min(1),
  outcome: ImportItemOutcomeSchema,
  requestedReviewStatus: z.string().min(1),
  persistedReviewStatus: z.string().min(1),
  reason: ItemReasonSchema.optional()
}).strict();

export type ScenarioImportItem = z.infer<typeof ScenarioImportItemSchema>;

export const SnapshotImportItemSchema = z.object({
  snapshotContentHash: z.string().min(1),
  snapshotId: z.string().min(1),
  outcome: ImportItemOutcomeSchema,
  reason: ItemReasonSchema.optional()
}).strict();

export type SnapshotImportItem = z.infer<typeof SnapshotImportItemSchema>;

export const LinkImportItemSchema = z.object({
  scenarioId: z.string().min(1),
  scenarioVersion: z.string().min(1),
  sourceId: z.string().min(1),
  snapshotContentHash: z.string().min(1),
  linkRole: z.string().min(1),
  outcome: ImportItemOutcomeSchema,
  reason: ItemReasonSchema.optional()
}).strict();

export type LinkImportItem = z.infer<typeof LinkImportItemSchema>;

export const MetadataImportItemSchema = z.object({
  snapshotContentHash: z.string().min(1),
  hasLicensing: z.boolean(),
  hasCapture: z.boolean(),
  outcome: ImportItemOutcomeSchema,
  reason: ItemReasonSchema.optional()
}).strict();

export type MetadataImportItem = z.infer<typeof MetadataImportItemSchema>;

export const ImportCountsSchema = z.object({
  inserted: z.number().int().nonnegative(),
  alreadyPresent: z.number().int().nonnegative(),
  conflicting: z.number().int().nonnegative(),
  rejected: z.number().int().nonnegative()
}).strict();

export type ImportCounts = z.infer<typeof ImportCountsSchema>;

export const ImportCountsByKindSchema = z.object({
  scenarios: ImportCountsSchema,
  snapshots: ImportCountsSchema,
  links: ImportCountsSchema,
  metadata: ImportCountsSchema,
  total: ImportCountsSchema
}).strict();

export type ImportCountsByKind = z.infer<typeof ImportCountsByKindSchema>;

export const ImportIssueReportSchema = z.object({
  code: z.string().min(1),
  path: z.string(),
  message: z.string().min(1),
  details: z.record(z.string()).optional()
}).strict();

export const ReadinessReasonReportSchema = z.object({
  code: z.string().min(1),
  path: z.string(),
  message: z.string().min(1)
}).strict();

export const ScenarioReadinessReportSchema = z.object({
  scenarioId: z.string().min(1),
  version: z.string().min(1),
  reviewStatus: z.string().min(1),
  ready: z.boolean(),
  reasons: z.array(ReadinessReasonReportSchema)
}).strict();

export const DryRunReportSchema = z.object({
  mode: z.literal("dry_run"),
  importHash: z.string().min(1),
  valid: z.boolean(),
  parseable: z.boolean(),
  issues: z.array(ImportIssueReportSchema),
  requestedReviewStatuses: z.record(z.string()),
  scenarios: z.array(ScenarioImportItemSchema),
  snapshots: z.array(SnapshotImportItemSchema),
  links: z.array(LinkImportItemSchema),
  metadata: z.array(MetadataImportItemSchema),
  counts: ImportCountsByKindSchema,
  readiness: z.array(ScenarioReadinessReportSchema)
}).strict();

export type DryRunReport = z.infer<typeof DryRunReportSchema>;

export const ImportSummarySchema = z.object({
  mode: z.literal("real"),
  importId: z.string().min(1),
  importHash: z.string().min(1),
  status: z.enum(["completed", "conflict", "rejected"]),
  duplicate: z.boolean(),
  persisted: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
  issues: z.array(ImportIssueReportSchema),
  requestedReviewStatuses: z.record(z.string()),
  scenarios: z.array(ScenarioImportItemSchema),
  snapshots: z.array(SnapshotImportItemSchema),
  links: z.array(LinkImportItemSchema),
  metadata: z.array(MetadataImportItemSchema),
  counts: ImportCountsByKindSchema,
  readiness: z.array(ScenarioReadinessReportSchema)
}).strict();

export type ImportSummary = z.infer<typeof ImportSummarySchema>;

export type HistoricalImportActor = ReviewTransitionActor;

export type ImportFailureHook =
  | "after_scenarios"
  | "after_snapshots"
  | "after_links"
  | "after_metadata"
  | "before_summary";

export type RealImportOptions = {
  nowIso?: string | undefined;
  /** TEST-ONLY failure injection for rollback verification. Never set in routes. */
  failureHook?: ImportFailureHook | undefined;
};

export type ReviewTransitionResult = {
  readonly scenarioId: string;
  readonly scenarioVersion: string;
  readonly fromStatus: string;
  readonly toStatus: string;
  readonly noop: boolean;
  readonly transitionId: string | null;
  readonly readiness: ScenarioReadiness;
};

// ---------------------------------------------------------------------------
// Internal helpers.
// ---------------------------------------------------------------------------

function emptyCounts(): ImportCounts {
  return { inserted: 0, alreadyPresent: 0, conflicting: 0, rejected: 0 };
}

function tally(
  items: ReadonlyArray<{ outcome: ImportItemOutcome }>
): ImportCounts {
  const counts = emptyCounts();
  for (const item of items) {
    if (item.outcome === "inserted") counts.inserted += 1;
    else if (item.outcome === "already_present") counts.alreadyPresent += 1;
    else if (item.outcome === "conflicting") counts.conflicting += 1;
    else counts.rejected += 1;
  }
  return counts;
}

function combineCounts(parts: ImportCounts[]): ImportCounts {
  const total = emptyCounts();
  for (const part of parts) {
    total.inserted += part.inserted;
    total.alreadyPresent += part.alreadyPresent;
    total.conflicting += part.conflicting;
    total.rejected += part.rejected;
  }
  return total;
}

function scenarioKey(scenarioId: string, version: string): string {
  return `${scenarioId}@${version}`;
}

/** Stored-vs-incoming scenario equality ignoring reviewStatus (forced draft). */
function storedScenarioMatches(stored: unknown, incoming: ScenarioPackage): boolean {
  if (typeof stored !== "object" || stored === null) return false;
  const { reviewStatus: _storedStatus, ...storedRest } = stored as Record<string, unknown>;
  const { reviewStatus: _incomingStatus, ...incomingRest } = incoming;
  return stableStringify(storedRest) === stableStringify(incomingRest);
}

function storedSnapshotMatches(stored: unknown, incoming: HistoricalMarketSnapshot): boolean {
  return stableStringify(stored) === stableStringify(incoming);
}

function toIssueReports(issues: readonly HistoricalImportIssue[]): DryRunReport["issues"] {
  return issues.map((issue) => ({
    code: issue.code,
    path: issue.path,
    message: issue.message,
    ...(issue.details ? { details: issue.details } : {})
  }));
}

function toReadinessReport(readiness: ScenarioReadiness): DryRunReport["readiness"][number] {
  return {
    scenarioId: readiness.scenarioId,
    version: readiness.version,
    reviewStatus: readiness.reviewStatus,
    ready: readiness.ready,
    reasons: readiness.reasons.map((reason) => ({ ...reason }))
  };
}

function assertEditor(actor: HistoricalImportActor): void {
  if (!actor.isEditor) {
    throw new HistoricalImportServiceError(
      "forbidden",
      `Actor ${actor.userId} is not authorized for historical import operations`
    );
  }
}

async function assembleReadiness(
  persistence: PersistencePort,
  scenarioId: string,
  version: string
): Promise<ScenarioReadiness> {
  const reviewStatus = await persistence.getScenarioReviewStatusColumn(scenarioId, version);
  if (reviewStatus === undefined) {
    throw new HistoricalImportServiceError(
      "scenario_not_found",
      `Scenario ${scenarioId}@${version} was not found`
    );
  }
  const storedPackage = await persistence.getStoredScenarioPackageJson(scenarioId, version);
  const links = await persistence.listScenarioSnapshotLinks(scenarioId, version);
  const facts: ScenarioReadinessLinkFact[] = [];
  for (const link of links) {
    const record = await persistence.getHistoricalSnapshot(link.snapshotId);
    facts.push({
      sourceId: link.sourceId,
      snapshotContentHash: link.snapshotContentHash,
      snapshot: record ? (record.snapshot as HistoricalMarketSnapshot) : null
    });
  }
  return evaluateScenarioReadiness({
    scenarioId,
    version,
    storedPackage,
    reviewStatus,
    links: facts
  });
}

// ---------------------------------------------------------------------------
// Dry-run: full analysis, zero persistent writes.
// ---------------------------------------------------------------------------

export async function dryRunHistoricalImport(
  persistence: PersistencePort,
  input: unknown,
  actor: HistoricalImportActor
): Promise<DryRunReport> {
  assertEditor(actor);

  let envelope: NormalizedHistoricalImportEnvelope;
  try {
    const validation = analyzeHistoricalImportInput(input);
    envelope = validation.envelope;
    if (!validation.valid) {
      return DryRunReportSchema.parse(rejectedDryRun(envelope, validation.issues));
    }
  } catch (error) {
    if (error instanceof HistoricalImportParseError) {
      return DryRunReportSchema.parse({
        mode: "dry_run",
        importHash: fingerprintRawInput(input),
        valid: false,
        parseable: false,
        issues: toIssueReports(error.issues),
        requestedReviewStatuses: {},
        scenarios: [],
        snapshots: [],
        links: [],
        metadata: [],
        counts: emptyCountsByKind(),
        readiness: []
      });
    }
    throw error;
  }

  // Valid envelope: classify every item with read-only queries. No atomic()
  // block (not even an empty transaction), no randomUUID, no writes.
  const scenarios: ScenarioImportItem[] = [];
  const snapshots: SnapshotImportItem[] = [];
  const links: LinkImportItem[] = [];
  const metadata: MetadataImportItem[] = [];

  const scenarioOutcome = new Map<string, ImportItemOutcome>();
  const snapshotOutcome = new Map<string, ImportItemOutcome>();
  const snapshotIdByHash = new Map<string, string>();

  for (const scenario of envelope.scenarios) {
    const key = scenarioKey(scenario.scenarioId, scenario.version);
    const stored = await persistence.getStoredScenarioPackageJson(scenario.scenarioId, scenario.version);
    if (stored === undefined) {
      scenarios.push({
        scenarioId: scenario.scenarioId,
        version: scenario.version,
        outcome: "inserted",
        requestedReviewStatus: envelope.requestedReviewStatuses[key] ?? "draft",
        persistedReviewStatus: "draft"
      });
      scenarioOutcome.set(key, "inserted");
    } else {
      const column = await persistence.getScenarioReviewStatusColumn(scenario.scenarioId, scenario.version);
      if (storedScenarioMatches(stored, scenario)) {
        scenarios.push({
          scenarioId: scenario.scenarioId,
          version: scenario.version,
          outcome: "already_present",
          requestedReviewStatus: envelope.requestedReviewStatuses[key] ?? "draft",
          persistedReviewStatus: column ?? "draft"
        });
        scenarioOutcome.set(key, "already_present");
      } else {
        scenarios.push({
          scenarioId: scenario.scenarioId,
          version: scenario.version,
          outcome: "conflicting",
          requestedReviewStatus: envelope.requestedReviewStatuses[key] ?? "draft",
          persistedReviewStatus: column ?? "draft",
          reason: {
            code: "conflicting_immutable_data",
            message: `Scenario ${key} already exists with different content`
          }
        });
        scenarioOutcome.set(key, "conflicting");
      }
    }
  }

  for (const snapshot of envelope.snapshots) {
    const hash = snapshot.provenance.contentHash;
    const stored = await persistence.getHistoricalSnapshotByContentHash(hash);
    if (!stored) {
      snapshots.push({
        snapshotContentHash: hash,
        snapshotId: snapshotIdFromHash(hash),
        outcome: "inserted"
      });
      snapshotOutcome.set(hash, "inserted");
      snapshotIdByHash.set(hash, snapshotIdFromHash(hash));
    } else if (storedSnapshotMatches(stored.snapshot, snapshot)) {
      snapshots.push({
        snapshotContentHash: hash,
        snapshotId: stored.snapshotId,
        outcome: "already_present"
      });
      snapshotOutcome.set(hash, "already_present");
      snapshotIdByHash.set(hash, stored.snapshotId);
    } else {
      snapshots.push({
        snapshotContentHash: hash,
        snapshotId: stored.snapshotId,
        outcome: "conflicting",
        reason: {
          code: "conflicting_immutable_data",
          message: `Snapshot ${hash} already exists with different content`
        }
      });
      snapshotOutcome.set(hash, "conflicting");
      snapshotIdByHash.set(hash, stored.snapshotId);
    }
  }

  // Existing links per scenario (one read per scenario, all read-only).
  const existingLinks = new Map<string, Set<string>>();
  for (const scenario of envelope.scenarios) {
    const key = scenarioKey(scenario.scenarioId, scenario.version);
    if (existingLinks.has(key)) continue;
    const rows = await persistence.listScenarioSnapshotLinks(scenario.scenarioId, scenario.version);
    existingLinks.set(key, new Set(rows.map((row) => `${row.snapshotId}#${row.sourceId}`)));
  }

  for (const link of envelope.links) {
    const key = scenarioKey(link.scenarioId, link.scenarioVersion);
    const blocked =
      scenarioOutcome.get(key) === "conflicting" || snapshotOutcome.get(link.snapshotContentHash) === "conflicting";
    if (blocked) {
      links.push({
        scenarioId: link.scenarioId,
        scenarioVersion: link.scenarioVersion,
        sourceId: link.sourceId,
        snapshotContentHash: link.snapshotContentHash,
        linkRole: link.linkRole,
        outcome: "rejected",
        reason: {
          code: "rejected_due_to_conflict",
          message: "Link rejected because its scenario or snapshot conflicts with stored data"
        }
      });
      continue;
    }
    const candidateId = snapshotIdByHash.get(link.snapshotContentHash) ?? snapshotIdFromHash(link.snapshotContentHash);
    const exists = existingLinks.get(key)?.has(`${candidateId}#${link.sourceId}`) ?? false;
    links.push({
      scenarioId: link.scenarioId,
      scenarioVersion: link.scenarioVersion,
      sourceId: link.sourceId,
      snapshotContentHash: link.snapshotContentHash,
      linkRole: link.linkRole,
      outcome: exists ? "already_present" : "inserted"
    });
  }

  const licensingByHash = new Map(envelope.licensing.map((entry) => [entry.snapshotContentHash, entry]));
  const captureByHash = new Map(envelope.capture.map((entry) => [entry.snapshotContentHash, entry]));
  const metadataHashes = [...new Set([...licensingByHash.keys(), ...captureByHash.keys()])].sort();
  for (const hash of metadataHashes) {
    if (snapshotOutcome.get(hash) === "conflicting") {
      metadata.push({
        snapshotContentHash: hash,
        hasLicensing: licensingByHash.has(hash),
        hasCapture: captureByHash.has(hash),
        outcome: "rejected",
        reason: {
          code: "rejected_due_to_conflict",
          message: "Metadata rejected because its snapshot conflicts with stored data"
        }
      });
      continue;
    }
    const snapshotId = snapshotIdByHash.get(hash) ?? snapshotIdFromHash(hash);
    const stored = await persistence.getSnapshotMetadata(snapshotId);
    if (!stored) {
      metadata.push({
        snapshotContentHash: hash,
        hasLicensing: licensingByHash.has(hash),
        hasCapture: captureByHash.has(hash),
        outcome: "inserted"
      });
    } else {
      metadata.push({
        snapshotContentHash: hash,
        hasLicensing: licensingByHash.has(hash),
        hasCapture: captureByHash.has(hash),
        outcome: "already_present",
        ...(metadataPreservedReason(stored, licensingByHash.get(hash), captureByHash.get(hash))
          ? { reason: metadataPreservedReason(stored, licensingByHash.get(hash), captureByHash.get(hash))! }
          : {})
      });
    }
  }

  // Hypothetical post-import readiness: existing persisted links plus the
  // links this import would persist (inserted + already_present only).
  const readiness: ScenarioReadiness[] = [];
  for (const scenario of envelope.scenarios) {
    const key = scenarioKey(scenario.scenarioId, scenario.version);
    const persistedLinks = await persistence.listScenarioSnapshotLinks(scenario.scenarioId, scenario.version);
    const facts: ScenarioReadinessLinkFact[] = [];
    const seen = new Set<string>();
    for (const row of persistedLinks) {
      seen.add(`${row.snapshotId}#${row.sourceId}`);
      const record = await persistence.getHistoricalSnapshot(row.snapshotId);
      facts.push({
        sourceId: row.sourceId,
        snapshotContentHash: row.snapshotContentHash,
        snapshot: record ? (record.snapshot as HistoricalMarketSnapshot) : null
      });
    }
    const wouldPersist = links.filter((item) =>
      scenarioKey(item.scenarioId, item.scenarioVersion) === key
      && (item.outcome === "inserted" || item.outcome === "already_present")
    );
    for (const item of wouldPersist) {
      const candidateId = snapshotIdByHash.get(item.snapshotContentHash) ?? "";
      if (seen.has(`${candidateId}#${item.sourceId}`)) continue;
      seen.add(`${candidateId}#${item.sourceId}`);
      const envelopeSnapshot = envelope.snapshots.find(
        (candidate) => candidate.provenance.contentHash === item.snapshotContentHash
      ) ?? null;
      const storedRecord = snapshotOutcome.get(item.snapshotContentHash) === "already_present"
        ? await persistence.getHistoricalSnapshot(candidateId)
        : undefined;
      facts.push({
        sourceId: item.sourceId,
        snapshotContentHash: item.snapshotContentHash,
        snapshot: envelopeSnapshot
          ?? (storedRecord ? (storedRecord.snapshot as HistoricalMarketSnapshot) : null)
      });
    }
    const column = await persistence.getScenarioReviewStatusColumn(scenario.scenarioId, scenario.version);
    const storedPackage = await persistence.getStoredScenarioPackageJson(scenario.scenarioId, scenario.version);
    readiness.push(evaluateScenarioReadiness({
      scenarioId: scenario.scenarioId,
      version: scenario.version,
      storedPackage: storedPackage ?? scenario,
      reviewStatus: column ?? "draft",
      links: facts
    }));
  }

  const counts = countsByKind(scenarios, snapshots, links, metadata);
  return DryRunReportSchema.parse({
    mode: "dry_run",
    importHash: envelope.importHash,
    valid: true,
    parseable: true,
    issues: [],
    requestedReviewStatuses: { ...envelope.requestedReviewStatuses },
    scenarios,
    snapshots,
    links,
    metadata,
    counts,
    readiness: readiness.map(toReadinessReport)
  });
}

function emptyCountsByKind(): ImportCountsByKind {
  return {
    scenarios: emptyCounts(),
    snapshots: emptyCounts(),
    links: emptyCounts(),
    metadata: emptyCounts(),
    total: emptyCounts()
  };
}

function countsByKind(
  scenarios: ReadonlyArray<{ outcome: ImportItemOutcome }>,
  snapshots: ReadonlyArray<{ outcome: ImportItemOutcome }>,
  links: ReadonlyArray<{ outcome: ImportItemOutcome }>,
  metadata: ReadonlyArray<{ outcome: ImportItemOutcome }>
): ImportCountsByKind {
  const byKind = {
    scenarios: tally(scenarios),
    snapshots: tally(snapshots),
    links: tally(links),
    metadata: tally(metadata)
  };
  return {
    ...byKind,
    total: combineCounts([byKind.scenarios, byKind.snapshots, byKind.links, byKind.metadata])
  };
}

function rejectedDryRun(
  envelope: NormalizedHistoricalImportEnvelope,
  issues: readonly HistoricalImportIssue[]
): Omit<DryRunReport, "mode" | "importHash" | "valid" | "parseable"> & {
  mode: "dry_run";
  importHash: string;
  valid: false;
  parseable: boolean;
} {
  const reason = {
    code: "invalid_envelope",
    message: "Envelope failed validation; see issues for actionable paths and reasons"
  };
  const scenarios: ScenarioImportItem[] = envelope.scenarios.map((scenario) => ({
    scenarioId: scenario.scenarioId,
    version: scenario.version,
    outcome: "rejected",
    requestedReviewStatus: envelope.requestedReviewStatuses[scenarioKey(scenario.scenarioId, scenario.version)] ?? "draft",
    persistedReviewStatus: "draft",
    reason
  }));
  const snapshots: SnapshotImportItem[] = envelope.snapshots.map((snapshot) => ({
    snapshotContentHash: snapshot.provenance.contentHash,
    snapshotId: snapshotIdFromHash(snapshot.provenance.contentHash),
    outcome: "rejected",
    reason
  }));
  const links: LinkImportItem[] = envelope.links.map((link) => ({
    scenarioId: link.scenarioId,
    scenarioVersion: link.scenarioVersion,
    sourceId: link.sourceId,
    snapshotContentHash: link.snapshotContentHash,
    linkRole: link.linkRole,
    outcome: "rejected",
    reason
  }));
  const metadataHashes = [...new Set([
    ...envelope.licensing.map((entry) => entry.snapshotContentHash),
    ...envelope.capture.map((entry) => entry.snapshotContentHash)
  ])].sort();
  const metadata: MetadataImportItem[] = metadataHashes.map((hash) => ({
    snapshotContentHash: hash,
    hasLicensing: envelope.licensing.some((entry) => entry.snapshotContentHash === hash),
    hasCapture: envelope.capture.some((entry) => entry.snapshotContentHash === hash),
    outcome: "rejected",
    reason
  }));
  return {
    mode: "dry_run",
    importHash: envelope.importHash,
    valid: false,
    parseable: true,
    issues: toIssueReports(issues),
    requestedReviewStatuses: { ...envelope.requestedReviewStatuses },
    scenarios,
    snapshots,
    links,
    metadata,
    counts: countsByKind(scenarios, snapshots, links, metadata),
    readiness: []
  };
}

function metadataPreservedReason(
  stored: { licensingJson: string | null; captureJson: string | null },
  licensing: unknown,
  capture: unknown
): ImportItemReason | undefined {
  const differs = (storedJson: string | null, incoming: unknown): boolean => {
    if (incoming === undefined) return false;
    if (storedJson === null) return false; // gap-fill path reports separately
    try {
      return stableStringify(JSON.parse(storedJson) as unknown) !== stableStringify(incoming);
    } catch {
      return storedJson !== JSON.stringify(incoming);
    }
  };
  if (differs(stored.licensingJson, licensing) || differs(stored.captureJson, capture)) {
    return {
      code: "licensing_preserved",
      message: "Original metadata preserved; re-import values do not overwrite stored metadata"
    };
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Real import: one transaction, deterministic summary.
// ---------------------------------------------------------------------------

export async function importHistoricalPackage(
  persistence: PersistencePort,
  input: unknown,
  actor: HistoricalImportActor,
  options: RealImportOptions = {}
): Promise<ImportSummary> {
  assertEditor(actor);
  const createdAt = options.nowIso ?? new Date().toISOString();

  let envelope: NormalizedHistoricalImportEnvelope;
  try {
    const validation = analyzeHistoricalImportInput(input);
    envelope = validation.envelope;
    if (!validation.valid) {
      // Invalid envelopes are never persisted (no spam ledger); the rejected
      // summary is ephemeral but deterministic for operator correlation.
      // Built field-by-field: dry-run-only keys (valid/parseable) must not
      // leak into the strict summary schema.
      const dryRun = rejectedDryRun(envelope, validation.issues);
      return ImportSummarySchema.parse({
        mode: "real",
        importId: importIdFromHash(envelope.importHash),
        importHash: dryRun.importHash,
        status: "rejected",
        duplicate: false,
        persisted: false,
        createdAt,
        issues: dryRun.issues,
        requestedReviewStatuses: dryRun.requestedReviewStatuses,
        scenarios: dryRun.scenarios,
        snapshots: dryRun.snapshots,
        links: dryRun.links,
        metadata: dryRun.metadata,
        counts: dryRun.counts,
        readiness: dryRun.readiness
      });
    }
  } catch (error) {
    if (error instanceof HistoricalImportParseError) {
      const importHash = fingerprintRawInput(input);
      return ImportSummarySchema.parse({
        mode: "real",
        importId: importIdFromHash(importHash),
        importHash,
        status: "rejected",
        duplicate: false,
        persisted: false,
        createdAt,
        issues: toIssueReports(error.issues),
        requestedReviewStatuses: {},
        scenarios: [],
        snapshots: [],
        links: [],
        metadata: [],
        counts: emptyCountsByKind(),
        readiness: []
      });
    }
    throw error;
  }

  const importHash = envelope.importHash;
  const importId = importIdFromHash(importHash);

  const summary = await persistence.atomic(async () => {
    // Idempotent retry fast-path: the UNIQUE(import_hash) row is the whole
    // envelope's idempotency record. A concurrent identical import converges
    // on the final INSERT below (ON CONFLICT DO NOTHING + re-read).
    const existing = await persistence.getHistoricalImportByHash(importHash);
    if (existing) {
      const parsed = ImportSummarySchema.safeParse(JSON.parse(existing.summaryJson) as unknown);
      if (!parsed.success) {
        throw new HistoricalImportServiceError(
          "corrupt_import_record",
          `Stored import summary for ${importHash} is corrupt`
        );
      }
      return { ...parsed.data, duplicate: true, persisted: true };
    }

    const scenarios: ScenarioImportItem[] = [];
    const snapshots: SnapshotImportItem[] = [];
    const links: LinkImportItem[] = [];
    const metadata: MetadataImportItem[] = [];
    const scenarioOutcome = new Map<string, ImportItemOutcome>();
    const snapshotOutcome = new Map<string, ImportItemOutcome>();
    const snapshotIdByHash = new Map<string, string>();

    // Stage 1: scenarios (forced draft packages).
    for (const scenario of envelope.scenarios) {
      const key = scenarioKey(scenario.scenarioId, scenario.version);
      const inserted = await persistence.insertScenarioPackageIgnoreConflict(scenario, createdAt);
      if (inserted) {
        scenarios.push({
          scenarioId: scenario.scenarioId,
          version: scenario.version,
          outcome: "inserted",
          requestedReviewStatus: envelope.requestedReviewStatuses[key] ?? "draft",
          persistedReviewStatus: "draft"
        });
        scenarioOutcome.set(key, "inserted");
      } else {
        const stored = await persistence.getStoredScenarioPackageJson(scenario.scenarioId, scenario.version);
        const column = await persistence.getScenarioReviewStatusColumn(scenario.scenarioId, scenario.version);
        if (stored !== undefined && storedScenarioMatches(stored, scenario)) {
          scenarios.push({
            scenarioId: scenario.scenarioId,
            version: scenario.version,
            outcome: "already_present",
            requestedReviewStatus: envelope.requestedReviewStatuses[key] ?? "draft",
            persistedReviewStatus: column ?? "draft"
          });
          scenarioOutcome.set(key, "already_present");
        } else {
          scenarios.push({
            scenarioId: scenario.scenarioId,
            version: scenario.version,
            outcome: "conflicting",
            requestedReviewStatus: envelope.requestedReviewStatuses[key] ?? "draft",
            persistedReviewStatus: column ?? "draft",
            reason: {
              code: "conflicting_immutable_data",
              message: `Scenario ${key} already exists with different content`
            }
          });
          scenarioOutcome.set(key, "conflicting");
        }
      }
    }
    throwIfHook(options.failureHook, "after_scenarios");

    // Stage 2: immutable snapshots (stored snapshot_id is authoritative).
    for (const snapshot of envelope.snapshots) {
      const hash = snapshot.provenance.contentHash;
      const candidateId = snapshotIdFromHash(hash);
      const inserted = await persistence.insertHistoricalSnapshotIgnoreConflict(snapshot, candidateId, createdAt);
      const stored = await persistence.getHistoricalSnapshotByContentHash(hash);
      if (!stored) {
        throw new HistoricalImportServiceError(
          "corrupt_import_record",
          `Snapshot ${hash} disappeared during import`
        );
      }
      if (inserted) {
        snapshots.push({ snapshotContentHash: hash, snapshotId: stored.snapshotId, outcome: "inserted" });
        snapshotOutcome.set(hash, "inserted");
      } else if (storedSnapshotMatches(stored.snapshot, snapshot)) {
        snapshots.push({ snapshotContentHash: hash, snapshotId: stored.snapshotId, outcome: "already_present" });
        snapshotOutcome.set(hash, "already_present");
      } else {
        snapshots.push({
          snapshotContentHash: hash,
          snapshotId: stored.snapshotId,
          outcome: "conflicting",
          reason: {
            code: "conflicting_immutable_data",
            message: `Snapshot ${hash} already exists with different content`
          }
        });
        snapshotOutcome.set(hash, "conflicting");
      }
      snapshotIdByHash.set(hash, stored.snapshotId);
    }
    throwIfHook(options.failureHook, "after_snapshots");

    // Stage 3: explicit links (skipped when either side conflicts).
    for (const link of envelope.links) {
      const key = scenarioKey(link.scenarioId, link.scenarioVersion);
      if (scenarioOutcome.get(key) === "conflicting" || snapshotOutcome.get(link.snapshotContentHash) === "conflicting") {
        links.push({
          scenarioId: link.scenarioId,
          scenarioVersion: link.scenarioVersion,
          sourceId: link.sourceId,
          snapshotContentHash: link.snapshotContentHash,
          linkRole: link.linkRole,
          outcome: "rejected",
          reason: {
            code: "rejected_due_to_conflict",
            message: "Link rejected because its scenario or snapshot conflicts with stored data"
          }
        });
        continue;
      }
      const snapshotId = snapshotIdByHash.get(link.snapshotContentHash) ?? snapshotIdFromHash(link.snapshotContentHash);
      const { created } = await persistence.createScenarioSnapshotLink({
        scenarioId: link.scenarioId,
        scenarioVersion: link.scenarioVersion,
        snapshotId,
        sourceId: link.sourceId,
        snapshotContentHash: link.snapshotContentHash,
        linkRole: link.linkRole,
        createdAt
      });
      links.push({
        scenarioId: link.scenarioId,
        scenarioVersion: link.scenarioVersion,
        sourceId: link.sourceId,
        snapshotContentHash: link.snapshotContentHash,
        linkRole: link.linkRole,
        outcome: created ? "inserted" : "already_present"
      });
    }
    throwIfHook(options.failureHook, "after_links");

    // Stage 4: licensing + capture metadata (immutable first-wins with
    // monotonic gap-fill; never overwrites present values).
    const licensingByHash = new Map(envelope.licensing.map((entry) => [entry.snapshotContentHash, entry]));
    const captureByHash = new Map(envelope.capture.map((entry) => [entry.snapshotContentHash, entry]));
    const metadataHashes = [...new Set([...licensingByHash.keys(), ...captureByHash.keys()])].sort();
    for (const hash of metadataHashes) {
      const licensing = licensingByHash.get(hash);
      const capture = captureByHash.get(hash);
      if (snapshotOutcome.get(hash) === "conflicting") {
        metadata.push({
          snapshotContentHash: hash,
          hasLicensing: licensing !== undefined,
          hasCapture: capture !== undefined,
          outcome: "rejected",
          reason: {
            code: "rejected_due_to_conflict",
            message: "Metadata rejected because its snapshot conflicts with stored data"
          }
        });
        continue;
      }
      const snapshotId = snapshotIdByHash.get(hash) ?? snapshotIdFromHash(hash);
      const before = await persistence.getSnapshotMetadata(snapshotId);
      const { created } = await persistence.upsertSnapshotMetadata({
        snapshotId,
        licensingJson: licensing ? stableStringify(licensing) : null,
        captureJson: capture ? stableStringify(capture) : null,
        createdAt
      });
      if (created || !before) {
        metadata.push({
          snapshotContentHash: hash,
          hasLicensing: licensing !== undefined,
          hasCapture: capture !== undefined,
          outcome: "inserted"
        });
      } else {
        const after = await persistence.getSnapshotMetadata(snapshotId);
        const gapFilled = (after?.licensingJson ?? null) !== (before.licensingJson ?? null)
          || (after?.captureJson ?? null) !== (before.captureJson ?? null);
        const preserved = metadataPreservedReason(before, licensing, capture);
        metadata.push({
          snapshotContentHash: hash,
          hasLicensing: licensing !== undefined,
          hasCapture: capture !== undefined,
          outcome: "already_present",
          ...(gapFilled
            ? {
              reason: {
                code: "metadata_completed",
                message: "Existing metadata row completed with newly supplied fields; original values preserved"
              }
            }
            : preserved ? { reason: preserved } : {})
        });
      }
    }
    throwIfHook(options.failureHook, "after_metadata");

    // Stage 5: post-write readiness (reads inside the same transaction).
    const readiness: ScenarioReadiness[] = [];
    for (const scenario of envelope.scenarios) {
      readiness.push(await assembleReadiness(persistence, scenario.scenarioId, scenario.version));
    }

    const counts = countsByKind(scenarios, snapshots, links, metadata);
    const status: HistoricalImportStatus =
      counts.total.conflicting > 0 ? "conflict" : "completed";
    throwIfHook(options.failureHook, "before_summary");

    const summaryCore = {
      mode: "real",
      importId,
      importHash,
      status,
      duplicate: false,
      persisted: true,
      createdAt,
      issues: [],
      requestedReviewStatuses: { ...envelope.requestedReviewStatuses },
      scenarios,
      snapshots,
      links,
      metadata,
      counts,
      readiness: readiness.map(toReadinessReport)
    };
    const parsed = ImportSummarySchema.parse(summaryCore);
    const { created, record } = await persistence.createHistoricalImport({
      importId,
      importHash,
      status,
      summaryJson: stableStringify(parsed),
      createdBy: actor.userId,
      createdAt
    });
    if (!created) {
      // Lost a concurrent identical-import race: converge on the winner.
      const winner = ImportSummarySchema.safeParse(JSON.parse(record.summaryJson) as unknown);
      if (!winner.success) {
        throw new HistoricalImportServiceError(
          "corrupt_import_record",
          `Stored import summary for ${importHash} is corrupt`
        );
      }
      return { ...winner.data, duplicate: true, persisted: true };
    }
    return parsed;
  });

  return ImportSummarySchema.parse(summary);
}

function throwIfHook(hook: ImportFailureHook | undefined, stage: ImportFailureHook): void {
  if (hook === stage) {
    throw new HistoricalImportServiceError(
      "injected_failure",
      `Test-only failure injected ${stage}`
    );
  }
}

// ---------------------------------------------------------------------------
// Review transitions (policy + audit, check-and-act inside one transaction).
// ---------------------------------------------------------------------------

export async function transitionScenarioReviewStatus(
  persistence: PersistencePort,
  input: {
    scenarioId: string;
    scenarioVersion: string;
    toStatus: string;
    actor: HistoricalImportActor;
    reason?: string | undefined;
    nowIso?: string | undefined;
  }
): Promise<ReviewTransitionResult> {
  // Authorization before existence: unauthorized actors learn nothing about
  // which scenarios exist. (The transition matrix itself stays in domain.)
  assertEditor(input.actor);
  return persistence.atomic(async () => {
    const current = await persistence.getScenarioReviewStatusColumn(
      input.scenarioId,
      input.scenarioVersion
    );
    if (current === undefined) {
      throw new HistoricalImportServiceError(
        "scenario_not_found",
        `Scenario ${input.scenarioId}@${input.scenarioVersion} was not found`
      );
    }

    // Domain policy (authorization + matrix + terminal states). Throws
    // ReviewPolicyError with a machine-readable code on violation.
    const { noop } = assertReviewTransition(current, input.toStatus, input.actor);

    if (noop) {
      const readiness = await assembleReadiness(persistence, input.scenarioId, input.scenarioVersion);
      return {
        scenarioId: input.scenarioId,
        scenarioVersion: input.scenarioVersion,
        fromStatus: current,
        toStatus: current,
        noop: true,
        transitionId: null,
        readiness
      };
    }

    // Publication requires persisted readiness (derived, never trusted).
    if (input.toStatus === "published") {
      const readiness = await assembleReadiness(persistence, input.scenarioId, input.scenarioVersion);
      if (!readiness.ready) {
        throw new HistoricalImportServiceError(
          "publication_not_ready",
          `Scenario ${input.scenarioId}@${input.scenarioVersion} is not ready for publication`,
          readiness.reasons
        );
      }
    }

    const createdAt = input.nowIso ?? new Date().toISOString();
    const updated = await persistence.setScenarioReviewStatus(
      input.scenarioId,
      input.scenarioVersion,
      input.toStatus,
      createdAt
    );
    if (!updated) {
      throw new HistoricalImportServiceError(
        "scenario_not_found",
        `Scenario ${input.scenarioId}@${input.scenarioVersion} was not found`
      );
    }
    const transitionId = randomUUID();
    await persistence.recordReviewTransition({
      transitionId,
      scenarioId: input.scenarioId,
      scenarioVersion: input.scenarioVersion,
      fromStatus: current,
      toStatus: input.toStatus,
      actorUserId: input.actor.userId,
      reason: input.reason ?? null,
      createdAt
    });

    const readiness = await assembleReadiness(persistence, input.scenarioId, input.scenarioVersion);
    return {
      scenarioId: input.scenarioId,
      scenarioVersion: input.scenarioVersion,
      fromStatus: current,
      toStatus: input.toStatus,
      noop: false,
      transitionId,
      readiness
    };
  });
}

// ---------------------------------------------------------------------------
// Readiness assembly from persisted facts.
// ---------------------------------------------------------------------------

export async function getScenarioReadiness(
  persistence: PersistencePort,
  scenarioId: string,
  version: string
): Promise<ScenarioReadiness> {
  return assembleReadiness(persistence, scenarioId, version);
}
