import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import { createDatabase, closeDatabase, SqlitePersistenceAdapter, PostgresPersistenceAdapter } from "./index.js";
import type { PersistencePort } from "./ports.js";
import { purchaseService, purchaseSku, refundPurchase } from "../../../apps/api-server/src/store.js";
import { syncReferralProgress, onInviteePurchase } from "../../../apps/api-server/src/referrals.js";
import { FOUNDER_SKUS } from "../../domain/src/catalog.js";
import { starterScenario } from "../../content/src/fixtures/starter-scenario.js";

const now = "2026-09-21T12:00:00.000Z";

// Inject *after* a real persistence mutation, not before it, to test rollback.
function failAfter(persist: PersistencePort, method: keyof PersistencePort): PersistencePort {
  let failed = false;
  return new Proxy(persist, {
    get(target, key) {
      const value: unknown = Reflect.get(target, key);
      if (typeof value !== "function") return value;
      return async (...args: unknown[]) => {
        const result: unknown = await value.apply(target, args);
        if (key === method && !failed) { failed = true; throw new Error("injected failure"); }
        return result;
      };
    }
  });
}

for (const driver of ["sqlite", "postgres"] as const) {
  test(`${driver}: atomic checkout, refunds, supply and referral failure/concurrency`, { skip: driver === "postgres" && !process.env.POSTGRES_TEST_URL }, async (t) => {
    const handle = driver === "sqlite" ? createDatabase() : undefined;
    const schema = `economic_${randomUUID().replaceAll("-", "")}`;
    const adminPool = driver === "postgres" ? new Pool({ connectionString: process.env.POSTGRES_TEST_URL }) : undefined;
    if (adminPool) await adminPool.query(`CREATE SCHEMA "${schema}"`);
    const pool = adminPool ? new Pool({ connectionString: process.env.POSTGRES_TEST_URL, options: `-c search_path=${schema}` }) : undefined;
    const persist: PersistencePort = handle ? new SqlitePersistenceAdapter(handle) : new PostgresPersistenceAdapter({ pool: pool! });
    if (persist instanceof PostgresPersistenceAdapter) await persist.migrate();
    const prefix = randomUUID();
    let seq = 0;
    const user = async (coins = 0) => {
      const id = ++seq;
      const { userId } = await persist.getOrCreateUserForIdentity({ provider: "telegram", providerUserId: `${prefix}-${id}` });
      if (coins) await persist.recordLedgerEvent({ userId, asset: "coins", amount: coins, reason: "compensation", idempotencyKey: `${prefix}-fund-${id}`, createdAt: now });
      return userId;
    };
    const balance = async (userId: string) => (await persist.deriveUserBalance(userId, now)).coins;
    const buy = (p: PersistencePort, userId: string, key: string) => purchaseSku(p, { userId, skuId: "founder_supporter_v1", clientKey: key, nowIso: now });
    try {
      await t.test("checkout rolls back ledger, purchase and entitlements after each failure", async () => {
        for (const step of ["recordLedgerEvent", "createPurchase", "grantEntitlement"] as const) {
          const userId = await user(1000);
          await assert.rejects(buy(failAfter(persist, step), userId, step), /injected failure/);
          assert.equal(await balance(userId), 1000);
          assert.equal(await persist.getPurchaseByIdempotencyKey(`purchase:sku:${userId}:${step}`), undefined);
          assert.deepEqual(await persist.listActiveEntitlements(userId), []);
          const retried = await buy(persist, userId, step);
          assert.equal(retried.duplicate, false);
          assert.equal(await balance(userId), 701);
        }
      });
      await t.test("concurrent balance checks cannot overspend; duplicate checkout charges once", async () => {
        const userId = await user(20);
        const outcomes = await Promise.allSettled(Array.from({ length: 8 }, (_, i) => purchaseService(persist, { userId, serviceId: "svc_energy_one", clientKey: String(i), nowIso: now })));
        assert.equal(outcomes.filter((result) => result.status === "fulfilled").length, 1);
        assert.equal(await balance(userId), 0);
        const duplicateUser = await user(1000);
        const duplicates = await Promise.all(Array.from({ length: 8 }, () => buy(persist, duplicateUser, "same")));
        assert.equal(duplicates.filter((result) => !result.duplicate).length, 1);
        assert.equal(new Set(duplicates.map((result) => result.purchase.purchaseId)).size, 1);
        assert.equal(await balance(duplicateUser), 701);
      });
      await t.test("limited supply rolls back after reservation and concurrent claims respect limit", async () => {
        const item = `${prefix}-limited`;
        await assert.rejects(persist.atomic(async () => {
          assert.equal(await persist.reserveSupply(item, 1), true);
          throw new Error("injected failure");
        }), /injected failure/);
        const results = await Promise.all(Array.from({ length: 12 }, () => persist.atomic(() => persist.reserveSupply(item, 1))));
        assert.equal(results.filter(Boolean).length, 1);
      });
      await t.test("limited checkout reserves, charges and grants as one unit", async () => {
        const skuId = `${prefix}-limited-sku`;
        FOUNDER_SKUS.push({ ...FOUNDER_SKUS[0]!, skuId, supplyLimit: 1 });
        try {
          const users = await Promise.all(Array.from({ length: 6 }, () => user(1000)));
          const purchase = (p: PersistencePort, userId: string) => purchaseSku(p, { userId, skuId, clientKey: "limited", nowIso: now });
          for (const step of ["reserveSupply", "recordLedgerEvent", "createPurchase", "grantEntitlement"] as const) {
            await assert.rejects(purchase(failAfter(persist, step), users[0]!), /injected failure/);
            assert.equal(await balance(users[0]!), 1000);
          }
          const results = await Promise.allSettled(users.map((id) => purchase(persist, id)));
          const winners = results.filter((result) => result.status === "fulfilled");
          assert.equal(winners.length, 1);
          for (let i = 0; i < results.length; i++) {
            assert.equal(await balance(users[i]!), results[i]!.status === "fulfilled" ? 701 : 1000);
          }
          const winner = winners[0]!;
          if (winner.status !== "fulfilled") throw new Error("missing winner");
          const params = { userId: winner.value.purchase.userId, purchaseId: winner.value.purchase.purchaseId, clientKey: "refund", nowIso: now };
          await assert.rejects(refundPurchase(failAfter(persist, "markPurchaseRefunded"), params), /injected failure/);
          assert.equal(await persist.reserveSupply(skuId, 1), false);
          await Promise.all(Array.from({ length: 8 }, () => refundPurchase(persist, params)));
          assert.equal(await persist.reserveSupply(skuId, 1), true);
          assert.equal(await persist.reserveSupply(skuId, 1), false);
        } finally { FOUNDER_SKUS.splice(FOUNDER_SKUS.findIndex((sku) => sku.skuId === skuId), 1); }
      });
      await t.test("refund failures roll back all effects; concurrent/repeated refunds credit once", async () => {
        for (const step of ["recordLedgerEvent", "revokeEntitlement", "releaseSupply", "markPurchaseRefunded"] as const) {
          const userId = await user(1000);
          const { purchase } = await buy(persist, userId, step);
          const before = await persist.listActiveEntitlements(userId);
          const params = { userId, purchaseId: purchase.purchaseId, clientKey: "refund", nowIso: now };
          await assert.rejects(refundPurchase(failAfter(persist, step), params), /injected failure/);
          assert.equal(await balance(userId), 701);
          assert.equal((await persist.getPurchase(purchase.purchaseId, userId))?.state, "completed");
          assert.deepEqual(await persist.listActiveEntitlements(userId), before);
          const results = await Promise.all(Array.from({ length: 8 }, () => refundPurchase(persist, params)));
          assert.ok(results.every((result) => result.state === "refunded"));
          assert.equal(await balance(userId), 1000);
          assert.deepEqual(await persist.listActiveEntitlements(userId), []);
        }
      });
      await t.test("Energy and unverified Coin Pack refunds fail closed", async () => {
        const userId = await user(100);
        const energy = await purchaseService(persist, { userId, serviceId: "svc_energy_one", clientKey: "energy", nowIso: now });
        await persist.recordLedgerEvent({ userId, asset: "energy", amount: -1, reason: "energy_spent", idempotencyKey: `${prefix}-consume`, createdAt: now });
        await assert.rejects(refundPurchase(persist, { userId, purchaseId: energy.purchase.purchaseId, clientKey: "refund" }), /Energy/);
        assert.equal(await balance(userId), 80);
        const pack = await persist.createPurchase({ purchaseId: randomUUID(), userId, kind: "coin_pack", itemId: "pack_starter", invoiceId: `${prefix}-untrusted`, priceCoins: 0, idempotencyKey: `${prefix}-pack`, createdAt: now });
        await assert.rejects(refundPurchase(persist, { userId, purchaseId: pack.purchaseId, clientKey: "refund" }), /verified platform refund/);
        assert.equal((await persist.getPurchase(pack.purchaseId, userId))?.state, "completed");
      });
      await t.test("referral activation/rewards roll back and safely retry; cap grants serialize", async () => {
        await persist.upsertScenarioPackage(starterScenario, now);
        const inviter = await user();
        const invitee = await user();
        const { referral } = await persist.getOrCreateReferral({ inviterId: inviter, createdAt: now });
        await persist.attributeReferral({ code: referral.code, inviteeId: invitee, attributedAt: now, windowExpiresAt: "2026-09-28T12:00:00.000Z" });
        // Test fixture valid completions; no client API can set this state.
        for (let i = 0; i < 3; i++) {
          const run = await persist.createScenarioRun({ runId: randomUUID(), userId: invitee, scenarioId: starterScenario.scenarioId, scenarioVersion: starterScenario.version, idempotencyKey: `${prefix}-ref-run-${i}` });
          if (handle) handle.sqlite.prepare("UPDATE scenario_runs SET state = 'completed' WHERE run_id = ?").run(run.runId);
          else await pool!.query("UPDATE scenario_runs SET state = 'completed' WHERE run_id = $1", [run.runId]);
        }
        for (const step of ["activateReferral", "recordLedgerEvent"] as const) {
          await assert.rejects(syncReferralProgress(failAfter(persist, step), invitee, now), /injected failure/);
          assert.equal((await persist.getReferralByCode(referral.code))?.state, "attributed");
          assert.equal(await balance(inviter), 0);
          assert.equal(await balance(invitee), 0);
        }
        await Promise.all(Array.from({ length: 8 }, () => syncReferralProgress(persist, invitee, now)));
        assert.equal(await balance(inviter), 25);
        assert.equal(await balance(invitee), 25);
        await assert.rejects(onInviteePurchase(failAfter(persist, "grantReferralPurchaseBonus"), invitee, now), /injected failure/);
        assert.equal(await balance(inviter), 25);
        assert.equal((await persist.getReferralByCode(referral.code))?.purchaseBonusAt, null);
        // Bring the inviter to exactly one bonus below the monthly cap.
        await persist.recordLedgerEvent({ userId: inviter, asset: "coins", amount: 175, reason: "referral_activation", promo: true, idempotencyKey: `${prefix}-cap-fill`, createdAt: now });
        await Promise.all(Array.from({ length: 12 }, () => onInviteePurchase(persist, invitee, now)));
        assert.equal(await balance(inviter), 250);
        assert.equal(await persist.sumPromoCoinsInRange(inviter, "2026-09-01T00:00:00.000Z", "2026-10-01T00:00:00.000Z"), 250);
      });
      await t.test("distinct concurrent referral rewards cannot cross the monthly cap", async () => {
        const target = await user();
        const invitee = await user();
        const otherInviter = await user();
        const first = (await persist.getOrCreateReferral({ inviterId: target, createdAt: now })).referral;
        const second = (await persist.getOrCreateReferral({ inviterId: otherInviter, createdAt: now })).referral;
        for (const [code, inviteeId] of [[first.code, invitee], [second.code, target]] as const) {
          await persist.attributeReferral({ code, inviteeId, attributedAt: now, windowExpiresAt: "2026-09-28T12:00:00.000Z" });
        }
        await persist.activateReferral(first.code, now);
        await persist.recordLedgerEvent({ userId: target, asset: "coins", amount: 200, reason: "referral_activation", promo: true, idempotencyKey: `${prefix}-distinct-cap`, createdAt: now });
        for (let i = 0; i < 3; i++) {
          const run = await persist.createScenarioRun({ runId: randomUUID(), userId: target, scenarioId: starterScenario.scenarioId, scenarioVersion: starterScenario.version, idempotencyKey: `${prefix}-distinct-run-${i}` });
          if (handle) handle.sqlite.prepare("UPDATE scenario_runs SET state = 'completed' WHERE run_id = ?").run(run.runId);
          else await pool!.query("UPDATE scenario_runs SET state = 'completed' WHERE run_id = $1", [run.runId]);
        }
        await Promise.all([syncReferralProgress(persist, target, now), onInviteePurchase(persist, invitee, now)]);
        const granted = await persist.sumPromoCoinsInRange(target, "2026-09-01T00:00:00.000Z", "2026-10-01T00:00:00.000Z");
        assert.ok(granted === 225 || granted === 250, `cap must serialize distinct reward keys, got ${granted}`);
      });
    } finally {
      if (handle) closeDatabase(handle);
      if (pool) await pool.end();
      if (adminPool) { await adminPool.query(`DROP SCHEMA "${schema}" CASCADE`); await adminPool.end(); }
    }
  });
}
