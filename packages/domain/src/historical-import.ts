import { createHash } from "node:crypto";
import { z } from "zod";

import {
  ScenarioPackageSchema,
  type ScenarioPackage,
  type SourceGroup
} from "../../contracts/src/scenario.js";
import {
  HistoricalMarketSnapshotSchema,
  type HistoricalCandle,
  type HistoricalMarketSnapshot
} from "../../contracts/src/provider.js";

/**
 * Historical scenario ingestion boundary (Batch 01 — Backend).
 *
 * This module owns parsing, normalization, validation and reporting for
 * versioned historical scenario imports. It is pure: no database, no
 * providers, no HTTP. Persistence lives in `packages/db`, orchestration in
 * `apps/api-server`.
 *
 * Stage separation (each stage is independently testable):
 *
 *   raw input
 *     → parseHistoricalImportInput      (stage 1: parsing)
 *     → normalizeHistoricalImportEnvelope (stage 2: normalization)
 *     → validateHistoricalImportEnvelope  (stage 3: validation)
 *     → persistence (packages/db, transactional)
 *     → deterministic report (stage 5: reporting)
 *
 * The import never trusts client-supplied publication state: every scenario
 * is persisted with `reviewStatus: "draft"` regardless of the input value.
 * The requested value is preserved in the report for audit.
 */

// ---------------------------------------------------------------------------
// Deterministic helpers (stable across processes and key order).
// ---------------------------------------------------------------------------

/** Deterministic JSON with recursively sorted object keys. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const body = keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",");
  return `{${body}}`;
}

/**
 * Normalized snapshot content hash.
 *
 * MUST match the provider adapter (`packages/providers/src/binance.ts`):
 * `sha256:<hex(sha256(JSON.stringify(candles)))>` where candles are the
 * normalized `HistoricalCandle[]` in stored order.
 */
export function computeSnapshotContentHash(candles: readonly HistoricalCandle[]): string {
  const digest = createHash("sha256")
    .update(JSON.stringify([...candles]))
    .digest("hex");
  return `sha256:${digest}`;
}

/** Compare non-negative decimal strings without floating point. */
export function compareDecimalStrings(a: string, b: string): number {
  const [aInt = "0", aFrac = ""] = a.split(".");
  const [bInt = "0", bFrac = ""] = b.split(".");
  const aIntNorm = aInt.replace(/^0+(?=\d)/, "");
  const bIntNorm = bInt.replace(/^0+(?=\d)/, "");
  if (aIntNorm.length !== bIntNorm.length) {
    return aIntNorm.length < bIntNorm.length ? -1 : 1;
  }
  if (aIntNorm !== bIntNorm) {
    return aIntNorm < bIntNorm ? -1 : 1;
  }
  const width = Math.max(aFrac.length, bFrac.length);
  const aPad = aFrac.padEnd(width, "0");
  const bPad = bFrac.padEnd(width, "0");
  if (aPad === bPad) return 0;
  return aPad < bPad ? -1 : 1;
}

// ---------------------------------------------------------------------------
// Import envelope model (uses the frozen contract model, no second package).
// ---------------------------------------------------------------------------

export const HISTORICAL_IMPORT_FORMAT_VERSION = "1.0" as const;

/** Defensive bounds so a single import cannot exhaust memory/time. */
export const HISTORICAL_IMPORT_LIMITS = {
  maxScenarios: 20,
  maxSnapshots: 100,
  maxLinks: 500,
  maxLicensingEntries: 100,
  maxCaptureEntries: 100
} as const;

const Sha256Hash = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const IsoDate = z.string().datetime({ offset: true });

export const HistoricalImportLinkRoleSchema = z.enum(["source", "public", "future"]);

export const HistoricalImportLinkSchema = z.object({
  scenarioId: z.string().min(1).max(200),
  scenarioVersion: z.string().min(1).max(50),
  /** ScenarioSource.sourceId within the referenced scenario package. */
  sourceId: z.string().min(1).max(200),
  /** Snapshot identity: HistoricalMarketSnapshot.provenance.contentHash. */
  snapshotContentHash: Sha256Hash,
  linkRole: HistoricalImportLinkRoleSchema.default("source")
}).strict();

export const SnapshotLicensingSchema = z.object({
  snapshotContentHash: Sha256Hash,
  license: z.string().min(1).max(200),
  usage: z.string().min(1).max(500).optional(),
  attribution: z.string().min(1).max(500).optional(),
  expiresAt: IsoDate.optional()
}).strict();

export const SnapshotCaptureSchema = z.object({
  snapshotContentHash: Sha256Hash,
  retrievedAt: IsoDate,
  captureMethod: z.string().min(1).max(100),
  sourceUrl: z.string().url().max(2000).optional(),
  notes: z.string().max(1000).optional()
}).strict();

export const HistoricalImportMetadataSchema = z.object({
  requestedBy: z.string().min(1).max(200).optional(),
  reason: z.string().min(1).max(1000).optional()
}).strict();

export const HistoricalImportEnvelopeSchema = z.object({
  formatVersion: z.literal(HISTORICAL_IMPORT_FORMAT_VERSION),
  scenarios: z.array(ScenarioPackageSchema).min(1).max(HISTORICAL_IMPORT_LIMITS.maxScenarios),
  snapshots: z.array(HistoricalMarketSnapshotSchema).min(1).max(HISTORICAL_IMPORT_LIMITS.maxSnapshots),
  links: z.array(HistoricalImportLinkSchema).min(1).max(HISTORICAL_IMPORT_LIMITS.maxLinks),
  licensing: z.array(SnapshotLicensingSchema).max(HISTORICAL_IMPORT_LIMITS.maxLicensingEntries).optional(),
  capture: z.array(SnapshotCaptureSchema).max(HISTORICAL_IMPORT_LIMITS.maxCaptureEntries).optional(),
  importMetadata: HistoricalImportMetadataSchema.optional()
}).strict();

export type HistoricalImportLink = z.infer<typeof HistoricalImportLinkSchema>;
export type SnapshotLicensing = z.infer<typeof SnapshotLicensingSchema>;
export type SnapshotCapture = z.infer<typeof SnapshotCaptureSchema>;
export type HistoricalImportEnvelope = z.infer<typeof HistoricalImportEnvelopeSchema>;

/** Normalized envelope: deterministically ordered, publication state forced. */
export type NormalizedHistoricalImportEnvelope = {
  readonly formatVersion: typeof HISTORICAL_IMPORT_FORMAT_VERSION;
  readonly scenarios: readonly ScenarioPackage[];
  readonly snapshots: readonly HistoricalMarketSnapshot[];
  readonly links: readonly HistoricalImportLink[];
  readonly licensing: readonly SnapshotLicensing[];
  readonly capture: readonly SnapshotCapture[];
  /** Requested review statuses by `scenarioId@version`, preserved for audit. */
  readonly requestedReviewStatuses: Readonly<Record<string, string>>;
  readonly importHash: string;
};

// ---------------------------------------------------------------------------
// Issues (machine-readable, actionable paths + reasons).
// ---------------------------------------------------------------------------

export const HISTORICAL_IMPORT_ISSUE_CODES = [
  "invalid_json",
  "unsupported_format",
  "schema_violation",
  "duplicate_scenario",
  "duplicate_snapshot",
  "conflicting_snapshot_in_envelope",
  "duplicate_link",
  "duplicate_licensing",
  "duplicate_capture",
  "unknown_scenario",
  "unknown_source",
  "unknown_snapshot",
  "missing_link",
  "hash_mismatch",
  "invalid_point_in_time",
  "post_t0_source",
  "invalid_future_range",
  "future_hash_mismatch",
  "duplicate_source_group",
  "source_group_mismatch",
  "beginner_source_group_overflow",
  "unsupported_provider",
  "invalid_candle_order",
  "duplicate_candle",
  "invalid_candle_range",
  "invalid_ohlc",
  "snapshot_limit_exceeded"
] as const;

export type HistoricalImportIssueCode = (typeof HISTORICAL_IMPORT_ISSUE_CODES)[number];

export type HistoricalImportIssue = {
  readonly code: HistoricalImportIssueCode;
  /** JSON-path style location, e.g. `snapshots[2].candles[5].high`. */
  readonly path: string;
  readonly message: string;
  readonly details?: Record<string, string> | undefined;
};

export function scenarioKey(scenarioId: string, version: string): string {
  return `${scenarioId}@${version}`;
}

// ---------------------------------------------------------------------------
// Stage 1: parsing.
// ---------------------------------------------------------------------------

export class HistoricalImportParseError extends Error {
  public readonly issues: readonly HistoricalImportIssue[];

  public constructor(issues: readonly HistoricalImportIssue[]) {
    super(issues[0]?.message ?? "Historical import input is invalid");
    this.name = "HistoricalImportParseError";
    this.issues = issues;
  }
}

function zodIssuesToImportIssues(error: z.ZodError, root: string): HistoricalImportIssue[] {
  return error.issues.map((issue) => {
    const segments = issue.path.map((segment) =>
      typeof segment === "number" ? `[${segment}]` : `.${String(segment)}`
    );
    const path = `${root}${segments.join("").replace(/^\./, "")}`;
    return {
      code: "schema_violation",
      path: path.length > 0 ? path : root,
      message: `${path.length > 0 ? path : root}: ${issue.message}`
    } satisfies HistoricalImportIssue;
  });
}

/**
 * Parse raw input (object, JSON string, or Buffer) into an untrusted envelope.
 * Throws HistoricalImportParseError with actionable issues on failure.
 */
export function parseHistoricalImportInput(input: unknown): HistoricalImportEnvelope {
  let decoded: unknown = input;
  if (typeof input === "string" || Buffer.isBuffer(input)) {
    const text = Buffer.isBuffer(input) ? input.toString("utf8") : input;
    try {
      decoded = JSON.parse(text) as unknown;
    } catch {
      throw new HistoricalImportParseError([{
        code: "invalid_json",
        path: "$",
        message: "$: Historical import input is not valid JSON"
      }]);
    }
  }

  if (typeof decoded !== "object" || decoded === null || Array.isArray(decoded)) {
    throw new HistoricalImportParseError([{
      code: "schema_violation",
      path: "$",
      message: "$: Historical import envelope must be an object"
    }]);
  }

  const formatVersion = (decoded as Record<string, unknown>).formatVersion;
  if (formatVersion !== HISTORICAL_IMPORT_FORMAT_VERSION) {
    throw new HistoricalImportParseError([{
      code: "unsupported_format",
      path: "formatVersion",
      message: `formatVersion: unsupported historical import format ${JSON.stringify(formatVersion)}, expected "${HISTORICAL_IMPORT_FORMAT_VERSION}"`
    }]);
  }

  const parsed = HistoricalImportEnvelopeSchema.safeParse(decoded);
  if (!parsed.success) {
    throw new HistoricalImportParseError(zodIssuesToImportIssues(parsed.error, ""));
  }
  return parsed.data;
}

// ---------------------------------------------------------------------------
// Stage 2: normalization (deterministic ordering + forced draft).
// ---------------------------------------------------------------------------

function compareScenarios(a: ScenarioPackage, b: ScenarioPackage): number {
  if (a.scenarioId !== b.scenarioId) return a.scenarioId < b.scenarioId ? -1 : 1;
  if (a.version !== b.version) return a.version < b.version ? -1 : 1;
  return 0;
}

function compareSnapshots(a: HistoricalMarketSnapshot, b: HistoricalMarketSnapshot): number {
  if (a.provenance.contentHash !== b.provenance.contentHash) {
    return a.provenance.contentHash < b.provenance.contentHash ? -1 : 1;
  }
  return 0;
}

function compareLinks(a: HistoricalImportLink, b: HistoricalImportLink): number {
  for (const key of ["scenarioId", "scenarioVersion", "sourceId", "snapshotContentHash"] as const) {
    if (a[key] !== b[key]) return a[key] < b[key] ? -1 : 1;
  }
  return 0;
}

/**
 * Idempotency identity: sha256 over the canonical content that affects
 * persisted state. Excludes `importMetadata` (requestor/reason) and the
 * client-supplied `reviewStatus` (forced to draft), so safe retries with
 * different metadata or different requested statuses share one identity.
 */
export function computeHistoricalImportHash(input: {
  readonly scenarios: readonly ScenarioPackage[];
  readonly snapshots: readonly HistoricalMarketSnapshot[];
  readonly links: readonly HistoricalImportLink[];
  readonly licensing: readonly SnapshotLicensing[];
  readonly capture: readonly SnapshotCapture[];
}): string {
  const canonical = stableStringify({
    formatVersion: HISTORICAL_IMPORT_FORMAT_VERSION,
    scenarios: [...input.scenarios]
      .map((scenario): ScenarioPackage => ({ ...scenario, reviewStatus: "draft" }))
      .sort(compareScenarios),
    snapshots: [...input.snapshots].sort(compareSnapshots),
    links: [...input.links].sort(compareLinks),
    licensing: [...input.licensing].sort((a, b) =>
      a.snapshotContentHash < b.snapshotContentHash ? -1 : a.snapshotContentHash > b.snapshotContentHash ? 1 : 0
    ),
    capture: [...input.capture].sort((a, b) =>
      a.snapshotContentHash < b.snapshotContentHash ? -1 : a.snapshotContentHash > b.snapshotContentHash ? 1 : 0
    )
  });
  return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}

export function normalizeHistoricalImportEnvelope(
  envelope: HistoricalImportEnvelope
): NormalizedHistoricalImportEnvelope {
  const scenarios = [...envelope.scenarios].sort(compareScenarios).map((scenario) => ({
    ...scenario,
    reviewStatus: "draft" as const
  }));
  const snapshots = [...envelope.snapshots].sort(compareSnapshots);
  const links = [...envelope.links].sort(compareLinks);
  const licensing = [...(envelope.licensing ?? [])].sort((a, b) =>
    a.snapshotContentHash < b.snapshotContentHash ? -1 : a.snapshotContentHash > b.snapshotContentHash ? 1 : 0
  );
  const capture = [...(envelope.capture ?? [])].sort((a, b) =>
    a.snapshotContentHash < b.snapshotContentHash ? -1 : a.snapshotContentHash > b.snapshotContentHash ? 1 : 0
  );

  const requestedReviewStatuses: Record<string, string> = {};
  for (const scenario of envelope.scenarios) {
    requestedReviewStatuses[scenarioKey(scenario.scenarioId, scenario.version)] = scenario.reviewStatus;
  }

  const importHash = computeHistoricalImportHash({ scenarios, snapshots, links, licensing, capture });

  return {
    formatVersion: HISTORICAL_IMPORT_FORMAT_VERSION,
    scenarios,
    snapshots,
    links,
    licensing,
    capture,
    requestedReviewStatuses,
    importHash
  };
}

// ---------------------------------------------------------------------------
// Stage 3: validation (structural + cross-consistency, no persistence).
// ---------------------------------------------------------------------------

export type HistoricalImportValidation = {
  readonly valid: boolean;
  readonly issues: readonly HistoricalImportIssue[];
  readonly envelope: NormalizedHistoricalImportEnvelope;
};

function validateScenarioPointInTime(
  scenario: ScenarioPackage,
  index: number
): HistoricalImportIssue[] {
  const issues: HistoricalImportIssue[] = [];
  const base = `scenarios[${index}]`;
  const groups = new Set<SourceGroup>(scenario.availableSourceGroups);

  if (groups.size !== scenario.availableSourceGroups.length) {
    issues.push({
      code: "duplicate_source_group",
      path: `${base}.availableSourceGroups`,
      message: `${base}.availableSourceGroups: Scenario ${scenario.scenarioId} repeats a Source Group`
    });
  }

  if (scenario.availableSources.some((source) => !groups.has(source.sourceGroup))) {
    issues.push({
      code: "source_group_mismatch",
      path: `${base}.availableSources`,
      message: `${base}.availableSources: Scenario ${scenario.scenarioId} exposes a source outside its Source Groups`
    });
  }

  if (scenario.scenarioLevel <= 5 && groups.size > 3) {
    issues.push({
      code: "beginner_source_group_overflow",
      path: `${base}.availableSourceGroups`,
      message: `${base}.availableSourceGroups: Beginner scenario ${scenario.scenarioId} exceeds three Source Groups`
    });
  }

  const decisionTime = Date.parse(scenario.decisionPoint.t0);
  scenario.availableSources.forEach((source, sourceIndex) => {
    const observedTime = Date.parse(source.observedAt);
    const availableTime = Date.parse(source.availableAt);
    const publishedTime = source.publishedAt ? Date.parse(source.publishedAt) : undefined;
    if (
      availableTime < observedTime
      || (publishedTime !== undefined && availableTime < publishedTime)
      || availableTime > decisionTime
    ) {
      issues.push({
        code: "post_t0_source",
        path: `${base}.availableSources[${sourceIndex}].availableAt`,
        message: `${base}.availableSources[${sourceIndex}]: source ${source.sourceId} is unavailable at t0 or post-t0`
      });
    }
  });

  const futureStart = Date.parse(scenario.historicalFutureSegment.from);
  const futureEnd = Date.parse(scenario.historicalFutureSegment.to);
  if (futureStart <= decisionTime || futureEnd <= futureStart) {
    issues.push({
      code: "invalid_future_range",
      path: `${base}.historicalFutureSegment`,
      message: `${base}.historicalFutureSegment: Scenario ${scenario.scenarioId} has an invalid historical future range`
    });
  }

  if (scenario.futureHash !== scenario.historicalFutureSegment.contentHash) {
    issues.push({
      code: "future_hash_mismatch",
      path: `${base}.futureHash`,
      message: `${base}.futureHash: Scenario ${scenario.scenarioId} future hash does not match its future segment`
    });
  }

  return issues;
}

function validateSnapshotSemantics(
  snapshot: HistoricalMarketSnapshot,
  index: number
): HistoricalImportIssue[] {
  const issues: HistoricalImportIssue[] = [];
  const base = `snapshots[${index}]`;

  if (snapshot.provider !== "binance") {
    issues.push({
      code: "unsupported_provider",
      path: `${base}.provider`,
      message: `${base}.provider: unsupported provider ${(snapshot as { provider: string }).provider}, expected "binance"`
    });
    return issues;
  }

  if (snapshot.candles.length > 1000) {
    issues.push({
      code: "snapshot_limit_exceeded",
      path: `${base}.candles`,
      message: `${base}.candles: snapshot exceeds 1000 candles`
    });
  }

  const asOfMs = Date.parse(snapshot.asOf);
  let previousOpenMs = -1;
  const seenOpen = new Set<number>();
  snapshot.candles.forEach((candle, candleIndex) => {
    const candlePath = `${base}.candles[${candleIndex}]`;
    const openMs = Date.parse(candle.openTime);
    const closeMs = Date.parse(candle.closeTime);
    if (!Number.isSafeInteger(openMs) || !Number.isSafeInteger(closeMs)) {
      issues.push({
        code: "invalid_candle_range",
        path: candlePath,
        message: `${candlePath}: candle timestamps must be valid ISO dates`
      });
      return;
    }
    if (closeMs <= openMs) {
      issues.push({
        code: "invalid_candle_range",
        path: `${candlePath}.closeTime`,
        message: `${candlePath}: candle closeTime must be after openTime`
      });
    }
    if (closeMs > asOfMs) {
      issues.push({
        code: "invalid_candle_range",
        path: `${candlePath}.closeTime`,
        message: `${candlePath}: candle closeTime is after snapshot asOf (future leak)`
      });
    }
    if (seenOpen.has(openMs)) {
      issues.push({
        code: "duplicate_candle",
        path: `${candlePath}.openTime`,
        message: `${candlePath}: duplicate candle openTime ${candle.openTime}`
      });
    }
    seenOpen.add(openMs);
    if (openMs <= previousOpenMs) {
      issues.push({
        code: "invalid_candle_order",
        path: `${candlePath}.openTime`,
        message: `${candlePath}: candles must be strictly increasing by openTime`
      });
    }
    previousOpenMs = openMs;

    // OHLC consistency (decimal-exact, no floats).
    const { open, high, low, close } = candle;
    if (
      compareDecimalStrings(high, open) < 0
      || compareDecimalStrings(high, close) < 0
      || compareDecimalStrings(high, low) < 0
      || compareDecimalStrings(low, open) > 0
      || compareDecimalStrings(low, close) > 0
    ) {
      issues.push({
        code: "invalid_ohlc",
        path: candlePath,
        message: `${candlePath}: OHLC values are inconsistent (high must cover open/close/low; low must be below open/close)`
      });
    }
  });

  const recomputed = computeSnapshotContentHash(snapshot.candles);
  if (recomputed !== snapshot.provenance.contentHash) {
    issues.push({
      code: "hash_mismatch",
      path: `${base}.provenance.contentHash`,
      message: `${base}.provenance.contentHash: snapshot content hash does not match normalized candles`
    });
  }

  return issues;
}

export function validateHistoricalImportEnvelope(
  envelope: NormalizedHistoricalImportEnvelope
): HistoricalImportValidation {
  const issues: HistoricalImportIssue[] = [];

  // Duplicate scenarios by stable identity (scenarioId, version).
  const seenScenarios = new Map<string, number>();
  envelope.scenarios.forEach((scenario, index) => {
    const key = scenarioKey(scenario.scenarioId, scenario.version);
    const first = seenScenarios.get(key);
    if (first !== undefined) {
      issues.push({
        code: "duplicate_scenario",
        path: `scenarios[${index}]`,
        message: `scenarios[${index}]: duplicate scenario ${key} (first at scenarios[${first}])`
      });
    } else {
      seenScenarios.set(key, index);
    }
    issues.push(...validateScenarioPointInTime(scenario, index));
  });

  // Duplicate snapshots by content hash; same hash + different content is a
  // conflict even within one envelope.
  const seenSnapshots = new Map<string, { index: number; canonical: string }>();
  envelope.snapshots.forEach((snapshot, index) => {
    const hash = snapshot.provenance.contentHash;
    const canonical = stableStringify(snapshot);
    const first = seenSnapshots.get(hash);
    if (first !== undefined) {
      if (first.canonical === canonical) {
        issues.push({
          code: "duplicate_snapshot",
          path: `snapshots[${index}]`,
          message: `snapshots[${index}]: duplicate snapshot ${hash} (first at snapshots[${first.index}])`
        });
      } else {
        issues.push({
          code: "conflicting_snapshot_in_envelope",
          path: `snapshots[${index}]`,
          message: `snapshots[${index}]: conflicting content for snapshot identity ${hash} (first at snapshots[${first.index}])`
        });
      }
    } else {
      seenSnapshots.set(hash, { index, canonical });
    }
    issues.push(...validateSnapshotSemantics(snapshot, index));
  });

  const scenarioByKey = new Map<string, ScenarioPackage>();
  for (const scenario of envelope.scenarios) {
    scenarioByKey.set(scenarioKey(scenario.scenarioId, scenario.version), scenario);
  }
  const snapshotHashes = new Set(envelope.snapshots.map((s) => s.provenance.contentHash));

  // Links: duplicates, dangling references, per-scenario coverage.
  const seenLinks = new Set<string>();
  const linkedScenarios = new Set<string>();
  envelope.links.forEach((link, index) => {
    const base = `links[${index}]`;
    const linkKey = `${link.scenarioId}@${link.scenarioVersion}#${link.sourceId}#${link.snapshotContentHash}`;
    if (seenLinks.has(linkKey)) {
      issues.push({
        code: "duplicate_link",
        path: base,
        message: `${base}: duplicate scenario-to-snapshot link`
      });
    } else {
      seenLinks.add(linkKey);
    }

    const scenario = scenarioByKey.get(scenarioKey(link.scenarioId, link.scenarioVersion));
    if (!scenario) {
      issues.push({
        code: "unknown_scenario",
        path: `${base}.scenarioId`,
        message: `${base}: link references unknown scenario ${link.scenarioId}@${link.scenarioVersion}`
      });
    } else {
      linkedScenarios.add(scenarioKey(link.scenarioId, link.scenarioVersion));
      if (!scenario.availableSources.some((source) => source.sourceId === link.sourceId)) {
        issues.push({
          code: "unknown_source",
          path: `${base}.sourceId`,
          message: `${base}: link references unknown source ${link.sourceId} in scenario ${link.scenarioId}@${link.scenarioVersion}`
        });
      }
    }

    if (!snapshotHashes.has(link.snapshotContentHash)) {
      issues.push({
        code: "unknown_snapshot",
        path: `${base}.snapshotContentHash`,
        message: `${base}: link references unknown snapshot ${link.snapshotContentHash}`
      });
    }
  });

  envelope.scenarios.forEach((scenario, index) => {
    if (!linkedScenarios.has(scenarioKey(scenario.scenarioId, scenario.version))) {
      issues.push({
        code: "missing_link",
        path: `scenarios[${index}]`,
        message: `scenarios[${index}]: scenario ${scenario.scenarioId}@${scenario.version} has no snapshot link`
      });
    }
  });

  // Licensing / capture: duplicates and dangling references.
  const seenLicensing = new Set<string>();
  envelope.licensing.forEach((entry, index) => {
    if (seenLicensing.has(entry.snapshotContentHash)) {
      issues.push({
        code: "duplicate_licensing",
        path: `licensing[${index}]`,
        message: `licensing[${index}]: duplicate licensing entry for ${entry.snapshotContentHash}`
      });
    } else {
      seenLicensing.add(entry.snapshotContentHash);
    }
    if (!snapshotHashes.has(entry.snapshotContentHash)) {
      issues.push({
        code: "unknown_snapshot",
        path: `licensing[${index}].snapshotContentHash`,
        message: `licensing[${index}]: licensing references unknown snapshot ${entry.snapshotContentHash}`
      });
    }
  });

  const seenCapture = new Set<string>();
  envelope.capture.forEach((entry, index) => {
    if (seenCapture.has(entry.snapshotContentHash)) {
      issues.push({
        code: "duplicate_capture",
        path: `capture[${index}]`,
        message: `capture[${index}]: duplicate capture entry for ${entry.snapshotContentHash}`
      });
    } else {
      seenCapture.add(entry.snapshotContentHash);
    }
    if (!snapshotHashes.has(entry.snapshotContentHash)) {
      issues.push({
        code: "unknown_snapshot",
        path: `capture[${index}].snapshotContentHash`,
        message: `capture[${index}]: capture references unknown snapshot ${entry.snapshotContentHash}`
      });
    }
  });

  const sorted = [...issues].sort((a, b) => {
    if (a.path !== b.path) return a.path < b.path ? -1 : 1;
    if (a.code !== b.code) return a.code < b.code ? -1 : 1;
    return 0;
  });

  return { valid: sorted.length === 0, issues: sorted, envelope };
}

/**
 * Full boundary analysis: parse → normalize → validate.
 * Returns issues (never throws) except for unparseable input, which throws
 * HistoricalImportParseError so callers can map it to a 400/422 deterministically.
 */
export function analyzeHistoricalImportInput(input: unknown): HistoricalImportValidation {
  const parsed = parseHistoricalImportInput(input);
  const normalized = normalizeHistoricalImportEnvelope(parsed);
  return validateHistoricalImportEnvelope(normalized);
}

// ---------------------------------------------------------------------------
// Content-equality helpers for idempotency (reviewStatus excluded).
// ---------------------------------------------------------------------------

/** Scenario content identity ignores reviewStatus (forced to draft). */
export function scenarioContentEquals(a: ScenarioPackage, b: ScenarioPackage): boolean {
  const { reviewStatus: _a, ...aRest } = a;
  const { reviewStatus: _b, ...bRest } = b;
  return stableStringify(aRest) === stableStringify(bRest);
}

export function snapshotContentEquals(a: HistoricalMarketSnapshot, b: HistoricalMarketSnapshot): boolean {
  return stableStringify(a) === stableStringify(b);
}
