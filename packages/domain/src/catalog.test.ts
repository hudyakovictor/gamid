import assert from "node:assert/strict";
import test from "node:test";

import {
  COIN_PACKS,
  FOUNDER_SKUS,
  getCatalogSku,
  getCoinPack,
  getStoreService,
  SUBSCRIPTION_PRICES,
  TOURNAMENT_TICKET_PRICES,
  validateCatalog
} from "./catalog.js";

test("catalog passes its own validation", () => {
  assert.deepEqual(validateCatalog(), []);
});

test("Coin Pack table matches the economy spec", () => {
  assert.equal(COIN_PACKS.length, 5);
  assert.deepEqual(getCoinPack("pack_starter"), {
    packId: "pack_starter",
    starsPrice: 50,
    coinsGranted: 100
  });
  assert.equal(getCoinPack("pack_standard")?.coinsGranted, 220);
  assert.equal(getCoinPack("pack_arena")?.coinsGranted, 600);
  assert.equal(getCoinPack("pack_vault")?.coinsGranted, 1300);
  assert.equal(getCoinPack("pack_patron")?.coinsGranted, 2700);
  // Base rate: 1 Telegram Star = 2 Coins.
  assert.equal(getCoinPack("pack_starter")?.coinsGranted, 50 * 2);
  assert.equal(getCoinPack("pack_unknown"), undefined);
});

test("store services match the economy spec prices", () => {
  assert.equal(getStoreService("svc_energy_one")?.priceCoins, 20);
  assert.equal(getStoreService("svc_energy_refill")?.priceCoins, 75);
  assert.equal(getStoreService("svc_name_change")?.priceCoins, 100);
  assert.equal(getStoreService("svc_extended_analytics")?.priceCoins, 120);
});

test("tournament and subscription prices match the economy spec", () => {
  assert.equal(TOURNAMENT_TICKET_PRICES.weekly, 100);
  assert.equal(TOURNAMENT_TICKET_PRICES.ranked, 150);
  assert.equal(TOURNAMENT_TICKET_PRICES.seasonal, 250);
  assert.equal(TOURNAMENT_TICKET_PRICES.private_creation, 500);
  assert.equal(SUBSCRIPTION_PRICES.premium_30d, 599);
  assert.equal(SUBSCRIPTION_PRICES.arena_pass_30d, 749);
  assert.equal(SUBSCRIPTION_PRICES.premium_and_arena_pass_30d, 1199);
});

test("Founder SKUs match the catalog spec", () => {
  assert.equal(FOUNDER_SKUS.length, 3);
  assert.equal(getCatalogSku("founder_supporter_v1")?.priceCoins, 299);
  assert.equal(getCatalogSku("founder_v1")?.priceCoins, 899);
  assert.equal(getCatalogSku("founding_arena_v1")?.priceCoins, 1799);
  for (const sku of FOUNDER_SKUS) {
    assert.equal(sku.paymentMode, "coins");
    assert.equal(sku.optionalDirectStarsPrice, undefined);
    assert.equal(sku.status, "limited");
    assert.ok(sku.entitlementIds.length > 0);
  }
});
