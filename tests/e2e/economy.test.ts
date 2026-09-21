import assert from "node:assert/strict";
import test from "node:test";

import { buildServer } from "../../apps/api-server/src/server.js";
import {
  LedgerEventPageSchema,
  UserBalanceSchema
} from "../../packages/contracts/src/index.js";

type Response = Awaited<ReturnType<ReturnType<typeof buildServer>["inject"]>>;

async function startSealedRun(
  server: ReturnType<typeof buildServer>,
  idempotencyKey: string
): Promise<string> {
  const startResponse = await server.inject({
    method: "POST",
    url: "/api/v1/scenario-runs",
    payload: {
      scenarioId: "foundation-false-breakout-001",
      scenarioVersion: "1.0.0",
      idempotencyKey
    }
  });
  assert.equal(startResponse.statusCode, 201);
  const runId = startResponse
    .json<{ data: { run: { runId: string } } }>()
    .data.run.runId;

  // The canonical demo decision (score 87, quality band 85–94 → ×1.30).
  const sealResponse = await server.inject({
    method: "POST",
    url: `/api/v1/scenario-runs/${runId}/seal`,
    payload: {
      action: "wait_for_confirmation",
      evidenceSourceIds: ["source_ohlcv_demo", "source_volume_demo"],
      invalidation: "Close below the failed breakout level.",
      confidence: 72
    }
  });
  assert.equal(sealResponse.statusCode, 200);
  return runId;
}

async function getBalance(
  server: ReturnType<typeof buildServer>,
  userId: string
): Promise<import("../../packages/contracts/src/index.js").UserBalance> {
  const response = await server.inject({
    method: "GET",
    url: `/api/v1/users/${userId}/balance`
  });
  assert.equal(response.statusCode, 200);
  return UserBalanceSchema.parse(
    response.json<{ data: { balance: Record<string, unknown> } }>().data.balance
  );
}

test("reveal grants XP and Mastery Stars exactly once (no double rewards)", async () => {
  const server = buildServer();

  const meResponse = await server.inject({ method: "GET", url: "/api/v1/users/me" });
  assert.equal(meResponse.statusCode, 200);
  const userId = meResponse.json<{ data: { userId: string } }>().data.userId;

  const before = await getBalance(server, userId);
  assert.equal(before.xp, 0);
  assert.equal(before.masteryStars, 0);
  assert.equal(before.coins, 0);
  assert.equal(before.energy, 5);

  const runId = await startSealedRun(server, "economy-test-001");

  const reveal1 = await server.inject({
    method: "POST",
    url: `/api/v1/scenario-runs/${runId}/reveal`
  });
  assert.equal(reveal1.statusCode, 200);
  const score = reveal1
    .json<{ data: { run: { score?: { score: number } } } }>()
    .data.run.score;
  assert.equal(score?.score, 87);

  // Guided academy scenario: 40 base × 1.30 (score 87) = 52 XP.
  const after = await getBalance(server, userId);
  assert.equal(after.xp, 52);
  assert.equal(after.accountLevel, 1);
  assert.equal(after.xpToNext, 125);
  assert.equal(after.masteryStars, 2, "score 87 → ★★☆");
  assert.equal(after.xpToday, 52);

  // Replayed reveal must not double-grant.
  const reveal2 = await server.inject({
    method: "POST",
    url: `/api/v1/scenario-runs/${runId}/reveal`
  });
  assert.equal(reveal2.statusCode, 200);
  const afterReplay = await getBalance(server, userId);
  assert.equal(afterReplay.xp, 52);
  assert.equal(afterReplay.masteryStars, 2);

  // The ledger holds exactly two reward events for the run.
  const ledgerResponse = await server.inject({
    method: "GET",
    url: `/api/v1/users/${userId}/ledger`
  });
  assert.equal(ledgerResponse.statusCode, 200);
  const page = LedgerEventPageSchema.parse(
    ledgerResponse.json<{ data: { events: unknown[]; asOf: string } }>().data
  );
  const rewardEvents = page.events.filter(
    (event) => event.scenarioId === "foundation-false-breakout-001"
  );
  assert.equal(rewardEvents.length, 2);
  const assets = rewardEvents.map((event) => event.asset).sort();
  assert.deepEqual(assets, ["mastery_stars", "xp"]);
  const keys = new Set(rewardEvents.map((event) => event.idempotencyKey));
  assert.equal(keys.size, 2);

  await server.close();
});

test("a second run grants rewards under its own idempotency keys", async () => {
  const server = buildServer();

  const meResponse = await server.inject({ method: "GET", url: "/api/v1/users/me" });
  const userId = meResponse.json<{ data: { userId: string } }>().data.userId;

  const runA = await startSealedRun(server, "economy-test-101");
  await server.inject({ method: "POST", url: `/api/v1/scenario-runs/${runA}/reveal` });

  const runB = await startSealedRun(server, "economy-test-102");
  const revealB = await server.inject({
    method: "POST",
    url: `/api/v1/scenario-runs/${runB}/reveal`
  });
  assert.equal(revealB.statusCode, 200);

  const balance = await getBalance(server, userId);
  assert.equal(balance.xp, 104, "two runs × 52 XP, no cap interaction at 500");
  assert.equal(balance.masteryStars, 4, "two runs × ★★☆");

  await server.close();
});
