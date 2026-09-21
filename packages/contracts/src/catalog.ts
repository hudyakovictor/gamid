import { z } from "zod";

/**
 * Catalog contract (P1-7b) per docs/catalog_sku_spec.md §3 and
 * docs/economy_monetization_referrals.md §5.
 *
 * Coins are the single premium currency; the ordinary payment flow is
 * Telegram Stars -> Coin Pack -> Coins -> goods. Direct-Stars purchases
 * are an approved-exception path and never part of the ordinary catalog.
 */

export const CoinPackSchema = z
  .object({
    packId: z.string().regex(/^pack_[a-z0-9_]+$/),
    starsPrice: z.number().int().positive(),
    coinsGranted: z.number().int().positive()
  })
  .strict();

export type CoinPack = z.infer<typeof CoinPackSchema>;

export const CatalogServiceSchema = z
  .object({
    serviceId: z.string().regex(/^svc_[a-z0-9_]+$/),
    priceCoins: z.number().int().positive(),
    /** The server applies this effect; the client never mutates state. */
    effect: z.enum(["energy_one", "energy_refill", "name_change", "extended_analytics"])
  })
  .strict();

export type CatalogService = z.infer<typeof CatalogServiceSchema>;

export const CatalogSkuSchema = z
  .object({
    skuId: z.string().regex(/^[a-z0-9_]+_v\d+$/),
    version: z.string().min(1),
    priceCoins: z.number().int().positive(),
    /** Present only for an approved platform/special-promotion exception. */
    optionalDirectStarsPrice: z.number().int().positive().optional(),
    paymentMode: z.enum(["coins", "direct_stars_exception"]),
    entitlementIds: z.array(z.string().min(1)).min(1),
    supplyLimit: z.number().int().positive().optional(),
    requiredFeatureFlag: z.string().min(1).optional(),
    status: z.enum(["available", "limited", "retired"])
  })
  .strict();

export type CatalogSku = z.infer<typeof CatalogSkuSchema>;

export const CatalogItemSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("coin_pack"), item: CoinPackSchema }).strict(),
  z.object({ kind: z.literal("service"), item: CatalogServiceSchema }).strict(),
  z.object({ kind: z.literal("sku"), item: CatalogSkuSchema }).strict()
]);

export type CatalogItem = z.infer<typeof CatalogItemSchema>;

export const CatalogResponseSchema = z
  .object({
    packs: z.array(CoinPackSchema),
    services: z.array(CatalogServiceSchema),
    skus: z.array(CatalogSkuSchema)
  })
  .strict();

export type CatalogResponse = z.infer<typeof CatalogResponseSchema>;

export type PurchaseKind = "coin_pack" | "service" | "sku";

export const PurchaseSchema = z
  .object({
    purchaseId: z.string().uuid(),
    userId: z.string().min(1),
    kind: z.enum(["coin_pack", "service", "sku"]),
    itemId: z.string().min(1),
    priceCoins: z.number().int().nonnegative(),
    invoiceId: z.string().min(1).optional(),
    state: z.enum(["completed", "refunded"]),
    createdAt: z.string().datetime(),
    refundedAt: z.string().datetime().optional()
  })
  .strict();

export type Purchase = z.infer<typeof PurchaseSchema>;

export const PurchaseRequestSchema = z
  .object({
    clientKey: z.string().min(1).max(120),
    kind: z.enum(["coin_pack", "service", "sku"]),
    itemId: z.string().min(1),
    /** Required for coin packs: the Telegram invoice id (payment proof ref). */
    invoiceId: z.string().min(1).max(120).optional()
  })
  .strict();

export type PurchaseRequest = z.infer<typeof PurchaseRequestSchema>;
