import assert from "node:assert/strict";
import test from "node:test";

import { buildServer } from "./server.js";
import type { HistoricalMarketSnapshot } from "../../../packages/contracts/src/provider.js";
import type { ScenarioPackage } from "../../../packages/contracts/src/scenario.js";
import { starterScenario } from "../../../packages/content/src/fixtures/starter-scenario.js";
import { computeSnapshotContentHash } from "../../../packages/domain/src/historical-import.js";

type Server = ReturnType<typeof buildServer>;

const EDITOR = "seed-user-001";
const NOW_MS = Date.parse("2026-09-22T12:00:00.000Z");

let envelopeSeq = 0;

function makeCandles(baseMs: number, count = 2, stepMs = 3_600_000) {
  return Array.from({ length: count }, (_, i) => {
    const openMs = baseMs + i * stepMs;
    return {
      openTime: new Date(openMs).toISOString(),
      closeTime: new Date(openMs + stepMs - 1).toISOString(),
      open: `10${i % 5}.5`,
      high: `10${i % 5}.9`,
      low: `10${i % 5}.1`,
      close: `10${i % 5}.7`,
      volume: `${100 + i}.25`
    };
  });
}

function makeSnapshot(symbol: string, baseMs: number): HistoricalMarketSnapshot {
  const candles = makeCandles(baseMs);
  return {
    provider: "binance",
    symbol,
    interval: "1h",
    asOf: new Date(baseMs + 2 * 3_600_000).toISOString(),
    candles,
    provenance: {
      sourceReference: `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h`,
      observedAt: new Date(baseMs + 2 * 3_600_000).toISOString(),
      availableAt: new Date(baseMs + 2 * 3_600_000 + 60_000).toISOString(),
      timezone: "UTC",
      reliability: "high",
      contentHash: computeSnapshotContentHash(candles),
      revisionStatus: "original"
    }
  };
}

function makeEnvelope(options: {
  scenarioId: string;
  linkSources?: readonly string[] | undefined;
  scenarioOverrides?: Partial<ScenarioPackage> | undefined;
  licenseSuffix?: string | undefined;
}): Record<string, unknown> {
  const scenario: ScenarioPackage = {
    ...starterScenario,
    scenarioId: options.scenarioId,
    version: "1.0.0",
    ...options.scenarioOverrides
  };
  const baseMs = Date.parse("2024-01-02T08:00:00Z") + (envelopeSeq++ * 7 * 24 * 3_600_000);
  const snapshots = [
    makeSnapshot("BTCUSDT", baseMs),
    makeSnapshot("ETHUSDT", baseMs + 24 * 3_600_000)
  ];
  const sources = options.linkSources ?? ["source_ohlcv_demo", "source_volume_demo"];
  const links = sources.map((sourceId, i) => ({
    scenarioId: scenario.scenarioId,
    scenarioVersion: scenario.version,
    sourceId,
    snapshotContentHash: snapshots[i % snapshots.length]!.provenance.contentHash,
    linkRole: "source"
  }));
  const license = `route-test-license${options.licenseSuffix ?? ""}`;
  return {
    formatVersion: "1.0",
    scenarios: [scenario],
    snapshots,
    links,
    licensing: snapshots.map((snapshot) => ({
      snapshotContentHash: snapshot.provenance.contentHash,
      license,
      usage: "route-fixture"
    })),
    capture: snapshots.map((snapshot) => ({
      snapshotContentHash: snapshot.provenance.contentHash,
      retrievedAt: "2024-01-03T00:00:00Z",
      captureMethod: "route-fixture"
    }))
  };
}

function leakScan(value: unknown): string[] {
  const text = JSON.stringify(value);
  return [
    "hiddenEntities",
    "historicalFutureSegment",
    "historicalOutcome",
    "futureHash",
    "evaluationRules",
    "stack",
    "sa_session",
    "internal-proxy"
  ].filter((needle) => text.includes(needle));
}

test("historical dry-run predicts without persisting; editors only", async () => {
  const server = buildServer({ editorUserIds: [EDITOR], now: () => NOW_MS });
  try {
    const envelope = makeEnvelope({ scenarioId: "route-dry-001" });
    const dryRun = await server.inject({
      method: "POST",
      url: "/api/v1/admin/historical/imports/dry-run",
      payload: envelope
    });
    assert.equal(dryRun.statusCode, 200);
    const report = dryRun.json<{ data: Record<string, unknown> }>().data;
    assert.equal(report["mode"], "dry_run");
    assert.equal(report["valid"], true);
    assert.deepEqual(
      (report["counts"] as Record<string, Record<string, number>>).total,
      { inserted: 7, alreadyPresent: 0, conflicting: 0, rejected: 0 }
    );
    assert.deepEqual(leakScan(report), []);

    // Nothing persisted: the audit list is empty.
    const list = await server.inject({ method: "GET", url: "/api/v1/admin/historical/imports" });
    assert.equal(list.statusCode, 200);
    assert.deepEqual(list.json<{ data: unknown[] }>().data, []);

    // Invalid envelopes report issues (still 200: dry-run never fails).
    const broken = makeEnvelope({ scenarioId: "route-dry-002" });
    (broken.links as Array<Record<string, unknown>>).pop();
    (broken.links as Array<Record<string, unknown>>).pop();
    const invalid = await server.inject({
      method: "POST",
      url: "/api/v1/admin/historical/imports/dry-run",
      payload: broken
    });
    assert.equal(invalid.statusCode, 200);
    assert.equal(invalid.json<{ data: { valid: boolean } }>().data.valid, false);
  } finally {
    await server.close();
  }

  const locked = buildServer({ editorUserIds: [], now: () => NOW_MS });
  try {
    const denied = await locked.inject({
      method: "POST",
      url: "/api/v1/admin/historical/imports/dry-run",
      payload: makeEnvelope({ scenarioId: "route-dry-003" })
    });
    assert.equal(denied.statusCode, 403);
    assert.equal(denied.json().error, "admin_forbidden");
    const deniedRead = await locked.inject({ method: "GET", url: "/api/v1/admin/historical/imports" });
    assert.equal(deniedRead.statusCode, 403);
  } finally {
    await server.close();
  }
});

test("historical import lifecycle: create, duplicate, conflict, reject", async () => {
  const server = buildServer({ editorUserIds: [EDITOR], now: () => NOW_MS });
  try {
    const envelope = makeEnvelope({ scenarioId: "route-imp-001" });
    const created = await server.inject({
      method: "POST",
      url: "/api/v1/admin/historical/imports",
      payload: envelope
    });
    assert.equal(created.statusCode, 201);
    const summary = created.json<{ data: Record<string, unknown> }>().data;
    assert.equal(summary["mode"], "real");
    assert.equal(summary["status"], "completed");
    assert.equal(summary["duplicate"], false);
    assert.equal(summary["persisted"], true);
    const importHash = summary["importHash"] as string;
    assert.equal(summary["importId"], `imp-${importHash.slice("sha256:".length)}`);
    assert.deepEqual(leakScan(summary), []);

    // Identical retry converges (200 + duplicate).
    const retry = await server.inject({
      method: "POST",
      url: "/api/v1/admin/historical/imports",
      payload: envelope
    });
    assert.equal(retry.statusCode, 200);
    assert.equal(retry.json<{ data: { duplicate: boolean } }>().data.duplicate, true);

    // Conflicting content persists a conflict summary, never overwrites.
    const conflictEnvelope = makeEnvelope({
      scenarioId: "route-imp-001",
      scenarioOverrides: { debrief: { summary: "Tampered via route" } }
    });
    const conflict = await server.inject({
      method: "POST",
      url: "/api/v1/admin/historical/imports",
      payload: conflictEnvelope
    });
    assert.equal(conflict.statusCode, 201);
    assert.equal(conflict.json<{ data: { status: string } }>().data.status, "conflict");

    // Invalid envelopes are rejected ephemerally (422 + actionable report).
    const broken = makeEnvelope({ scenarioId: "route-imp-002" });
    delete (broken as Record<string, unknown>)["snapshots"];
    const rejected = await server.inject({
      method: "POST",
      url: "/api/v1/admin/historical/imports",
      payload: broken
    });
    assert.equal(rejected.statusCode, 422);
    const rejectedBody = rejected.json<{ data: Record<string, unknown> }>().data;
    assert.equal(rejectedBody["status"], "rejected");
    assert.equal(rejectedBody["persisted"], false);
    assert.ok(((rejectedBody["issues"] as unknown[]) ?? []).length > 0);
  } finally {
    await server.close();
  }
});

test("historical audit reads: imports, snapshots, links, transitions", async () => {
  const server = buildServer({ editorUserIds: [EDITOR], now: () => NOW_MS });
  try {
    const first = await server.inject({
      method: "POST",
      url: "/api/v1/admin/historical/imports",
      payload: makeEnvelope({ scenarioId: "route-audit-001" })
    });
    assert.equal(first.statusCode, 201);
    const firstSummary = first.json<{ data: { importId: string; importHash: string } }>().data;
    const second = await server.inject({
      method: "POST",
      url: "/api/v1/admin/historical/imports",
      payload: makeEnvelope({ scenarioId: "route-audit-002" })
    });
    assert.equal(second.statusCode, 201);

    // Paged import list with totals and deterministic order.
    const page = await server.inject({
      method: "GET",
      url: "/api/v1/admin/historical/imports?limit=1&offset=1"
    });
    assert.equal(page.statusCode, 200);
    const pageBody = page.json<{
      data: Array<{ importId: string; counts: unknown; summaryCorrupt: boolean }>;
      page: { limit: number; offset: number; total: number };
    }>();
    assert.deepEqual(pageBody.page, { limit: 1, offset: 1, total: 2 });
    assert.equal(pageBody.data.length, 1);
    assert.equal(pageBody.data[0]!.summaryCorrupt, false);
    assert.ok(pageBody.data[0]!.counts);
    assert.deepEqual(leakScan(pageBody), []);

    const badPage = await server.inject({
      method: "GET",
      url: "/api/v1/admin/historical/imports?limit=9999"
    });
    assert.equal(badPage.statusCode, 422);

    // Import detail carries the full deterministic summary.
    const detail = await server.inject({
      method: "GET",
      url: `/api/v1/admin/historical/imports/${firstSummary.importId}`
    });
    assert.equal(detail.statusCode, 200);
    assert.equal(detail.json<{ data: { importHash: string } }>().data.importHash, firstSummary.importHash);
    const missingImport = await server.inject({
      method: "GET",
      url: "/api/v1/admin/historical/imports/imp-missing"
    });
    assert.equal(missingImport.statusCode, 404);
    assert.equal(missingImport.json().error, "import_not_found");

    // Snapshot list is metadata-only; detail includes candles + metadata + links.
    const snapshots = await server.inject({ method: "GET", url: "/api/v1/admin/historical/snapshots?limit=50" });
    assert.equal(snapshots.statusCode, 200);
    const snapshotBody = snapshots.json<{
      data: Array<{ snapshotId: string; candleCount: number; contentHash: string }>;
      page: { total: number };
    }>();
    assert.equal(snapshotBody.page.total, 4);
    assert.ok(snapshotBody.data.every((row) => row.candleCount === 2));
    assert.ok(!JSON.stringify(snapshotBody).includes("\"candles\""));
    const snapshotDetail = await server.inject({
      method: "GET",
      url: `/api/v1/admin/historical/snapshots/${snapshotBody.data[0]!.snapshotId}`
    });
    assert.equal(snapshotDetail.statusCode, 200);
    const detailBody = snapshotDetail.json<{
      data: {
        snapshot: { candles: unknown[]; provenance: { contentHash: string } };
        metadata: { licensing: { license: string } | null; capture: { captureMethod: string } | null } | null;
        links: Array<{ scenarioId: string }>;
      };
    }>().data;
    assert.equal(detailBody.snapshot.candles.length, 2);
    assert.equal(detailBody.metadata?.licensing?.license, "route-test-license");
    assert.equal(detailBody.metadata?.capture?.captureMethod, "route-fixture");
    assert.equal(detailBody.links.length, 1);
    const missingSnapshot = await server.inject({
      method: "GET",
      url: "/api/v1/admin/historical/snapshots/snap-missing"
    });
    assert.equal(missingSnapshot.statusCode, 404);

    // Links + transitions for the imported scenario version.
    const links = await server.inject({
      method: "GET",
      url: "/api/v1/admin/historical/scenarios/route-audit-001/versions/1.0.0/links"
    });
    assert.equal(links.statusCode, 200);
    assert.equal(links.json<{ data: unknown[] }>().data.length, 2);
    const transitions = await server.inject({
      method: "GET",
      url: "/api/v1/admin/historical/scenarios/route-audit-001/versions/1.0.0/transitions"
    });
    assert.equal(transitions.statusCode, 200);
    assert.deepEqual(transitions.json<{ data: unknown[] }>().data, []);
    const missingLinks = await server.inject({
      method: "GET",
      url: "/api/v1/admin/historical/scenarios/nope/versions/1.0.0/links"
    });
    assert.equal(missingLinks.statusCode, 404);
  } finally {
    await server.close();
  }
});

test("review route enforces the strict transition policy with audit", async () => {
  // Advancing clock: the audit orders by (created_at, transition_id), so each
  // transition needs a distinct timestamp to assert chronological order.
  let tick = 0;
  const server = buildServer({ editorUserIds: [EDITOR], now: () => NOW_MS + tick++ * 1000 });
  const review = (scenarioId: string, payload: Record<string, unknown>) => server.inject({
    method: "POST",
    url: `/api/v1/admin/scenarios/${scenarioId}/review`,
    payload
  });
  try {
    const created = await server.inject({
      method: "POST",
      url: "/api/v1/admin/historical/imports",
      payload: makeEnvelope({ scenarioId: "route-rev-001" })
    });
    assert.equal(created.statusCode, 201);

    // Skip is rejected (draft → validated).
    const skip = await review("route-rev-001", { version: "1.0.0", status: "validated" });
    assert.equal(skip.statusCode, 422);
    assert.equal(skip.json().error, "invalid_transition");

    // Unknown status + unknown scenario keep their stable codes.
    const badStatus = await review("route-rev-001", { version: "1.0.0", status: "shipped" });
    assert.equal(badStatus.statusCode, 422);
    assert.equal(badStatus.json().error, "invalid_request");
    const missing = await review("nope-000", { version: "1.0.0", status: "research" });
    assert.equal(missing.statusCode, 404);

    // Noop succeeds without an audit row.
    const noop = await review("route-rev-001", { version: "1.0.0", status: "draft" });
    assert.equal(noop.statusCode, 200);
    assert.equal(noop.json<{ data: { noop: boolean; transitionId: null } }>().data.noop, true);

    // Walk the pipeline to published.
    for (const status of ["research", "point_in_time_validation", "review", "validated", "published"]) {
      const step = await review("route-rev-001", { version: "1.0.0", status, reason: `approve ${status}` });
      assert.equal(step.statusCode, 200, status);
      const body = step.json<{
        data: { reviewStatus: string; transitionId: string; noop: boolean; readiness: { ready: boolean } };
      }>().data;
      assert.equal(body.reviewStatus, status);
      assert.equal(body.noop, false);
      assert.ok(body.transitionId);
    }

    // Terminal state is immutable.
    const terminal = await review("route-rev-001", { version: "1.0.0", status: "review" });
    assert.equal(terminal.statusCode, 409);
    assert.equal(terminal.json().error, "terminal_state");

    // Audit trail persisted in order.
    const trail = await server.inject({
      method: "GET",
      url: "/api/v1/admin/historical/scenarios/route-rev-001/versions/1.0.0/transitions"
    });
    assert.equal(trail.statusCode, 200);
    assert.deepEqual(
      trail.json<{ data: Array<{ toStatus: string; actorUserId: string }> }>().data.map((row) => row.toStatus),
      ["research", "point_in_time_validation", "review", "validated", "published"]
    );
  } finally {
    await server.close();
  }
});

test("publication is blocked over the wire unless persisted facts are ready", async () => {
  const server = buildServer({ editorUserIds: [EDITOR], now: () => NOW_MS });
  try {
    const created = await server.inject({
      method: "POST",
      url: "/api/v1/admin/historical/imports",
      payload: makeEnvelope({ scenarioId: "route-ready-001", linkSources: ["source_ohlcv_demo"] })
    });
    assert.equal(created.statusCode, 201);

    const readiness = await server.inject({
      method: "GET",
      url: "/api/v1/admin/historical/scenarios/route-ready-001/versions/1.0.0/readiness"
    });
    assert.equal(readiness.statusCode, 200);
    const readinessBody = readiness.json<{
      data: { ready: boolean; reasons: Array<{ code: string }> };
    }>().data;
    assert.equal(readinessBody.ready, false);
    assert.ok(readinessBody.reasons.some((reason) => reason.code === "missing_snapshot_link"));
    assert.deepEqual(leakScan(readinessBody), []);

    for (const status of ["research", "point_in_time_validation", "review", "validated"]) {
      const step = await server.inject({
        method: "POST",
        url: "/api/v1/admin/scenarios/route-ready-001/review",
        payload: { version: "1.0.0", status }
      });
      assert.equal(step.statusCode, 200, status);
    }
    const blocked = await server.inject({
      method: "POST",
      url: "/api/v1/admin/scenarios/route-ready-001/review",
      payload: { version: "1.0.0", status: "published" }
    });
    assert.equal(blocked.statusCode, 422);
    assert.equal(blocked.json().error, "publication_not_ready");
    assert.ok(
      (blocked.json<{ reasons: Array<{ code: string }> }>().reasons ?? [])
        .some((reason) => reason.code === "missing_snapshot_link")
    );

    const missing = await server.inject({
      method: "GET",
      url: "/api/v1/admin/historical/scenarios/nope/versions/1.0.0/readiness"
    });
    assert.equal(missing.statusCode, 404);
  } finally {
    await server.close();
  }
});
