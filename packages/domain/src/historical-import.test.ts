import assert from "node:assert/strict";
import test from "node:test";

import { starterScenario } from "../../content/src/fixtures/starter-scenario.js";
import { coreScenario } from "../../content/src/fixtures/core-scenario.js";
import type { HistoricalMarketSnapshot } from "../../contracts/src/provider.js";
import type { ScenarioPackage } from "../../contracts/src/scenario.js";

import {
  analyzeHistoricalImportInput,
  compareDecimalStrings,
  computeHistoricalImportHash,
  computeSnapshotContentHash,
  HistoricalImportParseError,
  normalizeHistoricalImportEnvelope,
  parseHistoricalImportInput,
  scenarioContentEquals,
  snapshotContentEquals,
  stableStringify,
  validateHistoricalImportEnvelope,
  type HistoricalImportEnvelope
} from "./historical-import.js";

// ---------------------------------------------------------------------------
// Fixture builders (deterministic, no external data).
// ---------------------------------------------------------------------------

function makeCandles(baseMs: number, count: number, stepMs = 3_600_000) {
  return Array.from({ length: count }, (_, i) => {
    const openMs = baseMs + i * stepMs;
    const closeMs = openMs + stepMs - 1;
    const drift = (i % 5).toString();
    return {
      openTime: new Date(openMs).toISOString(),
      closeTime: new Date(closeMs).toISOString(),
      open: `10${drift}.5`,
      high: `10${drift}.9`,
      low: `10${drift}.1`,
      close: `10${drift}.7`,
      volume: `${100 + i}.25`
    };
  });
}

export function makeSnapshot(overrides: {
  symbol?: string;
  interval?: string;
  asOf?: string;
  candles?: ReturnType<typeof makeCandles>;
  contentHash?: string | undefined;
} = {}): HistoricalMarketSnapshot {
  const candles = overrides.candles ?? makeCandles(Date.parse("2024-01-02T08:00:00Z"), 2);
  const contentHash = overrides.contentHash ?? computeSnapshotContentHash(candles);
  return {
    provider: "binance",
    symbol: overrides.symbol ?? "BTCUSDT",
    interval: overrides.interval ?? "1h",
    asOf: overrides.asOf ?? "2024-01-02T11:00:00Z",
    candles,
    provenance: {
      sourceReference: "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h",
      observedAt: "2024-01-02T11:00:00Z",
      availableAt: "2024-01-02T11:01:00Z",
      timezone: "UTC",
      reliability: "high",
      contentHash,
      revisionStatus: "original"
    }
  };
}

function makeScenario(overrides: Partial<ScenarioPackage> = {}): ScenarioPackage {
  return {
    ...starterScenario,
    scenarioId: "hist-import-001",
    version: "1.0.0",
    ...overrides
  };
}

export function makeEnvelope(overrides: {
  scenarios?: ScenarioPackage[] | undefined;
  snapshots?: HistoricalMarketSnapshot[] | undefined;
  links?: HistoricalImportEnvelope["links"] | undefined;
} = {}): HistoricalImportEnvelope {
  const scenarios = overrides.scenarios ?? [makeScenario({ reviewStatus: "review" })];
  const snapshots = overrides.snapshots ?? [makeSnapshot(), makeSnapshot({
    candles: makeCandles(Date.parse("2024-01-02T06:00:00Z"), 1)
  })];
  const links = overrides.links ?? scenarios.flatMap((scenario) =>
    scenario.availableSources.map((source, i) => ({
      scenarioId: scenario.scenarioId,
      scenarioVersion: scenario.version,
      sourceId: source.sourceId,
      snapshotContentHash: snapshots[i % snapshots.length]?.provenance.contentHash ?? "",
      linkRole: "source" as const
    }))
  );
  return {
    formatVersion: "1.0",
    scenarios,
    snapshots,
    links
  };
}

// ---------------------------------------------------------------------------
// Parsing.
// ---------------------------------------------------------------------------

test("parses object, JSON string and Buffer inputs identically", () => {
  const envelope = makeEnvelope();
  const fromObject = parseHistoricalImportInput(envelope);
  const fromString = parseHistoricalImportInput(JSON.stringify(envelope));
  const fromBuffer = parseHistoricalImportInput(Buffer.from(JSON.stringify(envelope), "utf8"));
  assert.deepEqual(fromObject, fromString);
  assert.deepEqual(fromObject, fromBuffer);
});

test("rejects invalid JSON with an actionable path", () => {
  assert.throws(
    () => parseHistoricalImportInput("{not json"),
    (error: unknown) =>
      error instanceof HistoricalImportParseError
      && error.issues[0]?.code === "invalid_json"
      && error.issues[0]?.path === "$"
  );
});

test("rejects unsupported format versions without parsing further", () => {
  const envelope = { ...makeEnvelope(), formatVersion: "2.0" };
  assert.throws(
    () => parseHistoricalImportInput(envelope),
    (error: unknown) =>
      error instanceof HistoricalImportParseError
      && error.issues[0]?.code === "unsupported_format"
      && error.issues[0]?.path === "formatVersion"
  );
});

test("rejects non-object envelopes", () => {
  for (const bad of [null, 42, [], "plain-string"]) {
    assert.throws(
      () => parseHistoricalImportInput(bad),
      (error: unknown) => error instanceof HistoricalImportParseError
    );
  }
});

test("schema violations carry JSON-path locations", () => {
  const envelope = makeEnvelope();
  const broken = {
    ...envelope,
    scenarios: [{ ...envelope.scenarios[0], scenarioLevel: 100 }]
  };
  assert.throws(
    () => parseHistoricalImportInput(broken),
    (error: unknown) =>
      error instanceof HistoricalImportParseError
      && error.issues.some((issue) => issue.path.includes("scenarios[0]"))
  );
});

// ---------------------------------------------------------------------------
// Normalization.
// ---------------------------------------------------------------------------

test("normalization sorts deterministically and forces draft", () => {
  const snapA = makeSnapshot();
  const snapB = makeSnapshot({ candles: makeCandles(Date.parse("2024-01-02T06:00:00Z"), 1) });
  const first = snapA.provenance.contentHash < snapB.provenance.contentHash ? snapA : snapB;
  const second = first === snapA ? snapB : snapA;
  const scenarioB = makeScenario({ scenarioId: "hist-import-002", reviewStatus: "published" });
  const scenarioA = makeScenario({ scenarioId: "hist-import-001", reviewStatus: "validated" });
  const envelope = makeEnvelope({
    scenarios: [scenarioB, scenarioA],
    snapshots: [second, first],
    links: [
      {
        scenarioId: "hist-import-002",
        scenarioVersion: "1.0.0",
        sourceId: scenarioB.availableSources[0]?.sourceId ?? "",
        snapshotContentHash: second.provenance.contentHash,
        linkRole: "source"
      },
      {
        scenarioId: "hist-import-001",
        scenarioVersion: "1.0.0",
        sourceId: scenarioA.availableSources[0]?.sourceId ?? "",
        snapshotContentHash: first.provenance.contentHash,
        linkRole: "source"
      }
    ]
  });

  const normalized = normalizeHistoricalImportEnvelope(envelope);
  assert.deepEqual(
    normalized.scenarios.map((s) => s.scenarioId),
    ["hist-import-001", "hist-import-002"]
  );
  assert.deepEqual(
    normalized.snapshots.map((s) => s.provenance.contentHash),
    [first.provenance.contentHash, second.provenance.contentHash]
  );
  assert.equal(normalized.links[0]?.scenarioId, "hist-import-001");
  // Client publication state is never trusted.
  assert.ok(normalized.scenarios.every((s) => s.reviewStatus === "draft"));
  assert.equal(normalized.requestedReviewStatuses["hist-import-001@1.0.0"], "validated");
  assert.equal(normalized.requestedReviewStatuses["hist-import-002@1.0.0"], "published");
});

// ---------------------------------------------------------------------------
// Idempotency identity.
// ---------------------------------------------------------------------------

test("import hash is stable across key order, metadata and requested status", () => {
  const base = makeEnvelope();
  const reordered = JSON.parse(JSON.stringify({
    links: base.links,
    snapshots: base.snapshots,
    scenarios: base.scenarios,
    formatVersion: "1.0"
  })) as HistoricalImportEnvelope;
  const withMetadata: HistoricalImportEnvelope = {
    ...base,
    importMetadata: { requestedBy: "editor-1", reason: "backfill" }
  };
  const otherStatus: HistoricalImportEnvelope = {
    ...base,
    scenarios: base.scenarios.map((s) => ({ ...s, reviewStatus: "published" as const }))
  };

  const hashes = [base, reordered, withMetadata, otherStatus].map((envelope) =>
    normalizeHistoricalImportEnvelope(envelope).importHash
  );
  assert.ok(hashes.every((hash) => hash === hashes[0]));
  assert.match(hashes[0] ?? "", /^sha256:[a-f0-9]{64}$/);
});

test("import hash changes when persisted content changes", () => {
  const base = normalizeHistoricalImportEnvelope(makeEnvelope()).importHash;
  const changedScenario = makeEnvelope({
    scenarios: [makeScenario({ assetId: "asset_other" })]
  });
  const changedSnapshot = makeEnvelope({
    snapshots: [makeSnapshot({ symbol: "ETHUSDT" }), makeSnapshot()]
  });
  assert.notEqual(normalizeHistoricalImportEnvelope(changedScenario).importHash, base);
  assert.notEqual(normalizeHistoricalImportEnvelope(changedSnapshot).importHash, base);
});

test("computeHistoricalImportHash sorts inputs before hashing", () => {
  const envelope = makeEnvelope();
  const forward = computeHistoricalImportHash({
    scenarios: envelope.scenarios,
    snapshots: envelope.snapshots,
    links: envelope.links,
    licensing: [],
    capture: []
  });
  const reversed = computeHistoricalImportHash({
    scenarios: [...envelope.scenarios].reverse(),
    snapshots: [...envelope.snapshots].reverse(),
    links: [...envelope.links].reverse(),
    licensing: [],
    capture: []
  });
  assert.equal(forward, reversed);
});

// ---------------------------------------------------------------------------
// Validation: happy path + envelope consistency.
// ---------------------------------------------------------------------------

test("valid envelope passes with zero issues", () => {
  const result = analyzeHistoricalImportInput(makeEnvelope());
  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
  assert.match(result.envelope.importHash, /^sha256:[a-f0-9]{64}$/);
});

test("valid envelope covering two scenarios passes", () => {
  const scenarioA = makeScenario({ scenarioId: "hist-a" });
  const scenarioB = { ...coreScenario, scenarioId: "hist-b", version: "2.0.0" };
  const snapshots = [makeSnapshot(), makeSnapshot({
    symbol: "ETHUSDT",
    candles: makeCandles(Date.parse("2024-01-02T04:00:00Z"), 3)
  })];
  const links = [
    ...scenarioA.availableSources.map((source, i) => ({
      scenarioId: "hist-a",
      scenarioVersion: "1.0.0",
      sourceId: source.sourceId,
      snapshotContentHash: snapshots[i % snapshots.length]?.provenance.contentHash ?? "",
      linkRole: "source" as const
    })),
    ...scenarioB.availableSources.map((source, i) => ({
      scenarioId: "hist-b",
      scenarioVersion: "2.0.0",
      sourceId: source.sourceId,
      snapshotContentHash: snapshots[(i + 1) % snapshots.length]?.provenance.contentHash ?? "",
      linkRole: "source" as const
    }))
  ];
  const result = analyzeHistoricalImportInput({
    formatVersion: "1.0",
    scenarios: [scenarioA, scenarioB],
    snapshots,
    links
  });
  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
});

test("duplicate scenarios in one envelope are rejected", () => {
  const scenario = makeScenario();
  const result = analyzeHistoricalImportInput(makeEnvelope({
    scenarios: [scenario, { ...scenario }]
  }));
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "duplicate_scenario"));
});

test("duplicate identical snapshots are rejected as malformed", () => {
  const snapshot = makeSnapshot();
  const result = analyzeHistoricalImportInput(makeEnvelope({
    snapshots: [snapshot, structuredClone(snapshot)]
  }));
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "duplicate_snapshot"));
});

test("same snapshot identity with different content is an envelope conflict", () => {
  const snapshot = makeSnapshot();
  const conflicting = makeSnapshot({
    candles: makeCandles(Date.parse("2024-01-02T06:00:00Z"), 1),
    contentHash: snapshot.provenance.contentHash
  });
  const result = analyzeHistoricalImportInput(makeEnvelope({
    snapshots: [snapshot, conflicting]
  }));
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "conflicting_snapshot_in_envelope"));
});

test("dangling link references are reported with actionable paths", () => {
  const envelope = makeEnvelope();
  const result = analyzeHistoricalImportInput(makeEnvelope({
    links: [
      {
        scenarioId: "no-such-scenario",
        scenarioVersion: "9.9.9",
        sourceId: "no-source",
        snapshotContentHash: envelope.snapshots[0]?.provenance.contentHash ?? "",
        linkRole: "source"
      },
      {
        scenarioId: envelope.scenarios[0]?.scenarioId ?? "",
        scenarioVersion: envelope.scenarios[0]?.version ?? "",
        sourceId: envelope.scenarios[0]?.availableSources[0]?.sourceId ?? "",
        snapshotContentHash: "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        linkRole: "source"
      }
    ]
  }));
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "unknown_scenario"));
  assert.ok(result.issues.some((issue) => issue.code === "unknown_snapshot"));
});

test("unknown source ids are rejected", () => {
  const envelope = makeEnvelope();
  const result = analyzeHistoricalImportInput(makeEnvelope({
    links: [{
      scenarioId: envelope.scenarios[0]?.scenarioId ?? "",
      scenarioVersion: envelope.scenarios[0]?.version ?? "",
      sourceId: "source_missing",
      snapshotContentHash: envelope.snapshots[0]?.provenance.contentHash ?? "",
      linkRole: "source"
    }]
  }));
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "unknown_source"));
});

test("duplicate links are rejected", () => {
  const envelope = makeEnvelope();
  const link = envelope.links[0];
  assert.ok(link);
  const result = analyzeHistoricalImportInput(makeEnvelope({
    links: [link, { ...link }]
  }));
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "duplicate_link"));
});

test("scenarios without any link are rejected", () => {
  const envelope = makeEnvelope();
  const result = analyzeHistoricalImportInput(makeEnvelope({
    scenarios: [makeScenario({ scenarioId: "linked" }), makeScenario({ scenarioId: "unlinked" })],
    links: [{
      scenarioId: "linked",
      scenarioVersion: "1.0.0",
      sourceId: envelope.scenarios[0]?.availableSources[0]?.sourceId ?? "",
      snapshotContentHash: envelope.snapshots[0]?.provenance.contentHash ?? "",
      linkRole: "source"
    }]
  }));
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "missing_link"));
});

test("licensing and capture entries must reference envelope snapshots", () => {
  const unknown = "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
  const result = analyzeHistoricalImportInput({
    ...makeEnvelope(),
    licensing: [{ snapshotContentHash: unknown, license: "CC0-1.0" }],
    capture: [{
      snapshotContentHash: unknown,
      retrievedAt: "2024-01-02T11:02:00Z",
      captureMethod: "api"
    }]
  });
  assert.equal(result.valid, false);
  assert.equal(result.issues.filter((issue) => issue.code === "unknown_snapshot").length, 2);
});

test("duplicate licensing entries are rejected", () => {
  const envelope = makeEnvelope();
  const hash = envelope.snapshots[0]?.provenance.contentHash ?? "";
  const result = analyzeHistoricalImportInput({
    ...envelope,
    licensing: [
      { snapshotContentHash: hash, license: "CC0-1.0" },
      { snapshotContentHash: hash, license: "CC-BY-4.0" }
    ]
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "duplicate_licensing"));
});

// ---------------------------------------------------------------------------
// Validation: scenario point-in-time semantics.
// ---------------------------------------------------------------------------

test("post-t0 sources are rejected with source paths", () => {
  const scenario = makeScenario();
  const first = scenario.availableSources[0];
  assert.ok(first);
  const result = analyzeHistoricalImportInput(makeEnvelope({
    scenarios: [{
      ...scenario,
      availableSources: [
        { ...first, availableAt: "2024-03-14T09:00:00Z" },
        ...scenario.availableSources.slice(1)
      ]
    }]
  }));
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "post_t0_source"));
});

test("invalid future ranges and future-hash mismatches are rejected", () => {
  const badRange = analyzeHistoricalImportInput(makeEnvelope({
    scenarios: [makeScenario({
      historicalFutureSegment: {
        from: "2024-01-02T10:00:00Z",
        to: "2024-01-02T18:00:00Z",
        contentHash: starterScenario.historicalFutureSegment.contentHash
      }
    })]
  }));
  assert.ok(badRange.issues.some((issue) => issue.code === "invalid_future_range"));

  const badHash = analyzeHistoricalImportInput(makeEnvelope({
    scenarios: [makeScenario({ futureHash: "sha256:mismatched-future-hash-value-0000000000000000000000" })]
  }));
  assert.ok(badHash.issues.some((issue) => issue.code === "future_hash_mismatch"));
});

test("source-group violations are rejected", () => {
  const dupGroups = analyzeHistoricalImportInput(makeEnvelope({
    scenarios: [makeScenario({ availableSourceGroups: ["PRICE", "PRICE"] })]
  }));
  assert.ok(dupGroups.issues.some((issue) => issue.code === "duplicate_source_group"));

  const scenario = makeScenario();
  const mismatch = analyzeHistoricalImportInput(makeEnvelope({
    scenarios: [{
      ...scenario,
      availableSourceGroups: ["PRICE"],
      availableSources: scenario.availableSources
    }]
  }));
  assert.ok(mismatch.issues.some((issue) => issue.code === "source_group_mismatch"));
});

test("beginner scenarios exceeding three source groups are rejected", () => {
  const result = analyzeHistoricalImportInput(makeEnvelope({
    scenarios: [makeScenario({
      scenarioLevel: 3,
      availableSourceGroups: ["PRICE", "CONTEXT", "FLOW", "EVENT"],
      availableSources: [
        ...starterScenario.availableSources,
        {
          sourceId: "source_extra_context",
          sourceGroup: "CONTEXT",
          observedAt: "2024-01-02T11:00:00Z",
          availableAt: "2024-01-02T11:30:00Z",
          timezone: "UTC",
          sourceReference: "fixture://extra",
          reliability: "low",
          contentHash: "sha256:fixture-extra-001",
          revisionStatus: "original"
        },
        {
          sourceId: "source_extra_event",
          sourceGroup: "EVENT",
          observedAt: "2024-01-02T11:00:00Z",
          availableAt: "2024-01-02T11:30:00Z",
          timezone: "UTC",
          sourceReference: "fixture://extra-event",
          reliability: "low",
          contentHash: "sha256:fixture-extra-002",
          revisionStatus: "original"
        }
      ]
    })]
  }));
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "beginner_source_group_overflow"));
});

// ---------------------------------------------------------------------------
// Validation: snapshot semantics.
// ---------------------------------------------------------------------------

test("snapshot content-hash mismatches are rejected", () => {
  const snapshot = makeSnapshot({
    contentHash: "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
  });
  const result = analyzeHistoricalImportInput(makeEnvelope({ snapshots: [snapshot, makeSnapshot()] }));
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "hash_mismatch"));
});

test("unordered and duplicate candles are rejected", () => {
  const candles = makeCandles(Date.parse("2024-01-02T08:00:00Z"), 2);
  const reversed = makeSnapshot({ candles: [...candles].reverse() });
  const reversedResult = analyzeHistoricalImportInput(makeEnvelope({
    snapshots: [reversed, makeSnapshot()]
  }));
  assert.ok(reversedResult.issues.some((issue) => issue.code === "invalid_candle_order"));

  const duplicated = makeSnapshot({ candles: [candles[0]!, candles[0]!] });
  const dupResult = analyzeHistoricalImportInput(makeEnvelope({
    snapshots: [duplicated, makeSnapshot()]
  }));
  assert.ok(dupResult.issues.some((issue) => issue.code === "duplicate_candle"));
});

test("future candles and inverted ranges are rejected", () => {
  const future = makeSnapshot({
    asOf: "2024-01-02T09:00:00Z",
    candles: makeCandles(Date.parse("2024-01-02T08:00:00Z"), 2)
  });
  const futureResult = analyzeHistoricalImportInput(makeEnvelope({
    snapshots: [future, makeSnapshot()]
  }));
  assert.ok(futureResult.issues.some((issue) => issue.code === "invalid_candle_range"));

  const inverted = makeSnapshot({
    candles: [{
      openTime: "2024-01-02T09:00:00Z",
      closeTime: "2024-01-02T09:00:00Z",
      open: "100",
      high: "102",
      low: "99",
      close: "101",
      volume: "42.5"
    }]
  });
  const invertedResult = analyzeHistoricalImportInput(makeEnvelope({
    snapshots: [inverted, makeSnapshot()]
  }));
  assert.ok(invertedResult.issues.some((issue) => issue.code === "invalid_candle_range"));
});

test("inconsistent OHLC values are rejected", () => {
  const bad = makeSnapshot({
    candles: [{
      openTime: "2024-01-02T08:00:00Z",
      closeTime: "2024-01-02T08:59:59.999Z",
      open: "100",
      high: "90",
      low: "99",
      close: "101",
      volume: "42.5"
    }]
  });
  const result = analyzeHistoricalImportInput(makeEnvelope({
    snapshots: [bad, makeSnapshot()]
  }));
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "invalid_ohlc"));
});

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------

test("stableStringify is key-order independent", () => {
  assert.equal(
    stableStringify({ b: 2, a: { d: [3, 2], c: 1 } }),
    stableStringify({ a: { c: 1, d: [3, 2] }, b: 2 })
  );
});

test("decimal comparison avoids floating point", () => {
  assert.equal(compareDecimalStrings("100.25", "100.25"), 0);
  assert.equal(compareDecimalStrings("99.9", "100"), -1);
  assert.equal(compareDecimalStrings("100", "99.999999999999999999"), 1);
  assert.equal(compareDecimalStrings("0.10", "0.1"), 0);
});

test("scenario equality ignores reviewStatus; snapshot equality is exact", () => {
  const a = makeScenario({ reviewStatus: "draft" });
  const b = makeScenario({ reviewStatus: "published" });
  assert.equal(scenarioContentEquals(a, b), true);
  assert.equal(scenarioContentEquals(a, { ...b, assetId: "other" }), false);

  const snap = makeSnapshot();
  assert.equal(snapshotContentEquals(snap, structuredClone(snap)), true);
  assert.equal(snapshotContentEquals(snap, makeSnapshot({ symbol: "ETHUSDT" })), false);
});

test("validation issues are deterministically ordered", () => {
  const scenario = makeScenario();
  const first = scenario.availableSources[0];
  assert.ok(first);
  const input = makeEnvelope({
    scenarios: [{
      ...scenario,
      availableSources: [
        { ...first, availableAt: "2024-03-14T09:00:00Z" },
        ...scenario.availableSources.slice(1)
      ]
    }],
    snapshots: [makeSnapshot({
      contentHash: "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    }), makeSnapshot()]
  });
  const firstRun = analyzeHistoricalImportInput(input).issues;
  const secondRun = analyzeHistoricalImportInput(structuredClone(input)).issues;
  assert.deepEqual(firstRun, secondRun);
  const paths = firstRun.map((issue) => issue.path);
  assert.deepEqual(paths, [...paths].sort());
});

test("validateHistoricalImportEnvelope accepts normalized envelopes directly", () => {
  const normalized = normalizeHistoricalImportEnvelope(makeEnvelope());
  const result = validateHistoricalImportEnvelope(normalized);
  assert.equal(result.valid, true);
  assert.equal(result.envelope.importHash, normalized.importHash);
});
