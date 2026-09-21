import assert from "node:assert/strict";
import test from "node:test";

import { buildServer } from "../../apps/api-server/src/server.js";
import {
  CatalogResponseSchema,
  PurchaseSchema,
  UserBalanceSchema
} from "../../packages/contracts/src/index.js";

type Server = ReturnType<typeof buildServer>;

async function getBalance(server: Server, userId: string) {
  const response = await server.inject({
    method: "GET",
    url: `/api/v1/users/${userId}/balance`
  });
  assert.equal(response.statusCode, 200);
  return UserBalanceSchema.parse(
    response.json<{ data: { balance: Record<string, unknown> } }>().data.balance
  );
}

test("catalog exposes packs, services and Founder SKUs", async () => {
  const server = buildServer();
  const response = await server.inject({ method: "GET", url: "/api/v1/catalog" });
  assert.equal(response.statusCode, 200);
  const catalog = CatalogResponseSchema.parse(response.json().data);
  assert.equal(catalog.packs.length, 5);
  assert.equal(catalog.services.length, 4);
  assert.equal(catalog.skus.length, 3);
  assert.equal(catalog.packs.find((pack) => pack.packId === "pack_starter")?.coinsGranted, 100);
  assert.equal(catalog.skus.find((sku) => sku.skuId === "founder_v1")?.priceCoins, 899);
  await server.close();
});

test("Coin Pack purchase credits once per invoice (payment reconciliation)", async () => {
  const server = buildServer();
  const userId = (await server.inject({ method: "GET", url: "/api/v1/users/me" }))
    .json<{ data: { userId: string } }>()
    .data.userId;

  const buy = async (invoiceId: string) =>
    server.inject({
      method: "POST",
      url: "/api/v1/purchases",
      payload: {
        clientKey: `pack-${invoiceId}`,
        kind: "coin_pack",
        itemId: "pack_starter",
        invoiceId
      }
    });

  const first = await buy("inv-store-001");
  assert.equal(first.statusCode, 200);
  const firstBody = first.json<{
    data: { purchase: unknown; duplicate: boolean; balance: Record<string, unknown> };
  }>();
  assert.equal(firstBody.data.duplicate, false);
  PurchaseSchema.parse(firstBody.data.purchase);
  assert.equal(UserBalanceSchema.parse(firstBody.data.balance).coins, 100);

  // Replayed payment callback: same invoice, same user — no double credit.
  const replay = await buy("inv-store-001");
  assert.equal(replay.statusCode, 200);
  const replayBody = replay.json<{
    data: { purchase: unknown; duplicate: boolean; balance: Record<string, unknown> };
  }>();
  assert.equal(replayBody.data.duplicate, true);
  assert.equal(UserBalanceSchema.parse(replayBody.data.balance).coins, 100);

  // A different invoice for the same pack is a distinct payment.
  const second = await buy("inv-store-002");
  assert.equal(second.statusCode, 200);
  const secondBody = second.json<{
    data: { duplicate: boolean; balance: Record<string, unknown> };
  }>();
  assert.equal(secondBody.data.duplicate, false);
  assert.equal(UserBalanceSchema.parse(secondBody.data.balance).coins, 200);

  // Missing invoice is rejected.
  const noInvoice = await server.inject({
    method: "POST",
    url: "/api/v1/purchases",
    payload: { clientKey: "x", kind: "coin_pack", itemId: "pack_starter" }
  });
  assert.equal(noInvoice.statusCode, 422);

  await server.close();
});

test("service purchase spends Coins and grants the effect server-side", async () => {
  const server = buildServer();
  const userId = (await server.inject({ method: "GET", url: "/api/v1/users/me" }))
    .json<{ data: { userId: string } }>()
    .data.userId;

  // Fund the account first.
  await server.inject({
    method: "POST",
    url: "/api/v1/purchases",
    payload: {
      clientKey: "fund-1",
      kind: "coin_pack",
      itemId: "pack_starter",
      invoiceId: "inv-svc-001"
    }
  });

  const buyService = await server.inject({
    method: "POST",
    url: "/api/v1/purchases",
    payload: { clientKey: "svc-energy-1", kind: "service", itemId: "svc_energy_one" }
  });
  assert.equal(buyService.statusCode, 200);
  const body = buyService.json<{
    data: { duplicate: boolean; balance: Record<string, unknown> };
  }>();
  assert.equal(body.data.duplicate, false);
  assert.equal(UserBalanceSchema.parse(body.data.balance).coins, 80);

  // Duplicate client key: no second spend.
  const replay = await server.inject({
    method: "POST",
    url: "/api/v1/purchases",
    payload: { clientKey: "svc-energy-1", kind: "service", itemId: "svc_energy_one" }
  });
  assert.equal(replay.statusCode, 200);
  const replayBody = replay.json<{
    data: { duplicate: boolean; balance: Record<string, unknown> };
  }>();
  assert.equal(replayBody.data.duplicate, true);
  assert.equal(UserBalanceSchema.parse(replayBody.data.balance).coins, 80);

  const balance = await getBalance(server, userId);
  assert.equal(balance.coins, 80);

  await server.close();
});

test("insufficient balance is rejected without touching the ledger", async () => {
  const server = buildServer();
  const userId = (await server.inject({ method: "GET", url: "/api/v1/users/me" }))
    .json<{ data: { userId: string } }>()
    .data.userId;

  const before = await getBalance(server, userId);

  const response = await server.inject({
    method: "POST",
    url: "/api/v1/purchases",
    payload: { clientKey: "sku-rich", kind: "sku", itemId: "founder_v1" }
  });
  assert.equal(response.statusCode, 422);
  assert.equal(response.json().error, "insufficient_balance");

  const after = await getBalance(server, userId);
  assert.equal(after.coins, before.coins);
  assert.equal(after.energy, before.energy);

  await server.close();
});

test("SKU purchase grants entitlements, duplicate is idempotent, refund revokes", async () => {
  const server = buildServer();
  const userId = (await server.inject({ method: "GET", url: "/api/v1/users/me" }))
    .json<{ data: { userId: string } }>()
    .data.userId;

  // Fund: 1000 Stars pack → 2700 Coins.
  const fund = await server.inject({
    method: "POST",
    url: "/api/v1/purchases",
    payload: {
      clientKey: "fund-sku",
      kind: "coin_pack",
      itemId: "pack_patron",
      invoiceId: "inv-sku-001"
    }
  });
  assert.equal(fund.statusCode, 200);

  const buySku = await server.inject({
    method: "POST",
    url: "/api/v1/purchases",
    payload: { clientKey: "sku-supporter", kind: "sku", itemId: "founder_supporter_v1" }
  });
  assert.equal(buySku.statusCode, 200);
  const skuBody = buySku.json<{
    data: { purchase: unknown; duplicate: boolean; balance: Record<string, unknown> };
  }>();
  assert.equal(skuBody.data.duplicate, false);
  const purchase = PurchaseSchema.parse(skuBody.data.purchase);
  assert.equal(purchase.itemId, "founder_supporter_v1");
  assert.equal(purchase.priceCoins, 299);
  assert.equal(UserBalanceSchema.parse(skuBody.data.balance).coins, 2401);

  // Duplicate: same client key, no second charge.
  const replay = await server.inject({
    method: "POST",
    url: "/api/v1/purchases",
    payload: { clientKey: "sku-supporter", kind: "sku", itemId: "founder_supporter_v1" }
  });
  const replayBody = replay.json<{
    data: { duplicate: boolean; balance: Record<string, unknown> };
  }>();
  assert.equal(replayBody.data.duplicate, true);
  assert.equal(UserBalanceSchema.parse(replayBody.data.balance).coins, 2401);

  // Refund: coins back, entitlements revoked, purchase marked refunded.
  const refund = await server.inject({
    method: "POST",
    url: `/api/v1/purchases/${purchase.purchaseId}/refund`,
    payload: { clientKey: "refund-1" }
  });
  assert.equal(refund.statusCode, 200);
  const refunded = PurchaseSchema.parse(refund.json().data.purchase);
  assert.equal(refunded.state, "refunded");
  assert.ok(refunded.refundedAt);

  const afterRefund = await getBalance(server, userId);
  assert.equal(afterRefund.coins, 2700);

  // Second refund is rejected.
  const secondRefund = await server.inject({
    method: "POST",
    url: `/api/v1/purchases/${purchase.purchaseId}/refund`,
    payload: { clientKey: "refund-2" }
  });
  assert.equal(secondRefund.statusCode, 409);

  await server.close();
});
