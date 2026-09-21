import {
  CatalogSkuSchema,
  CoinPackSchema,
  type CatalogSku,
  type CatalogService,
  type CoinPack
} from "../../contracts/src/catalog.js";

/**
 * Canonical catalog data (P1-7b).
 *
 * Source: docs/economy_monetization_referrals.md §4–5 and
 * docs/catalog_sku_spec.md §2. The base rate is `1 Telegram Star = 2 Coins`
 * (H-ECON-2); larger packs carry moderate bonuses (no excessive pressure).
 */

export const COIN_PACKS: CoinPack[] = [
  CoinPackSchema.parse({ packId: "pack_starter", starsPrice: 50, coinsGranted: 100 }),
  CoinPackSchema.parse({ packId: "pack_standard", starsPrice: 100, coinsGranted: 220 }),
  CoinPackSchema.parse({ packId: "pack_arena", starsPrice: 250, coinsGranted: 600 }),
  CoinPackSchema.parse({ packId: "pack_vault", starsPrice: 500, coinsGranted: 1300 }),
  CoinPackSchema.parse({ packId: "pack_patron", starsPrice: 1000, coinsGranted: 2700 })
];

export const STORE_SERVICES: CatalogService[] = [
  { serviceId: "svc_energy_one", priceCoins: 20, effect: "energy_one" },
  { serviceId: "svc_energy_refill", priceCoins: 75, effect: "energy_refill" },
  { serviceId: "svc_name_change", priceCoins: 100, effect: "name_change" },
  { serviceId: "svc_extended_analytics", priceCoins: 120, effect: "extended_analytics" }
];

export const FOUNDER_SKUS: CatalogSku[] = [
  CatalogSkuSchema.parse({
    skuId: "founder_supporter_v1",
    version: "1.0.0",
    priceCoins: 299,
    paymentMode: "coins",
    entitlementIds: ["founder_badge", "profile_accent_founder", "founder_archive_thanks"],
    status: "limited"
  }),
  CatalogSkuSchema.parse({
    skuId: "founder_v1",
    version: "1.0.0",
    priceCoins: 899,
    paymentMode: "coins",
    entitlementIds: [
      "founder_supporter_bundle",
      "founder_frame",
      "premium_30d",
      "founder_collectible_set",
      "founder_scenario_pack"
    ],
    status: "limited"
  }),
  CatalogSkuSchema.parse({
    skuId: "founding_arena_v1",
    version: "1.0.0",
    priceCoins: 1799,
    paymentMode: "coins",
    entitlementIds: [
      "founder_v1_bundle",
      "arena_pass_30d",
      "rare_decision_seal",
      "seasonal_cosmetic_set"
    ],
    status: "limited"
  })
];

/** Tournament entry prices (economy spec §5.3) — informational catalog. */
export const TOURNAMENT_TICKET_PRICES = {
  weekly: 100,
  ranked: 150,
  seasonal: 250,
  private_creation: 500
} as const;

/** Subscription prices (economy spec §5.5). Bundle discount ≈ 11%. */
export const SUBSCRIPTION_PRICES = {
  premium_30d: 599,
  arena_pass_30d: 749,
  premium_and_arena_pass_30d: 1199
} as const;

export function getCoinPack(packId: string): CoinPack | undefined {
  return COIN_PACKS.find((pack) => pack.packId === packId);
}

export function getStoreService(serviceId: string): CatalogService | undefined {
  return STORE_SERVICES.find((service) => service.serviceId === serviceId);
}

export function getCatalogSku(skuId: string): CatalogSku | undefined {
  return FOUNDER_SKUS.find((sku) => sku.skuId === skuId);
}

/**
 * Sanity invariants the catalog must always hold (tested):
 * - every pack is at or above the base rate of 2 Coins per Star;
 * - larger packs grant more Coins and cost more Stars;
 * - the bundle is cheaper than the two subscriptions alone.
 */
export function validateCatalog(): string[] {
  const issues: string[] = [];
  for (const pack of COIN_PACKS) {
    if (pack.coinsGranted < pack.starsPrice * 2) {
      issues.push(`Pack ${pack.packId} is below the base rate of 2 Coins per Star`);
    }
  }
  const sorted = [...COIN_PACKS].sort((a, b) => a.starsPrice - b.starsPrice);
  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1];
    const current = sorted[i];
    if (!previous || !current) {
      continue;
    }
    if (current.coinsGranted <= previous.coinsGranted) {
      issues.push(`Pack ${current.packId} grants no more Coins than ${previous.packId}`);
    }
  }
  const bundle = SUBSCRIPTION_PRICES.premium_and_arena_pass_30d;
  const separate = SUBSCRIPTION_PRICES.premium_30d + SUBSCRIPTION_PRICES.arena_pass_30d;
  if (bundle >= separate) {
    issues.push("The Premium + Arena Pass bundle must be discounted vs the separate prices");
  }
  for (const sku of FOUNDER_SKUS) {
    if (sku.paymentMode === "direct_stars_exception" && !sku.optionalDirectStarsPrice) {
      issues.push(`SKU ${sku.skuId} direct-Stars exception requires a Stars price`);
    }
    if (sku.paymentMode === "coins" && sku.optionalDirectStarsPrice !== undefined) {
      issues.push(`SKU ${sku.skuId} Coins SKUs must not carry a direct Stars price`);
    }
  }
  return issues;
}
