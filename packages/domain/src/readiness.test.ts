import assert from "node:assert/strict";
import test from "node:test";

import { starterScenario } from "../../content/src/fixtures/starter-scenario.js";
import type { HistoricalMarketSnapshot } from "../../contracts/src/provider.js";
import type { ScenarioPackage } from "../../contracts/src/scenario.js";

import { computeSnapshotContentHash } from "./historical-import.js";
import {
  evaluateScenarioReadiness,
  type ScenarioReadinessInput,
  type ScenarioReadinessLinkFact
} from "./readiness.js";

function makeCandles(baseMs: number, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const openMs = baseMs + i * 3_600_000;
    return {
      openTime: new Date(openMs).toISOString(),
      closeTime: new Date(openMs + 3_600_000 - 1).toISOString(),
      open: "100.5",
      high: "102.9",
      low: "99.1",
      close: "101.7",
      volume: "42.5"
    };
  });
}

function makeSnapshot(asOf = "2024-01-02T11:00:00Z"): HistoricalMarketSnapshot {
  const candles = makeCandles(Date.parse("2024-01-02T08:00:00Z"), 2);
  return {
    provider: "binance",
    symbol: "BTCUSDT",
    interval: "1h",
    asOf,
    candles,
    provenance: {
      sourceReference: "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h",
      observedAt: "2024-01-02T11:00:00Z",
      availableAt: "2024-01-02T11:01:00Z",
      timezone: "UTC",
      reliability: "high",
      contentHash: computeSnapshotContentHash(candles),
      revisionStatus: "original"
    }
  };
}

function makeScenario(overrides: Partial<ScenarioPackage> = {}): ScenarioPackage {
  return { ...starterScenario, scenarioId: "ready-001", version: "1.0.0", ...overrides };
}

function makeLink(sourceId: string, snapshot: HistoricalMarketSnapshot | null): ScenarioReadinessLinkFact {
  return {
    sourceId,
    snapshotContentHash: snapshot?.provenance.contentHash
      ?? "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    snapshot
  };
}

function makeInput(overrides: Partial<ScenarioReadinessInput> = {}): ScenarioReadinessInput {
  const scenario = makeScenario();
  const snapshot = makeSnapshot();
  return {
    scenarioId: scenario.scenarioId,
    version: scenario.version,
    storedPackage: scenario,
    reviewStatus: "validated",
    links: scenario.availableSources.map((source) => makeLink(source.sourceId, snapshot)),
    ...overrides
  };
}

test("fully-satisfied persisted facts report ready with no reasons", () => {
  const readiness = evaluateScenarioReadiness(makeInput());
  assert.equal(readiness.ready, true);
  assert.deepEqual(readiness.reasons, []);
  assert.equal(readiness.scenarioId, "ready-001");
  assert.equal(readiness.reviewStatus, "validated");
});

test("published scenarios with full facts are also ready", () => {
  const readiness = evaluateScenarioReadiness(makeInput({ reviewStatus: "published" }));
  assert.equal(readiness.ready, true);
});

test("import alone never implies readiness (draft is unresolved)", () => {
  for (const status of ["draft", "research", "point_in_time_validation", "review"]) {
    const readiness = evaluateScenarioReadiness(makeInput({ reviewStatus: status }));
    assert.equal(readiness.ready, false);
    assert.ok(readiness.reasons.some((reason) => reason.code === "unresolved_review_requirement"));
  }
});

test("invalid stored packages fail closed with invalid_package", () => {
  const readiness = evaluateScenarioReadiness(makeInput({
    storedPackage: { scenarioId: "broken" },
    reviewStatus: "validated"
  }));
  assert.equal(readiness.ready, false);
  assert.ok(readiness.reasons.some((reason) => reason.code === "invalid_package"));
});

test("point-in-time violations surface as incomplete_validation", () => {
  const scenario = makeScenario();
  const first = scenario.availableSources[0];
  assert.ok(first);
  const readiness = evaluateScenarioReadiness(makeInput({
    storedPackage: {
      ...scenario,
      availableSources: [
        { ...first, availableAt: "2024-03-14T09:00:00Z" },
        ...scenario.availableSources.slice(1)
      ]
    }
  }));
  assert.equal(readiness.ready, false);
  assert.ok(readiness.reasons.some((reason) => reason.code === "incomplete_validation"));
});

test("missing public pre-t0 data is reported", () => {
  const scenario = makeScenario();
  // All sources post-t0: pre-t0 coverage is empty.
  const stored = {
    ...scenario,
    decisionPoint: { t0: "2024-01-01T00:00:00Z", timezone: "UTC" }
  };
  const readiness = evaluateScenarioReadiness(makeInput({ storedPackage: stored }));
  assert.equal(readiness.ready, false);
  assert.ok(readiness.reasons.some((reason) => reason.code === "missing_public_pre_t0_data"));
});

test("missing hidden future data is reported", () => {
  const scenario = makeScenario();
  const readiness = evaluateScenarioReadiness(makeInput({
    storedPackage: {
      ...scenario,
      historicalFutureSegment: {
        from: "2024-01-02T10:00:00Z",
        to: "2024-01-02T18:00:00Z",
        contentHash: scenario.historicalFutureSegment.contentHash
      }
    }
  }));
  assert.equal(readiness.ready, false);
  assert.ok(readiness.reasons.some((reason) => reason.code === "missing_hidden_future_data"));
});

test("future-hash mismatch is a hash_mismatch", () => {
  const readiness = evaluateScenarioReadiness(makeInput({
    storedPackage: makeScenario({ futureHash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" })
  }));
  assert.equal(readiness.ready, false);
  assert.ok(readiness.reasons.some((reason) => reason.code === "hash_mismatch"));
});

test("missing snapshot links block readiness", () => {
  const readiness = evaluateScenarioReadiness(makeInput({ links: [] }));
  assert.equal(readiness.ready, false);
  assert.ok(readiness.reasons.some((reason) => reason.code === "missing_snapshot_link"));
});

test("uncovered sources block readiness even when other links exist", () => {
  const input = makeInput();
  const readiness = evaluateScenarioReadiness(makeInput({
    links: input.links.slice(0, 1)
  }));
  assert.equal(readiness.ready, false);
  assert.ok(readiness.reasons.some((reason) =>
    reason.code === "missing_snapshot_link" && reason.path.includes("availableSources")
  ));
});

test("dangling links report missing snapshot provenance", () => {
  const input = makeInput();
  const first = input.links[0];
  assert.ok(first);
  const readiness = evaluateScenarioReadiness(makeInput({
    links: [{ ...first, snapshot: null }, ...input.links.slice(1)]
  }));
  assert.equal(readiness.ready, false);
  assert.ok(readiness.reasons.some((reason) => reason.code === "missing_snapshot_provenance"));
});

test("link/snapshot hash divergence is a hash_mismatch", () => {
  const input = makeInput();
  const first = input.links[0];
  assert.ok(first);
  const readiness = evaluateScenarioReadiness(makeInput({
    links: [{
      ...first,
      snapshotContentHash: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
    }, ...input.links.slice(1)]
  }));
  assert.equal(readiness.ready, false);
  assert.ok(readiness.reasons.some((reason) => reason.code === "hash_mismatch"));
});

test("tampered snapshot content fails hash verification", () => {
  const input = makeInput();
  const first = input.links[0];
  assert.ok(first?.snapshot);
  const tampered: HistoricalMarketSnapshot = {
    ...first.snapshot,
    candles: [{ ...first.snapshot.candles[0]!, close: "999.9" }, ...first.snapshot.candles.slice(1)]
  };
  const readiness = evaluateScenarioReadiness(makeInput({
    links: [{ ...first, snapshot: tampered }, ...input.links.slice(1)]
  }));
  assert.equal(readiness.ready, false);
  assert.ok(readiness.reasons.some((reason) => reason.code === "hash_mismatch"));
});

test("unsupported providers are reported without crashing", () => {
  const input = makeInput();
  const first = input.links[0];
  assert.ok(first?.snapshot);
  const foreign = { ...first.snapshot, provider: "kraken" };
  const readiness = evaluateScenarioReadiness(makeInput({
    links: [{ ...first, snapshot: foreign as unknown as HistoricalMarketSnapshot }, ...input.links.slice(1)]
  }));
  assert.equal(readiness.ready, false);
  // Shape-invalid snapshots surface as provenance failures (fail closed).
  assert.ok(readiness.reasons.some((reason) =>
    reason.code === "missing_snapshot_provenance" || reason.code === "unsupported_provider_data"
  ));
});

test("known conflicts block readiness with machine-readable reasons", () => {
  const readiness = evaluateScenarioReadiness(makeInput({
    knownConflicts: ["scenario ready-001@1.0.0 already exists with different content"]
  }));
  assert.equal(readiness.ready, false);
  assert.ok(readiness.reasons.some((reason) => reason.code === "conflicting_immutable_data"));
});

test("unknown stored review statuses fail closed", () => {
  const readiness = evaluateScenarioReadiness(makeInput({ reviewStatus: "shipped" }));
  assert.equal(readiness.ready, false);
  assert.ok(readiness.reasons.some((reason) => reason.code === "invalid_state_transition"));
  assert.ok(readiness.reasons.some((reason) => reason.code === "unresolved_review_requirement"));
});

test("readiness reasons are deterministically ordered", () => {
  const input = makeInput({ links: [], reviewStatus: "draft" });
  const first = evaluateScenarioReadiness(input);
  const second = evaluateScenarioReadiness(structuredClone(input));
  assert.deepEqual(first, second);
  const keys = first.reasons.map((reason) => `${reason.code}:${reason.path}`);
  assert.deepEqual(keys, [...keys].sort());
});

test("readiness never reads client-supplied status from the package", () => {
  // Stored package claims published, but the authoritative COLUMN says draft.
  const readiness = evaluateScenarioReadiness(makeInput({
    storedPackage: makeScenario({ reviewStatus: "published" }),
    reviewStatus: "draft"
  }));
  assert.equal(readiness.ready, false);
  assert.equal(readiness.reviewStatus, "draft");
  assert.ok(readiness.reasons.some((reason) => reason.code === "unresolved_review_requirement"));
});
