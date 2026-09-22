import {
  ScenarioPackageSchema,
  ReviewStatusSchema,
  type ScenarioPackage
} from "../../contracts/src/scenario.js";
import {
  HistoricalMarketSnapshotSchema,
  type HistoricalMarketSnapshot
} from "../../contracts/src/provider.js";

import {
  computeSnapshotContentHash,
  stableStringify
} from "./historical-import.js";
import type { ReviewStatus } from "./review-policy.js";

/**
 * Server-side publication-readiness evaluation (Batch 01 — Backend).
 *
 * Readiness is derived from PERSISTED facts only (stored package, stored
 * review-status column, persisted snapshot links, stored snapshots). It is
 * never accepted from a client.
 *
 * Import, review approval, readiness and publication are distinct:
 * - import persists a `draft` scenario + snapshots + links;
 * - review approval moves the status to `validated` via the transition policy;
 * - readiness reports whether all persisted facts satisfy publication;
 * - publication is the `validated → published` transition (blocked unless ready).
 */

export const READINESS_REASON_CODES = [
  "invalid_package",
  "incomplete_validation",
  "missing_public_pre_t0_data",
  "missing_hidden_future_data",
  "missing_snapshot_provenance",
  "missing_snapshot_link",
  "hash_mismatch",
  "unresolved_review_requirement",
  "invalid_state_transition",
  "conflicting_immutable_data",
  "unsupported_provider_data"
] as const;

export type ReadinessReasonCode = (typeof READINESS_REASON_CODES)[number];

export type ReadinessReason = {
  readonly code: ReadinessReasonCode;
  readonly path: string;
  readonly message: string;
};

export type ScenarioReadinessLinkFact = {
  /** ScenarioSource.sourceId covered by this link. */
  readonly sourceId: string;
  /** Claimed snapshot identity from the persisted link row. */
  readonly snapshotContentHash: string;
  /** Stored snapshot, or null when the link dangles (must not happen). */
  readonly snapshot: HistoricalMarketSnapshot | null;
};

export type ScenarioReadinessInput = {
  readonly scenarioId: string;
  readonly version: string;
  /** Raw stored package_json (unknown until validated here). */
  readonly storedPackage: unknown;
  /** Authoritative review-status COLUMN value (not package_json). */
  readonly reviewStatus: string;
  /** Persisted links for this scenario version (may be empty). */
  readonly links: readonly ScenarioReadinessLinkFact[];
  /** Known conflicting-immutable-data markers for this version, if any. */
  readonly knownConflicts?: readonly string[] | undefined;
};

export type ScenarioReadiness = {
  readonly scenarioId: string;
  readonly version: string;
  readonly reviewStatus: string;
  readonly ready: boolean;
  readonly reasons: readonly ReadinessReason[];
};

function reason(code: ReadinessReasonCode, path: string, message: string): ReadinessReason {
  return { code, path, message };
}

function sortReasons(reasons: ReadinessReason[]): readonly ReadinessReason[] {
  return [...reasons].sort((a, b) => {
    if (a.code !== b.code) return a.code < b.code ? -1 : 1;
    if (a.path !== b.path) return a.path < b.path ? -1 : 1;
    return 0;
  });
}

/**
 * Pure readiness evaluation. All inputs must come from the database.
 * `storedPackage` is re-validated here so legacy/corrupt rows fail closed.
 */
export function evaluateScenarioReadiness(input: ScenarioReadinessInput): ScenarioReadiness {
  const reasons: ReadinessReason[] = [];

  // 0. Review-status column must be a known frozen value.
  const statusParse = ReviewStatusSchema.safeParse(input.reviewStatus);
  if (!statusParse.success) {
    reasons.push(reason(
      "invalid_state_transition",
      "reviewStatus",
      `Stored review status ${JSON.stringify(input.reviewStatus)} is not a known frozen value`
    ));
  }
  const reviewStatus: ReviewStatus | null = statusParse.success ? statusParse.data : null;

  // 1. Stored package must parse as a ScenarioPackage.
  const packageParse = ScenarioPackageSchema.safeParse(input.storedPackage);
  if (!packageParse.success) {
    const first = packageParse.error.issues[0];
    const path = first ? `package.${first.path.join(".") || "$"}` : "package";
    reasons.push(reason(
      "invalid_package",
      path,
      `Stored scenario package is invalid: ${first?.message ?? "schema violation"}`
    ));
    // Without a valid package no further data checks are meaningful, but the
    // review requirement is still evaluated so operators see the full picture.
    if (reviewStatus !== "validated" && reviewStatus !== "published") {
      reasons.push(reason(
        "unresolved_review_requirement",
        "reviewStatus",
        `Scenario ${input.scenarioId}@${input.version} requires review approval (current: ${input.reviewStatus})`
      ));
    }
    return finish(input, reasons);
  }
  const scenario: ScenarioPackage = packageParse.data;

  // 2. Point-in-time semantic validation (legacy rows fail closed).
  reasons.push(...validatePersistedPointInTime(scenario));

  // 3. Public pre-t0 data: at least one source observable at t0.
  const decisionTime = Date.parse(scenario.decisionPoint.t0);
  const preT0Sources = scenario.availableSources.filter((source) => {
    const availableTime = Date.parse(source.availableAt);
    const observedTime = Date.parse(source.observedAt);
    const publishedTime = source.publishedAt ? Date.parse(source.publishedAt) : undefined;
    return availableTime <= decisionTime
      && availableTime >= observedTime
      && (publishedTime === undefined || availableTime >= publishedTime);
  });
  if (preT0Sources.length === 0) {
    reasons.push(reason(
      "missing_public_pre_t0_data",
      "availableSources",
      `Scenario ${scenario.scenarioId}@${scenario.version} has no public source observable at t0`
    ));
  }

  // 4. Hidden future segment present and internally consistent.
  const futureStart = Date.parse(scenario.historicalFutureSegment.from);
  const futureEnd = Date.parse(scenario.historicalFutureSegment.to);
  if (
    !(futureStart > decisionTime && futureEnd > futureStart)
    || scenario.historicalFutureSegment.contentHash.length < 8
  ) {
    reasons.push(reason(
      "missing_hidden_future_data",
      "historicalFutureSegment",
      `Scenario ${scenario.scenarioId}@${scenario.version} is missing a valid hidden future segment after t0`
    ));
  }
  if (scenario.futureHash !== scenario.historicalFutureSegment.contentHash) {
    reasons.push(reason(
      "hash_mismatch",
      "futureHash",
      `Scenario ${scenario.scenarioId}@${scenario.version} future hash does not match its future segment`
    ));
  }

  // 5. Snapshot linkage: every scenario version needs links; every source
  //    listed in the package should be covered by at least one link.
  if (input.links.length === 0) {
    reasons.push(reason(
      "missing_snapshot_link",
      "links",
      `Scenario ${scenario.scenarioId}@${scenario.version} has no persisted snapshot links`
    ));
  } else {
    const linkedSources = new Set(input.links.map((link) => link.sourceId));
    for (const source of scenario.availableSources) {
      if (!linkedSources.has(source.sourceId)) {
        reasons.push(reason(
          "missing_snapshot_link",
          `availableSources.${source.sourceId}`,
          `Source ${source.sourceId} has no persisted snapshot link`
        ));
      }
    }
  }

  // 6. Per-link snapshot provenance + hash verification.
  for (const link of input.links) {
    const base = `links.${link.sourceId}`;
    if (!link.snapshot) {
      reasons.push(reason(
        "missing_snapshot_provenance",
        base,
        `Link for source ${link.sourceId} references missing snapshot ${link.snapshotContentHash}`
      ));
      continue;
    }
    const snapshotParse = HistoricalMarketSnapshotSchema.safeParse(link.snapshot);
    if (!snapshotParse.success) {
      reasons.push(reason(
        "missing_snapshot_provenance",
        base,
        `Stored snapshot for source ${link.sourceId} has invalid provenance/shape`
      ));
      continue;
    }
    const snapshot = snapshotParse.data;
    if (snapshot.provider !== "binance") {
      reasons.push(reason(
        "unsupported_provider_data",
        `${base}.provider`,
        `Snapshot for source ${link.sourceId} uses unsupported provider ${snapshot.provider}`
      ));
    }
    if (snapshot.provenance.contentHash !== link.snapshotContentHash) {
      reasons.push(reason(
        "hash_mismatch",
        `${base}.snapshotContentHash`,
        `Link for source ${link.sourceId} claims ${link.snapshotContentHash} but stored snapshot is ${snapshot.provenance.contentHash}`
      ));
    }
    const recomputed = computeSnapshotContentHash(snapshot.candles);
    if (recomputed !== snapshot.provenance.contentHash) {
      reasons.push(reason(
        "hash_mismatch",
        `${base}.provenance.contentHash`,
        `Stored snapshot for source ${link.sourceId} fails content-hash verification`
      ));
    }
  }

  // 7. Known conflicts (detected at import time and persisted in summaries).
  for (const conflict of input.knownConflicts ?? []) {
    reasons.push(reason(
      "conflicting_immutable_data",
      "conflicts",
      conflict
    ));
  }

  // 8. Review requirement: only validated/published pass the publication gate.
  if (reviewStatus !== "validated" && reviewStatus !== "published") {
    reasons.push(reason(
      "unresolved_review_requirement",
      "reviewStatus",
      `Scenario ${scenario.scenarioId}@${scenario.version} requires review approval (current: ${input.reviewStatus})`
    ));
  }

  return finish(input, reasons);
}

function finish(input: ScenarioReadinessInput, reasons: ReadinessReason[]): ScenarioReadiness {
  const sorted = sortReasons(reasons);
  return {
    scenarioId: input.scenarioId,
    version: input.version,
    reviewStatus: input.reviewStatus,
    ready: sorted.length === 0,
    reasons: sorted
  };
}

/** Semantic checks that zod alone cannot express (fail-closed for legacy rows). */
function validatePersistedPointInTime(scenario: ScenarioPackage): ReadinessReason[] {
  const reasons: ReadinessReason[] = [];
  const groups = new Set(scenario.availableSourceGroups);
  if (groups.size !== scenario.availableSourceGroups.length) {
    reasons.push(reason(
      "incomplete_validation",
      "availableSourceGroups",
      `Scenario ${scenario.scenarioId} repeats a Source Group`
    ));
  }
  if (scenario.availableSources.some((source) => !groups.has(source.sourceGroup))) {
    reasons.push(reason(
      "incomplete_validation",
      "availableSources",
      `Scenario ${scenario.scenarioId} exposes a source outside its Source Groups`
    ));
  }
  if (scenario.scenarioLevel <= 5 && groups.size > 3) {
    reasons.push(reason(
      "incomplete_validation",
      "availableSourceGroups",
      `Beginner scenario ${scenario.scenarioId} exceeds three Source Groups`
    ));
  }
  const decisionTime = Date.parse(scenario.decisionPoint.t0);
  scenario.availableSources.forEach((source) => {
    const observedTime = Date.parse(source.observedAt);
    const availableTime = Date.parse(source.availableAt);
    const publishedTime = source.publishedAt ? Date.parse(source.publishedAt) : undefined;
    if (
      availableTime < observedTime
      || (publishedTime !== undefined && availableTime < publishedTime)
      || availableTime > decisionTime
    ) {
      reasons.push(reason(
        "incomplete_validation",
        `availableSources.${source.sourceId}`,
        `Source ${source.sourceId} is unavailable at t0 or post-t0`
      ));
    }
  });
  // Touch stableStringify so bundle boundaries stay explicit (no-op guard
  // against accidental package-shape drift in persisted rows).
  void stableStringify(scenario.scenarioId);
  return reasons;
}
