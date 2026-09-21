import assert from "node:assert/strict";
import test from "node:test";

import { buildServer } from "../../apps/api-server/src/server.js";
import {
  attributeReferral,
  createReferralCode,
  onInviteePurchase,
  ReferralError,
  REFERRAL_ACTIVATION_REWARD_COINS,
  REFERRAL_PURCHASE_BONUS_COINS,
  syncReferralProgress
} from "../../apps/api-server/src/referrals.js";
import {
  closeDatabase,
  createDatabase,
  SqlitePersistenceAdapter
} from "../../packages/db/src/index.js";
import { UserBalanceSchema } from "../../packages/contracts/src/index.js";

function makeUsers(handle: Parameters<typeof closeDatabase>[0]): {
  inviter: string;
  invitee: string;
} {
  // Minimal scenario row so the scenario_runs foreign key can be satisfied.
  handle.sqlite
    .prepare(
      `INSERT INTO scenarios (
        scenario_id, version, scenario_level, mode, content_version, data_version,
        future_hash, package_json, review_status, created_at, updated_at
      ) VALUES (
        'foundation-false-breakout-001', '1.0.0', 3, 'academy', 'c', 'd',
        'sha256:test', '{}', 'validated', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'
      )`
    )
    .run();
  handle.sqlite
    .prepare("INSERT INTO users (user_id, external_id, created_at) VALUES (?, ?, ?)")
    .run("ref-inviter-1", "ext-ref-inviter-1", "2024-01-01T00:00:00Z");
  handle.sqlite
    .prepare("INSERT INTO users (user_id, external_id, created_at) VALUES (?, ?, ?)")
    .run("ref-invitee-1", "ext-ref-invitee-1", "2024-01-01T00:00:00Z");
  return { inviter: "ref-inviter-1", invitee: "ref-invitee-1" };
}

test("referral lifecycle: code → attribution → 3 scenarios → both sides paid once", async () => {
  const handle = createDatabase();
  try {
    const { inviter, invitee } = makeUsers(handle);
    const persist = new SqlitePersistenceAdapter(handle);
    const now = "2024-01-10T10:00:00Z";

    // One code per inviter, idempotent.
    const first = await createReferralCode(persist, inviter, now);
    assert.equal(first.created, true);
    const second = await createReferralCode(persist, inviter, now);
    assert.equal(second.created, false);
    assert.equal(second.referral.code, first.referral.code);
    const code = first.referral.code;

    // Attribution.
    const attributed = await attributeReferral(persist, {
      code,
      inviteeId: invitee,
      nowIso: now
    });
    assert.equal(attributed.state, "attributed");

    // Re-attribution by the same invitee is idempotent.
    const reAttributed = await attributeReferral(persist, {
      code,
      inviteeId: invitee,
      nowIso: now
    });
    assert.equal(reAttributed.state, "attributed");

    // Two scenarios: not yet activated, no rewards.
    for (let i = 0; i < 2; i += 1) {
      handle.sqlite
        .prepare(
          `INSERT INTO scenario_runs (
            run_id, user_id, scenario_id, scenario_version, state, idempotency_key, created_at
          ) VALUES (?, ?, 'foundation-false-breakout-001', '1.0.0', 'completed', ?, ?)`
        )
        .run(`ref-run-${i}`, invitee, `ref-run-${i}`, now);
      const progress = await syncReferralProgress(persist, invitee, now);
      assert.equal(progress.activated, false);
    }

    const inviterBefore = await persist.deriveUserBalance(inviter, now);
    const inviteeBefore = await persist.deriveUserBalance(invitee, now);
    assert.equal(inviterBefore.coins, 0);
    assert.equal(inviteeBefore.coins, 0);

    // Third scenario: activation pays 25 promo Coins to BOTH sides, once.
    handle.sqlite
      .prepare(
        `INSERT INTO scenario_runs (
          run_id, user_id, scenario_id, scenario_version, state, idempotency_key, created_at
        ) VALUES (?, ?, 'foundation-false-breakout-001', '1.0.0', 'completed', ?, ?)`
      )
      .run("ref-run-3", invitee, "ref-run-3", now);
    const activation = await syncReferralProgress(persist, invitee, now);
    assert.equal(activation.activated, true);
    assert.equal(activation.inviterRewardGranted, true);
    assert.equal(activation.inviteeRewardGranted, true);

    const inviterAfter = await persist.deriveUserBalance(inviter, now);
    const inviteeAfter = await persist.deriveUserBalance(invitee, now);
    assert.equal(inviterAfter.coins, REFERRAL_ACTIVATION_REWARD_COINS);
    assert.equal(inviterAfter.coinsPromo, REFERRAL_ACTIVATION_REWARD_COINS);
    assert.equal(inviteeAfter.coins, REFERRAL_ACTIVATION_REWARD_COINS);

    // Replayed sync: no second payment.
    const replay = await syncReferralProgress(persist, invitee, now);
    assert.equal(replay.activated, true);
    assert.equal(replay.inviterRewardGranted, false);
    const inviterReplay = await persist.deriveUserBalance(inviter, now);
    assert.equal(inviterReplay.coins, REFERRAL_ACTIVATION_REWARD_COINS);

    // First confirmed purchase pays the inviter 50 promo Coins, once.
    const bonus = await onInviteePurchase(persist, invitee, now);
    assert.equal(bonus.bonusGranted, true);
    const inviterBonus = await persist.deriveUserBalance(inviter, now);
    assert.equal(inviterBonus.coins, REFERRAL_ACTIVATION_REWARD_COINS + REFERRAL_PURCHASE_BONUS_COINS);

    const bonusReplay = await onInviteePurchase(persist, invitee, now);
    assert.equal(bonusReplay.bonusGranted, false);
    const inviterReplay2 = await persist.deriveUserBalance(inviter, now);
    assert.equal(
      inviterReplay2.coins,
      REFERRAL_ACTIVATION_REWARD_COINS + REFERRAL_PURCHASE_BONUS_COINS
    );
    UserBalanceSchema.parse(inviterReplay2);
  } finally {
    closeDatabase(handle);
  }
});

test("self-referral is rejected without rewards", async () => {
  const handle = createDatabase();
  try {
    const { inviter } = makeUsers(handle);
    const persist = new SqlitePersistenceAdapter(handle);
    const { referral } = await createReferralCode(persist, inviter, "2024-01-10T10:00:00Z");

    await assert.rejects(
      () =>
        attributeReferral(persist, {
          code: referral.code,
          inviteeId: inviter,
          nowIso: "2024-01-10T10:00:00Z"
        }),
      (error: unknown) =>
        error instanceof ReferralError && error.code === "self_referral"
    );

    const balance = await persist.deriveUserBalance(inviter, "2024-01-10T10:00:00Z");
    assert.equal(balance.coins, 0);
  } finally {
    closeDatabase(handle);
  }
});

test("HTTP: referral code endpoint is idempotent; self-attribution returns 409", async () => {
  const server = buildServer();
  const userId = (await server.inject({ method: "GET", url: "/api/v1/users/me" }))
    .json<{ data: { userId: string } }>()
    .data.userId;

  const first = await server.inject({
    method: "POST",
    url: "/api/v1/referrals",
    payload: { clientKey: "code-1" }
  });
  assert.equal(first.statusCode, 200);
  const firstBody = first.json<{ data: { code: string; created: boolean } }>();
  assert.equal(firstBody.data.created, true);
  assert.ok(firstBody.data.code.startsWith("SA-"));

  const second = await server.inject({
    method: "POST",
    url: "/api/v1/referrals",
    payload: { clientKey: "code-2" }
  });
  const secondBody = second.json<{ data: { code: string; created: boolean } }>();
  assert.equal(secondBody.data.created, false);
  assert.equal(secondBody.data.code, firstBody.data.code);

  const selfAttribute = await server.inject({
    method: "POST",
    url: "/api/v1/referrals/attribute",
    payload: { code: firstBody.data.code }
  });
  assert.equal(selfAttribute.statusCode, 409);
  assert.equal(selfAttribute.json().error, "self_referral");

  const unknown = await server.inject({
    method: "POST",
    url: "/api/v1/referrals/attribute",
    payload: { code: "SA-NOPE00" }
  });
  assert.equal(unknown.statusCode, 404);

  await server.close();
});
