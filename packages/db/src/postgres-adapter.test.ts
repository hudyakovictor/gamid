import assert from "node:assert/strict";
import test from "node:test";

import { Pool } from "pg";

import { starterScenario } from "../../content/src/fixtures/starter-scenario.js";
import { PostgresPersistenceAdapter } from "./postgres-adapter.js";

const postgresTestUrl = process.env.POSTGRES_TEST_URL;

test("PostgreSQL persistence runs the authoritative scenario lifecycle", {
  skip: !postgresTestUrl
}, async () => {
  if (!postgresTestUrl) {
    return;
  }

  const pool = new Pool({ connectionString: postgresTestUrl });
  const adapter = new PostgresPersistenceAdapter({ pool });
  try {
    await adapter.migrate();
    await adapter.checkReadiness();
    await pool.query(`
      TRUNCATE TABLE
        auth_replay_keys,
        auth_sessions,
        historical_snapshots,
        scenario_runs,
        user_identities,
        scenarios,
        users
      CASCADE
    `);

    const now = new Date().toISOString();
    await pool.query(`
      INSERT INTO users (user_id, external_id, created_at)
      VALUES ($1, $2, $3)
    `, ["pg-seed-user", "fixture:pg-seed-user", now]);
    await pool.query(`
      INSERT INTO scenarios (
        scenario_id,
        version,
        scenario_level,
        mode,
        content_version,
        data_version,
        future_hash,
        package_json,
        review_status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $10)
    `, [
      starterScenario.scenarioId,
      starterScenario.version,
      starterScenario.scenarioLevel,
      starterScenario.mode,
      starterScenario.contentVersion,
      starterScenario.dataVersion,
      starterScenario.futureHash,
      JSON.stringify(starterScenario),
      starterScenario.reviewStatus,
      now
    ]);

    const identity = await adapter.getOrCreateUserForIdentity({
      provider: "telegram",
      providerUserId: "pg-telegram-user"
    });
    assert.equal(identity.created, true);
    assert.equal(
      (await adapter.getOrCreateUserForIdentity({
        provider: "telegram",
        providerUserId: "pg-telegram-user"
      })).userId,
      identity.userId
    );

    assert.equal(await adapter.consumeAuthReplayKey("pg-replay-key", Date.now() + 60_000), true);
    assert.equal(await adapter.consumeAuthReplayKey("pg-replay-key", Date.now() + 60_000), false);

    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    await adapter.createAuthSession({
      sessionId: "pg-session",
      userId: identity.userId,
      tokenHash: "sha256:pg-session",
      createdAt: now,
      expiresAt
    });
    assert.equal(
      (await adapter.getActiveAuthSession("sha256:pg-session"))?.userId,
      identity.userId
    );
    assert.equal(await adapter.revokeAuthSession("pg-session"), true);
    assert.equal(await adapter.getActiveAuthSession("sha256:pg-session"), undefined);

    assert.deepEqual(
      await adapter.getScenarioPackage(starterScenario.scenarioId, starterScenario.version),
      starterScenario
    );

    const run = await adapter.createScenarioRun({
      runId: "pg-run",
      userId: "pg-seed-user",
      scenarioId: starterScenario.scenarioId,
      scenarioVersion: starterScenario.version,
      idempotencyKey: "pg-idempotency-key"
    });
    assert.equal(run.state, "started");

    const decision = {
      action: "wait_for_confirmation" as const,
      evidenceSourceIds: ["source_ohlcv_demo", "source_volume_demo"],
      invalidation: "Close below the failed breakout level.",
      confidence: 72
    };
    const score = {
      score: 87,
      breakdown: {
        decision_quality: 88,
        protocol_adherence: 90,
        evidence_quality: 84,
        follow_up_decision_quality: 80,
        risk_management: 92,
        invalidation: 86,
        discipline: 95,
        entity_resistance: 82,
        confidence_calibration: 89
      },
      rubricVersion: "score-v1"
    } as const;
    assert.equal((await adapter.sealScenarioRun("pg-run", "pg-seed-user", decision, score)).state, "sealed");
    assert.equal((await adapter.revealScenarioRun("pg-run", "pg-seed-user")).state, "revealed");

    const snapshot = {
      provider: "binance" as const,
      symbol: "BTCUSDT",
      interval: "1h",
      asOf: "2026-09-14T12:00:00.000Z",
      candles: [{
        openTime: "2026-09-14T11:00:00.000Z",
        closeTime: "2026-09-14T11:59:59.999Z",
        open: "100",
        high: "102",
        low: "99",
        close: "101",
        volume: "42.5"
      }],
      provenance: {
        sourceReference: "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h",
        observedAt: "2026-09-14T12:00:00.000Z",
        availableAt: "2026-09-14T12:01:00.000Z",
        timezone: "UTC",
        reliability: "high" as const,
        contentHash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        revisionStatus: "original" as const
      }
    };
    const persistedSnapshot = await adapter.upsertHistoricalSnapshot(snapshot, "pg-snapshot");
    assert.deepEqual(persistedSnapshot.snapshot, snapshot);
    assert.deepEqual(
      (await adapter.getHistoricalSnapshot("pg-snapshot"))?.snapshot,
      snapshot
    );
  } finally {
    await adapter.close();
    await pool.end();
  }
});
