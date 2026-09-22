import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";

import {
  closeDatabase,
  createDatabase,
  dryRunHistoricalImport,
  getScenarioReadiness,
  HistoricalImportServiceError,
  importHistoricalPackage,
  PostgresPersistenceAdapter,
  SqlitePersistenceAdapter,
  transitionScenarioReviewStatus,
  type HistoricalImportActor,
  type ImportFailureHook,
  type ImportSummary
} from "./index.js";
import type { PersistencePort } from "./ports.js";
import type { HistoricalMarketSnapshot } from "../../contracts/src/provider.js";
import type { ScenarioPackage } from "../../contracts/src/scenario.js";
import { starterScenario } from "../../content/src/fixtures/starter-scenario.js";
import {
  computeSnapshotContentHash,
  stableStringify
} from "../../domain/src/historical-import.js";
import { ReviewPolicyError } from "../../domain/src/review-policy.js";

const NOW = "2026-09-22T12:00:00.000Z";
const EDITOR: HistoricalImportActor = { userId: "editor-1", isEditor: true };
const VIEWER: HistoricalImportActor = { userId: "viewer-1", isEditor: false };

// ---------------------------------------------------------------------------
// Fixture builders (deterministic, no external data).
// ---------------------------------------------------------------------------

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

function makeScenario(scenarioId: string, overrides: Partial<ScenarioPackage> = {}): ScenarioPackage {
  return {
    ...starterScenario,
    scenarioId,
    version: "1.0.0",
    ...overrides
  };
}

type EnvelopeParts = {
  scenarioId: string;
  withCapture?: boolean;
  linkSources?: readonly string[] | undefined;
  scenarioOverrides?: Partial<ScenarioPackage> | undefined;
  licenseSuffix?: string | undefined;
  snapshotBaseMs?: number | undefined;
};

let envelopeSeq = 0;
const ENVELOPE_BASE_MS = Date.parse("2024-01-02T08:00:00Z");

function makeEnvelope(parts: EnvelopeParts): Record<string, unknown> {
  const scenario = makeScenario(parts.scenarioId, parts.scenarioOverrides);
  // Unique snapshot content per envelope by default: snapshots are
  // content-addressed and shared across tests in one database, so tests that
  // assert `inserted` outcomes need distinct bytes. Tests that intentionally
  // share snapshots (gap-fill) pass an explicit snapshotBaseMs.
  const baseMs = parts.snapshotBaseMs ?? ENVELOPE_BASE_MS + (envelopeSeq++ * 7 * 24 * 3_600_000);
  const snapshots = [
    makeSnapshot("BTCUSDT", baseMs),
    makeSnapshot("ETHUSDT", baseMs + 24 * 3_600_000)
  ];
  const sources = parts.linkSources ?? ["source_ohlcv_demo", "source_volume_demo"];
  const links = sources.map((sourceId, i) => ({
    scenarioId: scenario.scenarioId,
    scenarioVersion: scenario.version,
    sourceId,
    snapshotContentHash: snapshots[i % snapshots.length]!.provenance.contentHash,
    linkRole: "source"
  }));
  const license = `test-license${parts.licenseSuffix ?? ""}`;
  const licensing = snapshots.map((snapshot) => ({
    snapshotContentHash: snapshot.provenance.contentHash,
    license,
    usage: "backtest-fixture"
  }));
  const capture = (parts.withCapture ?? true)
    ? snapshots.map((snapshot) => ({
      snapshotContentHash: snapshot.provenance.contentHash,
      retrievedAt: "2024-01-03T00:00:00Z",
      captureMethod: "fixture"
    }))
    : [];
  return {
    formatVersion: "1.0",
    scenarios: [scenario],
    snapshots,
    links,
    licensing,
    capture
  };
}

async function dbCounts(persist: PersistencePort, scenarioId?: string) {
  return {
    snapshots: await persist.countHistoricalSnapshots(),
    imports: await persist.countHistoricalImports(),
    transitions: scenarioId ? await persist.countReviewTransitions(scenarioId, "1.0.0") : 0
  };
}

function serviceError(code: string) {
  return (error: unknown): boolean =>
    error instanceof HistoricalImportServiceError && error.code === code;
}

function policyError(code: string) {
  return (error: unknown): boolean =>
    error instanceof ReviewPolicyError && error.code === code;
}

function atSecond(offset: number): string {
  return new Date(Date.parse(NOW) + offset * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// Dual-driver suite (SQLite always; Postgres when POSTGRES_TEST_URL is set).
// ---------------------------------------------------------------------------

for (const driver of ["sqlite", "postgres"] as const) {
  test(`${driver}: historical import service (dry-run, atomic import, transitions)`, { skip: driver === "postgres" && !process.env.POSTGRES_TEST_URL }, async (t) => {
    const handle = driver === "sqlite" ? createDatabase() : undefined;
    const schema = `hist_svc_${randomUUID().replaceAll("-", "")}`;
    const adminPool = driver === "postgres" ? new Pool({ connectionString: process.env.POSTGRES_TEST_URL }) : undefined;
    if (adminPool) await adminPool.query(`CREATE SCHEMA "${schema}"`);
    const pool = adminPool
      ? new Pool({ connectionString: process.env.POSTGRES_TEST_URL, options: `-c search_path=${schema}` })
      : undefined;
    const persist: PersistencePort = handle
      ? new SqlitePersistenceAdapter(handle)
      : new PostgresPersistenceAdapter({ pool: pool! });
    if (persist instanceof PostgresPersistenceAdapter) await persist.migrate();
    // review_transitions.actor_user_id references users(user_id).
    if (handle) {
      handle.sqlite
        .prepare("INSERT INTO users (user_id, external_id, created_at) VALUES (?, ?, ?)")
        .run(EDITOR.userId, `ext-${EDITOR.userId}`, NOW);
    } else {
      await pool!.query("INSERT INTO users (user_id, external_id, created_at) VALUES ($1, $2, $3)", [
        EDITOR.userId,
        `ext-${EDITOR.userId}`,
        NOW
      ]);
    }
    const prefix = randomUUID().slice(0, 8);
    let seq = 0;
    const scenarioId = (): string => `hist-${prefix}-${++seq}`;

    try {
      await t.test("dry-run is deterministic and performs zero writes (no atomic block)", async () => {
        const envelope = makeEnvelope({ scenarioId: scenarioId() });
        let atomicCalls = 0;
        const spy = new Proxy(persist, {
          get(target, key) {
            const value: unknown = Reflect.get(target, key);
            if (typeof value !== "function") return value;
            if (key === "atomic") {
              return async (...args: unknown[]) => {
                atomicCalls += 1;
                return (value as (...callArgs: unknown[]) => unknown).apply(target, args);
              };
            }
            return (...args: unknown[]) => (value as (...callArgs: unknown[]) => unknown).apply(target, args);
          }
        });
        const before = await dbCounts(persist);
        const first = await dryRunHistoricalImport(spy, envelope, EDITOR);
        const second = await dryRunHistoricalImport(spy, envelope, EDITOR);
        assert.equal(atomicCalls, 0);
        assert.deepEqual(await dbCounts(persist), before);
        assert.deepEqual(second, first);
        assert.equal(stableStringify(second), stableStringify(first));
        assert.equal(first.mode, "dry_run");
        assert.equal(first.valid, true);
        assert.equal(first.parseable, true);
        assert.deepEqual(first.issues, []);
        assert.ok(first.importHash.startsWith("sha256:"));
        assert.deepEqual(first.counts.scenarios, { inserted: 1, alreadyPresent: 0, conflicting: 0, rejected: 0 });
        assert.deepEqual(first.counts.snapshots, { inserted: 2, alreadyPresent: 0, conflicting: 0, rejected: 0 });
        assert.deepEqual(first.counts.links, { inserted: 2, alreadyPresent: 0, conflicting: 0, rejected: 0 });
        assert.deepEqual(first.counts.metadata, { inserted: 2, alreadyPresent: 0, conflicting: 0, rejected: 0 });
        assert.equal(first.counts.total.inserted, 7);
        // Hypothetical readiness: data complete, review approval outstanding.
        assert.equal(first.readiness.length, 1);
        assert.equal(first.readiness[0]!.ready, false);
        assert.deepEqual(first.readiness[0]!.reasons.map((reason) => reason.code), ["unresolved_review_requirement"]);
        // Zero writes: no scenario row, no snapshots, no import record.
        const id = (envelope.scenarios as ScenarioPackage[])[0]!.scenarioId;
        assert.equal(await persist.getScenarioReviewStatusColumn(id, "1.0.0"), undefined);
        assert.equal(await persist.getHistoricalImportByHash(first.importHash), undefined);
      });

      await t.test("dry-run predictions match the real import exactly", async () => {
        const envelope = makeEnvelope({ scenarioId: scenarioId() });
        const dryRun = await dryRunHistoricalImport(persist, envelope, EDITOR);
        const summary = await importHistoricalPackage(persist, envelope, EDITOR, { nowIso: NOW });
        assert.equal(summary.mode, "real");
        assert.equal(summary.importHash, dryRun.importHash);
        assert.equal(summary.persisted, true);
        assert.equal(summary.duplicate, false);
        assert.equal(summary.status, "completed");
        assert.deepEqual(summary.requestedReviewStatuses, dryRun.requestedReviewStatuses);
        assert.deepEqual(summary.scenarios, dryRun.scenarios);
        assert.deepEqual(summary.snapshots, dryRun.snapshots);
        assert.deepEqual(summary.links, dryRun.links);
        assert.deepEqual(summary.metadata, dryRun.metadata);
        assert.deepEqual(summary.counts, dryRun.counts);
        assert.deepEqual(summary.readiness, dryRun.readiness);
      });

      await t.test("real import persists draft scenarios, snapshots, links, metadata, summary", async () => {
        const id = scenarioId();
        const envelope = makeEnvelope({
          scenarioId: id,
          scenarioOverrides: { reviewStatus: "published" }
        });
        const summary = await importHistoricalPackage(persist, envelope, EDITOR, { nowIso: NOW });
        assert.equal(summary.status, "completed");
        // Forced draft: the requested status is audited, never trusted.
        assert.deepEqual(summary.requestedReviewStatuses, { [`${id}@1.0.0`]: "published" });
        assert.equal(summary.scenarios[0]!.requestedReviewStatus, "published");
        assert.equal(summary.scenarios[0]!.persistedReviewStatus, "draft");
        assert.equal(await persist.getScenarioReviewStatusColumn(id, "1.0.0"), "draft");
        const stored = await persist.getStoredScenarioPackageJson(id, "1.0.0") as ScenarioPackage;
        assert.equal(stored.reviewStatus, "draft");
        // Snapshots + links + metadata round-trip.
        for (const item of summary.snapshots) {
          const record = await persist.getHistoricalSnapshot(item.snapshotId);
          assert.ok(record);
          assert.equal(record.contentHash, item.snapshotContentHash);
        }
        const links = await persist.listScenarioSnapshotLinks(id, "1.0.0");
        assert.equal(links.length, 2);
        for (const item of summary.metadata) {
          const snapshotId = summary.snapshots.find((s) => s.snapshotContentHash === item.snapshotContentHash)!.snapshotId;
          const meta = await persist.getSnapshotMetadata(snapshotId);
          assert.ok(meta?.licensingJson?.includes("test-license"));
          assert.ok(meta?.captureJson?.includes("fixture"));
        }
        // Summary row persisted and re-readable.
        const record = await persist.getHistoricalImportByHash(summary.importHash);
        assert.ok(record);
        assert.equal(record.importId, summary.importId);
        assert.equal(record.status, "completed");
        assert.equal(record.createdBy, EDITOR.userId);
        const fetched = await persist.getHistoricalImport(summary.importId);
        assert.equal(fetched?.importHash, summary.importHash);
      });

      await t.test("identical retry returns the stored summary without new writes", async () => {
        const envelope = makeEnvelope({ scenarioId: scenarioId() });
        const first = await importHistoricalPackage(persist, envelope, EDITOR, { nowIso: NOW });
        const before = await dbCounts(persist);
        const retry = await importHistoricalPackage(persist, envelope, EDITOR, { nowIso: atSecond(60) });
        assert.equal(retry.duplicate, true);
        assert.equal(retry.persisted, true);
        assert.equal(retry.importId, first.importId);
        assert.deepEqual({ ...retry, duplicate: false }, first);
        assert.deepEqual(await dbCounts(persist), before);
      });

      await t.test("new envelope over identical content reports already_present; legacy columns preserved", async () => {
        // Legacy row via the pre-Batch-01 path (column = validated).
        const legacyId = scenarioId();
        const sharedBaseMs = Date.parse("2023-02-01T00:00:00Z");
        await persist.upsertScenarioPackage(makeScenario(legacyId), NOW);
        assert.equal(await persist.getScenarioReviewStatusColumn(legacyId, "1.0.0"), "validated");
        const envelope = makeEnvelope({ scenarioId: legacyId, snapshotBaseMs: sharedBaseMs });
        // Align the envelope with the pre-existing legacy content exactly.
        (envelope.scenarios as ScenarioPackage[])[0] = makeScenario(legacyId);
        const summary = await importHistoricalPackage(persist, envelope, EDITOR, { nowIso: NOW });
        assert.equal(summary.scenarios[0]!.outcome, "already_present");
        assert.equal(summary.scenarios[0]!.persistedReviewStatus, "validated");
        assert.equal(await persist.getScenarioReviewStatusColumn(legacyId, "1.0.0"), "validated");
        // Second envelope (new hash via different license) over the same
        // scenario content: scenarios + snapshots + links already present.
        const again = makeEnvelope({ scenarioId: legacyId, licenseSuffix: "-v2", snapshotBaseMs: sharedBaseMs });
        (again.scenarios as ScenarioPackage[])[0] = makeScenario(legacyId);
        const second = await importHistoricalPackage(persist, again, EDITOR, { nowIso: NOW });
        assert.notEqual(second.importHash, summary.importHash);
        assert.equal(second.status, "completed");
        assert.equal(second.scenarios[0]!.outcome, "already_present");
        assert.ok(second.snapshots.every((item) => item.outcome === "already_present"));
        assert.ok(second.links.every((item) => item.outcome === "already_present"));
      });

      await t.test("conflicting scenario content is isolated; links + metadata rejected", async () => {
        const id = scenarioId();
        const sharedBaseMs = Date.parse("2023-03-01T00:00:00Z");
        const first = await importHistoricalPackage(persist, makeEnvelope({ scenarioId: id, snapshotBaseMs: sharedBaseMs }), EDITOR, { nowIso: NOW });
        assert.equal(first.status, "completed");
        const before = await dbCounts(persist);
        const conflictEnvelope = makeEnvelope({
          scenarioId: id,
          snapshotBaseMs: sharedBaseMs,
          scenarioOverrides: { debrief: { summary: "Tampered debrief text" } }
        });
        const dryRun = await dryRunHistoricalImport(persist, conflictEnvelope, EDITOR);
        assert.equal(dryRun.scenarios[0]!.outcome, "conflicting");
        assert.ok(dryRun.links.every((item) => item.outcome === "rejected"));
        const summary = await importHistoricalPackage(persist, conflictEnvelope, EDITOR, { nowIso: atSecond(5) });
        assert.equal(summary.status, "conflict");
        assert.deepEqual(summary.scenarios, dryRun.scenarios);
        assert.deepEqual(summary.links, dryRun.links);
        assert.equal(summary.counts.total.conflicting, 1);
        assert.equal(summary.counts.links.rejected, 2);
        // Stored row untouched; only the conflict summary row was added.
        const stored = await persist.getStoredScenarioPackageJson(id, "1.0.0") as ScenarioPackage;
        assert.equal(stored.debrief.summary, starterScenario.debrief.summary);
        const after = await dbCounts(persist);
        assert.equal(after.snapshots, before.snapshots);
        assert.equal(after.imports, before.imports + 1);
        assert.equal((await persist.listScenarioSnapshotLinks(id, "1.0.0")).length, 2);
      });

      await t.test("legacy snapshot row with same hash but different content conflicts", async () => {
        const id = scenarioId();
        const envelope = makeEnvelope({ scenarioId: id });
        const incoming = (envelope.snapshots as HistoricalMarketSnapshot[])[0]!;
        // Legacy row: same content_hash (format-valid), different candles.
        const legacyCandles = makeCandles(Date.parse("2023-06-01T00:00:00Z"));
        const legacy: HistoricalMarketSnapshot = {
          ...incoming,
          candles: legacyCandles
        };
        const legacyInserted = await persist.insertHistoricalSnapshotIgnoreConflict(legacy, `snap-legacy-${prefix}-${seq}`, NOW);
        assert.equal(legacyInserted, true);
        const summary = await importHistoricalPackage(persist, envelope, EDITOR, { nowIso: NOW });
        assert.equal(summary.status, "conflict");
        const conflicted = summary.snapshots.find((item) => item.snapshotContentHash === incoming.provenance.contentHash)!;
        assert.equal(conflicted.outcome, "conflicting");
        assert.equal(conflicted.reason?.code, "conflicting_immutable_data");
        // The link + metadata touching the conflicted snapshot are rejected.
        const touchedLink = summary.links.find((item) => item.snapshotContentHash === incoming.provenance.contentHash)!;
        assert.equal(touchedLink.outcome, "rejected");
        const touchedMeta = summary.metadata.find((item) => item.snapshotContentHash === incoming.provenance.contentHash)!;
        assert.equal(touchedMeta.outcome, "rejected");
        // The other snapshot imports normally; stored legacy row untouched.
        const stored = await persist.getHistoricalSnapshotByContentHash(incoming.provenance.contentHash);
        assert.deepEqual((stored!.snapshot as HistoricalMarketSnapshot).candles, legacyCandles);
      });

      await t.test("invalid envelopes yield ephemeral rejected summaries with zero writes", async () => {
        const id = scenarioId();
        const envelope = makeEnvelope({ scenarioId: id });
        // Break referential integrity: link points at an unknown snapshot.
        ((envelope.links as Array<Record<string, unknown>>)[0]! as Record<string, unknown>).snapshotContentHash =
          `sha256:${"9".repeat(64)}`;
        const before = await dbCounts(persist);
        const dryRun = await dryRunHistoricalImport(persist, envelope, EDITOR);
        assert.equal(dryRun.valid, false);
        assert.equal(dryRun.parseable, true);
        assert.ok(dryRun.issues.some((issue) => issue.code === "unknown_snapshot"));
        assert.ok(dryRun.issues.every((issue) => issue.path.length > 0 && issue.message.length > 0));
        assert.ok([...dryRun.scenarios, ...dryRun.snapshots, ...dryRun.links].every((item) => item.outcome === "rejected"));
        assert.deepEqual(dryRun.readiness, []);
        const summary = await importHistoricalPackage(persist, envelope, EDITOR, { nowIso: NOW });
        assert.equal(summary.status, "rejected");
        assert.equal(summary.persisted, false);
        assert.equal(summary.duplicate, false);
        assert.equal(summary.importHash, dryRun.importHash);
        assert.deepEqual(summary.issues, dryRun.issues);
        assert.deepEqual(await dbCounts(persist), before);
        assert.equal(await persist.getHistoricalImportByHash(summary.importHash), undefined);
        assert.equal(await persist.getScenarioReviewStatusColumn(id, "1.0.0"), undefined);
      });

      await t.test("unparseable input yields ephemeral reports with zero writes", async () => {
        const before = await dbCounts(persist);
        for (const input of ["{not json", { formatVersion: "9.9" }, 42, null]) {
          const dryRun = await dryRunHistoricalImport(persist, input, EDITOR);
          assert.equal(dryRun.valid, false);
          assert.equal(dryRun.parseable, false);
          assert.ok(dryRun.issues.length > 0);
          const summary = await importHistoricalPackage(persist, input, EDITOR, { nowIso: NOW });
          assert.equal(summary.status, "rejected");
          assert.equal(summary.persisted, false);
          assert.equal(summary.importHash, dryRun.importHash);
        }
        assert.deepEqual(await dbCounts(persist), before);
      });

      await t.test("non-editors are rejected before any work happens", async () => {
        const envelope = makeEnvelope({ scenarioId: scenarioId() });
        const before = await dbCounts(persist);
        await assert.rejects(dryRunHistoricalImport(persist, envelope, VIEWER), serviceError("forbidden"));
        await assert.rejects(importHistoricalPackage(persist, envelope, VIEWER), serviceError("forbidden"));
        await assert.rejects(
          transitionScenarioReviewStatus(persist, {
            scenarioId: "nope",
            scenarioVersion: "1.0.0",
            toStatus: "research",
            actor: VIEWER
          }),
          serviceError("forbidden")
        );
        assert.deepEqual(await dbCounts(persist), before);
      });

      await t.test("injected failure at any stage rolls back the entire import", async () => {
        const hooks: ImportFailureHook[] = [
          "after_scenarios",
          "after_snapshots",
          "after_links",
          "after_metadata",
          "before_summary"
        ];
        for (const hook of hooks) {
          const id = scenarioId();
          const before = await dbCounts(persist);
          await assert.rejects(
            importHistoricalPackage(persist, makeEnvelope({ scenarioId: id }), EDITOR, { nowIso: NOW, failureHook: hook }),
            serviceError("injected_failure")
          );
          assert.deepEqual(await dbCounts(persist), before, `rollback at ${hook}`);
          assert.equal(await persist.getScenarioReviewStatusColumn(id, "1.0.0"), undefined);
          // Retry without injection succeeds (no poisoned partial state).
          const retry = await importHistoricalPackage(persist, makeEnvelope({ scenarioId: id }), EDITOR, { nowIso: NOW });
          assert.equal(retry.status, "completed");
          assert.equal(retry.duplicate, false);
        }
      });

      await t.test("concurrent identical imports converge on one stored summary", async () => {
        const envelope = makeEnvelope({ scenarioId: scenarioId() });
        const before = await dbCounts(persist);
        const results = await Promise.all([
          importHistoricalPackage(persist, envelope, EDITOR, { nowIso: NOW }),
          importHistoricalPackage(persist, envelope, EDITOR, { nowIso: NOW })
        ]);
        assert.equal(results.filter((result) => !result.duplicate).length, 1);
        assert.equal(results[0]!.importId, results[1]!.importId);
        const after = await dbCounts(persist);
        assert.equal(after.imports, before.imports + 1);
        assert.equal(after.snapshots, before.snapshots + 2);
      });

      await t.test("concurrent conflicting imports serialize; loser records a conflict", async () => {
        const id = scenarioId();
        const envelopeA = makeEnvelope({ scenarioId: id });
        const envelopeB = makeEnvelope({
          scenarioId: id,
          scenarioOverrides: { debrief: { summary: "Concurrent variant B" } }
        });
        const outcomes = await Promise.allSettled([
          importHistoricalPackage(persist, envelopeA, EDITOR, { nowIso: NOW }),
          importHistoricalPackage(persist, envelopeB, EDITOR, { nowIso: NOW })
        ]);
        assert.ok(outcomes.every((outcome) => outcome.status === "fulfilled"));
        const summaries = outcomes.map((outcome) => (outcome as PromiseFulfilledResult<ImportSummary>).value);
        const statuses = summaries.map((summary) => summary.status).sort();
        assert.deepEqual(statuses, ["completed", "conflict"]);
        const stored = await persist.getStoredScenarioPackageJson(id, "1.0.0") as ScenarioPackage;
        assert.ok(
          stored.debrief.summary === starterScenario.debrief.summary
          || stored.debrief.summary === "Concurrent variant B"
        );
        // Exactly one scenario row exists; both import rows are recorded.
        const hashes = summaries.map((summary) => summary.importHash).sort();
        for (const hash of hashes) {
          assert.ok(await persist.getHistoricalImportByHash(hash));
        }
      });

      await t.test("metadata gap-fill completes NULL fields; originals are never overwritten", async () => {
        const id = scenarioId();
        const sharedBaseMs = Date.parse("2023-01-01T00:00:00Z");
        const licensingOnly = makeEnvelope({ scenarioId: id, withCapture: false, snapshotBaseMs: sharedBaseMs });
        const first = await importHistoricalPackage(persist, licensingOnly, EDITOR, { nowIso: NOW });
        assert.ok(first.metadata.every((item) => item.outcome === "inserted" && item.hasCapture === false));
        // Second envelope (new hash): same content + capture entries.
        const withCapture = makeEnvelope({ scenarioId: id, withCapture: true, snapshotBaseMs: sharedBaseMs });
        const second = await importHistoricalPackage(persist, withCapture, EDITOR, { nowIso: atSecond(10) });
        assert.notEqual(second.importHash, first.importHash);
        assert.equal(second.status, "completed");
        assert.ok(second.metadata.every((item) => item.outcome === "already_present"));
        assert.ok(second.metadata.every((item) => item.reason?.code === "metadata_completed"));
        for (const item of second.metadata) {
          const snapshotId = second.snapshots.find((s) => s.snapshotContentHash === item.snapshotContentHash)!.snapshotId;
          const meta = await persist.getSnapshotMetadata(snapshotId);
          assert.ok(meta?.licensingJson?.includes("test-license"));
          assert.ok(meta?.captureJson?.includes("fixture"));
        }
        // Third envelope: changed license text is preserved-away, not written.
        const relabeled = makeEnvelope({ scenarioId: id, licenseSuffix: "-tampered", snapshotBaseMs: sharedBaseMs });
        const third = await importHistoricalPackage(persist, relabeled, EDITOR, { nowIso: atSecond(20) });
        assert.equal(third.status, "completed");
        assert.ok(third.metadata.every((item) => item.reason?.code === "licensing_preserved"));
        for (const item of third.metadata) {
          const snapshotId = third.snapshots.find((s) => s.snapshotContentHash === item.snapshotContentHash)!.snapshotId;
          const meta = await persist.getSnapshotMetadata(snapshotId);
          assert.ok(meta?.licensingJson?.includes("test-license\"") || !meta?.licensingJson?.includes("tampered"));
          assert.equal(meta?.licensingJson?.includes("tampered"), false);
        }
      });

      await t.test("full review pipeline publishes a linked scenario with an audit trail", async () => {
        const id = scenarioId();
        await importHistoricalPackage(persist, makeEnvelope({ scenarioId: id }), EDITOR, { nowIso: NOW });
        const readiness = await getScenarioReadiness(persist, id, "1.0.0");
        assert.equal(readiness.ready, false);
        assert.deepEqual(readiness.reasons.map((reason) => reason.code), ["unresolved_review_requirement"]);
        const path = ["research", "point_in_time_validation", "review", "validated", "published"] as const;
        let step = 0;
        for (const toStatus of path) {
          step += 1;
          const result = await transitionScenarioReviewStatus(persist, {
            scenarioId: id,
            scenarioVersion: "1.0.0",
            toStatus,
            actor: EDITOR,
            reason: `approve-${toStatus}`,
            nowIso: atSecond(step)
          });
          assert.equal(result.noop, false);
          assert.ok(result.transitionId);
          assert.equal(result.toStatus, toStatus);
        }
        const final = await getScenarioReadiness(persist, id, "1.0.0");
        assert.equal(final.ready, true);
        assert.equal(final.reviewStatus, "published");
        assert.deepEqual(final.reasons, []);
        const trail = await persist.listReviewTransitions(id, "1.0.0");
        assert.equal(trail.length, 5);
        assert.deepEqual(trail.map((row) => row.toStatus), [...path]);
        assert.ok(trail.every((row) => row.actorUserId === EDITOR.userId));
      });

      await t.test("publication is blocked unless persisted facts are ready", async () => {
        const id = scenarioId();
        // Only one of two sources linked: valid import, incomplete coverage.
        await importHistoricalPackage(
          persist,
          makeEnvelope({ scenarioId: id, linkSources: ["source_ohlcv_demo"] }),
          EDITOR,
          { nowIso: NOW }
        );
        for (const [index, toStatus] of ["research", "point_in_time_validation", "review", "validated"].entries()) {
          await transitionScenarioReviewStatus(persist, {
            scenarioId: id,
            scenarioVersion: "1.0.0",
            toStatus,
            actor: EDITOR,
            nowIso: atSecond(100 + index)
          });
        }
        const before = await dbCounts(persist);
        await assert.rejects(
          transitionScenarioReviewStatus(persist, {
            scenarioId: id,
            scenarioVersion: "1.0.0",
            toStatus: "published",
            actor: EDITOR,
            nowIso: atSecond(200)
          }),
          serviceError("publication_not_ready")
        );
        // Failed publication writes nothing: still validated, audit unchanged.
        assert.equal(await persist.getScenarioReviewStatusColumn(id, "1.0.0"), "validated");
        assert.deepEqual(await dbCounts(persist, id), { ...before, transitions: 4 });
      });

      await t.test("transition policy: skips, terminals, noops, and unknown scenarios", async () => {
        const id = scenarioId();
        await importHistoricalPackage(persist, makeEnvelope({ scenarioId: id }), EDITOR, { nowIso: NOW });
        // Skip draft → validated.
        await assert.rejects(
          transitionScenarioReviewStatus(persist, {
            scenarioId: id, scenarioVersion: "1.0.0", toStatus: "validated", actor: EDITOR
          }),
          policyError("invalid_transition")
        );
        // Unknown target status.
        await assert.rejects(
          transitionScenarioReviewStatus(persist, {
            scenarioId: id, scenarioVersion: "1.0.0", toStatus: "archived", actor: EDITOR
          }),
          policyError("unknown_status")
        );
        // Noop records nothing but returns current readiness.
        const before = await dbCounts(persist);
        const noop = await transitionScenarioReviewStatus(persist, {
          scenarioId: id, scenarioVersion: "1.0.0", toStatus: "draft", actor: EDITOR
        });
        assert.equal(noop.noop, true);
        assert.equal(noop.transitionId, null);
        assert.equal(noop.readiness.reviewStatus, "draft");
        assert.deepEqual(await dbCounts(persist, id), before);
        // Unknown scenario.
        await assert.rejects(
          transitionScenarioReviewStatus(persist, {
            scenarioId: "missing", scenarioVersion: "9.9.9", toStatus: "research", actor: EDITOR
          }),
          serviceError("scenario_not_found")
        );
        await assert.rejects(getScenarioReadiness(persist, "missing", "9.9.9"), serviceError("scenario_not_found"));
        // Published is terminal.
        const pubId = scenarioId();
        await importHistoricalPackage(persist, makeEnvelope({ scenarioId: pubId }), EDITOR, { nowIso: NOW });
        for (const [index, toStatus] of ["research", "point_in_time_validation", "review", "validated", "published"].entries()) {
          await transitionScenarioReviewStatus(persist, {
            scenarioId: pubId, scenarioVersion: "1.0.0", toStatus, actor: EDITOR, nowIso: atSecond(300 + index)
          });
        }
        await assert.rejects(
          transitionScenarioReviewStatus(persist, {
            scenarioId: pubId, scenarioVersion: "1.0.0", toStatus: "review", actor: EDITOR
          }),
          policyError("terminal_state")
        );
      });
    } finally {
      if (handle) closeDatabase(handle);
      if (pool) await pool.end();
      if (adminPool) { await adminPool.query(`DROP SCHEMA "${schema}" CASCADE`); await adminPool.end(); }
    }
  });
}
