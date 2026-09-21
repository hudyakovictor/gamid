import { randomUUID } from "node:crypto";

import type { Purchase } from "../../../packages/contracts/src/catalog.js";
import { canSpend } from "../../../packages/domain/src/economy.js";
import {
  getCatalogSku,
  getStoreService
} from "../../../packages/domain/src/catalog.js";
import type { PersistencePort } from "../../../packages/db/src/ports.js";
import type { UserBalance } from "../../../packages/contracts/src/economy.js";

/**
 * Store / checkout orchestration (P1-7b).
 *
 * Flow per catalog_sku_spec.md §4:
 *   catalog → preview → Coins spend authorization → idempotent ledger
 *   mutation → entitlement grant → inventory.
 *
 * The client never grants an entitlement or mutates a balance: every
 * branch below is server-side and idempotent (duplicate payments and
 * duplicate entitlement grants are rejected, never double-applied).
 */

type StorePersistence = Pick<
  PersistencePort,
  | "atomic"
  | "deriveUserBalance"
  | "recordLedgerEvent"
  | "createPurchase"
  | "getPurchaseByIdempotencyKey"
  | "getPurchaseByInvoice"
  | "getPurchase"
  | "markPurchaseRefunded"
  | "reserveSupply"
  | "releaseSupply"
  | "grantEntitlement"
  | "revokeEntitlement"
>;

export class StoreError extends Error {
  public constructor(
    public readonly code:
      | "unknown_item"
      | "insufficient_balance"
      | "supply_exhausted"
      | "missing_invoice"
      | "already_refunded"
      | "verified_refund_required"
      | "non_refundable_effect"
      | "entitlement_conflict",
    message: string
  ) {
    super(message);
    this.name = "StoreError";
  }
}

export type PurchaseOutcome = {
  purchase: Purchase;
  duplicate: boolean;
  balance: UserBalance;
};

export async function purchaseService(
  persist: StorePersistence,
  params: {
    userId: string;
    serviceId: string;
    clientKey: string;
    nowIso?: string;
  }
): Promise<PurchaseOutcome> {
  return persist.atomic(() => purchaseServiceInTransaction(persist, params));
}

async function purchaseServiceInTransaction(
  persist: StorePersistence,
  params: {
    userId: string;
    serviceId: string;
    clientKey: string;
    nowIso?: string;
  }
): Promise<PurchaseOutcome> {
  const nowIso = params.nowIso ?? new Date().toISOString();
  const service = getStoreService(params.serviceId);
  if (!service) {
    throw new StoreError("unknown_item", `Unknown service: ${params.serviceId}`);
  }

  const purchaseId = randomUUID();
  const idempotencyKey = `purchase:service:${params.userId}:${params.clientKey}`;
  const byKey = await persist.getPurchaseByIdempotencyKey(idempotencyKey);
  if (byKey) {
    return {
      purchase: byKey,
      duplicate: true,
      balance: await persist.deriveUserBalance(params.userId, nowIso)
    };
  }

  const balance = await persist.deriveUserBalance(params.userId, nowIso);
  if (!canSpend(balance.coins, service.priceCoins)) {
    throw new StoreError(
      "insufficient_balance",
      `Need ${service.priceCoins} Coins, balance is ${balance.coins}`
    );
  }

  const spend = await persist.recordLedgerEvent({
    userId: params.userId,
    asset: "coins",
    amount: -service.priceCoins,
    reason: "service_purchased",
    idempotencyKey,
    createdAt: nowIso
  });
  if (!spend.inserted) {
    const existing = await persist.getPurchaseByIdempotencyKey(idempotencyKey);
    return {
      purchase: existing ?? {
        purchaseId,
        userId: params.userId,
        kind: "service",
        itemId: service.serviceId,
        priceCoins: service.priceCoins,
        state: "completed",
        createdAt: nowIso
      },
      duplicate: true,
      balance: await persist.deriveUserBalance(params.userId, nowIso)
    };
  }

  await persist.createPurchase({
    purchaseId,
    userId: params.userId,
    kind: "service",
    itemId: service.serviceId,
    priceCoins: service.priceCoins,
    idempotencyKey,
    createdAt: nowIso
  });

  // Server applies the effect. Energy services mint Energy via the ledger;
  // entitlement-style services get an entitlement record.
  if (service.effect === "energy_one") {
    await persist.recordLedgerEvent({
      userId: params.userId,
      asset: "energy",
      amount: 1,
      reason: "energy_refilled",
      idempotencyKey: `${idempotencyKey}:grant`,
      createdAt: nowIso
    });
  } else if (service.effect === "energy_refill") {
    const current = await persist.deriveUserBalance(params.userId, nowIso);
    const missing = current.energyCap - current.energy;
    if (missing > 0) {
      await persist.recordLedgerEvent({
        userId: params.userId,
        asset: "energy",
        amount: missing,
        reason: "energy_refilled",
        idempotencyKey: `${idempotencyKey}:grant`,
        createdAt: nowIso
      });
    }
  } else {
    const grant = await persist.grantEntitlement({
      userId: params.userId,
      entitlementKey: `${service.effect}:${params.userId}`,
      sourcePurchaseId: purchaseId,
      createdAt: nowIso
    });
    if (!grant.inserted) throw new StoreError("entitlement_conflict", "Entitlement already exists");
  }

  return {
    purchase: {
      purchaseId,
      userId: params.userId,
      kind: "service",
      itemId: service.serviceId,
      priceCoins: service.priceCoins,
      state: "completed",
      createdAt: nowIso
    },
    duplicate: false,
    balance: await persist.deriveUserBalance(params.userId, nowIso)
  };
}

export async function purchaseSku(
  persist: StorePersistence,
  params: {
    userId: string;
    skuId: string;
    clientKey: string;
    nowIso?: string;
  }
): Promise<PurchaseOutcome> {
  return persist.atomic(() => purchaseSkuInTransaction(persist, params));
}

async function purchaseSkuInTransaction(
  persist: StorePersistence,
  params: {
    userId: string;
    skuId: string;
    clientKey: string;
    nowIso?: string;
  }
): Promise<PurchaseOutcome> {
  const nowIso = params.nowIso ?? new Date().toISOString();
  const sku = getCatalogSku(params.skuId);
  if (!sku) {
    throw new StoreError("unknown_item", `Unknown SKU: ${params.skuId}`);
  }
  if (sku.status === "retired") {
    throw new StoreError("unknown_item", `SKU is retired: ${params.skuId}`);
  }

  const purchaseId = randomUUID();
  const idempotencyKey = `purchase:sku:${params.userId}:${params.clientKey}`;
  const byKey = await persist.getPurchaseByIdempotencyKey(idempotencyKey);
  if (byKey) {
    return {
      purchase: byKey,
      duplicate: true,
      balance: await persist.deriveUserBalance(params.userId, nowIso)
    };
  }

  const balance = await persist.deriveUserBalance(params.userId, nowIso);
  if (!canSpend(balance.coins, sku.priceCoins)) {
    throw new StoreError(
      "insufficient_balance",
      `Need ${sku.priceCoins} Coins, balance is ${balance.coins}`
    );
  }

  // Atomic supply reservation before any money moves.
  const reserved = await persist.reserveSupply(sku.skuId, sku.supplyLimit);
  if (!reserved) {
    throw new StoreError("supply_exhausted", `SKU supply exhausted: ${sku.skuId}`);
  }

  const spend = await persist.recordLedgerEvent({
    userId: params.userId,
    asset: "coins",
    amount: -sku.priceCoins,
    reason: "sku_purchased",
    idempotencyKey,
    createdAt: nowIso
  });
  if (!spend.inserted) {
    await persist.releaseSupply(sku.skuId);
    const existing = await persist.getPurchaseByIdempotencyKey(idempotencyKey);
    return {
      purchase: existing ?? {
        purchaseId,
        userId: params.userId,
        kind: "sku",
        itemId: sku.skuId,
        priceCoins: sku.priceCoins,
        state: "completed",
        createdAt: nowIso
      },
      duplicate: true,
      balance: await persist.deriveUserBalance(params.userId, nowIso)
    };
  }

  await persist.createPurchase({
    purchaseId,
    userId: params.userId,
    kind: "sku",
    itemId: sku.skuId,
    priceCoins: sku.priceCoins,
    idempotencyKey,
    createdAt: nowIso
  });

  for (const entitlementId of sku.entitlementIds) {
    const grant = await persist.grantEntitlement({
      userId: params.userId,
      entitlementKey: `${sku.skuId}:${entitlementId}:${params.userId}`,
      sourcePurchaseId: purchaseId,
      createdAt: nowIso
    });
    if (!grant.inserted) throw new StoreError("entitlement_conflict", "Entitlement already exists");
  }

  return {
    purchase: {
      purchaseId,
      userId: params.userId,
      kind: "sku",
      itemId: sku.skuId,
      priceCoins: sku.priceCoins,
      state: "completed",
      createdAt: nowIso
    },
    duplicate: false,
    balance: await persist.deriveUserBalance(params.userId, nowIso)
  };
}

export async function refundPurchase(
  persist: StorePersistence,
  params: {
    userId: string;
    purchaseId: string;
    clientKey: string;
    nowIso?: string;
  }
): Promise<Purchase> {
  return persist.atomic(() => refundPurchaseInTransaction(persist, params));
}

async function refundPurchaseInTransaction(
  persist: StorePersistence,
  params: {
    userId: string;
    purchaseId: string;
    clientKey: string;
    nowIso?: string;
  }
): Promise<Purchase> {
  const nowIso = params.nowIso ?? new Date().toISOString();
  const purchase = await persist.getPurchase(params.purchaseId, params.userId);
  if (!purchase) {
    throw new StoreError("unknown_item", "Purchase not found");
  }
  if (purchase.state === "refunded") {
    return purchase;
  }

  if (purchase.kind === "coin_pack") {
    throw new StoreError("verified_refund_required", "Coin Packs require a verified platform refund event");
  }
  const service = purchase.kind === "service" ? getStoreService(purchase.itemId) : undefined;
  // Energy is an immediate consumable. Until consumption provenance exists,
  // fail closed rather than refund Coins while retaining the granted Energy.
  if (service?.effect === "energy_one" || service?.effect === "energy_refill") {
    throw new StoreError("non_refundable_effect", "Immediate Energy grants cannot be refunded here");
  }

  const idempotencyKey = `refund:${params.purchaseId}`;
  const already = await persist.getPurchaseByIdempotencyKey(idempotencyKey);
  void already;

  // Refund the coins spent (Coin Packs are refunded via the platform, not
  // here — their priceCoins is 0 by construction).
  if (purchase.priceCoins > 0) {
    await persist.recordLedgerEvent({
      userId: params.userId,
      asset: "coins",
      amount: purchase.priceCoins,
      reason: "compensation",
      sourceId: `refund:${params.purchaseId}`,
      idempotencyKey,
      createdAt: nowIso
    });
  }

  // Revoke entitlements granted by this purchase where still unconsumed.
  if (purchase.kind === "sku") {
    const sku = getCatalogSku(purchase.itemId);
    if (sku) {
      for (const entitlementId of sku.entitlementIds) {
        await persist.revokeEntitlement(
          params.userId,
          `${purchase.itemId}:${entitlementId}:${params.userId}`,
          nowIso
        );
      }
      await persist.releaseSupply(purchase.itemId);
    }
  } else if (purchase.kind === "service") {
    const service = getStoreService(purchase.itemId);
    if (service && service.effect !== "energy_one" && service.effect !== "energy_refill") {
      await persist.revokeEntitlement(
        params.userId,
        `${service.effect}:${params.userId}`,
        nowIso
      );
    }
  }

  await persist.markPurchaseRefunded(params.purchaseId, params.userId, nowIso);
  const updated = await persist.getPurchase(params.purchaseId, params.userId);
  return updated ?? { ...purchase, state: "refunded", refundedAt: nowIso };
}
