# Signal Arena Catalog SKU Specification

Status: REQUIRED
Scope: economy, catalog, entitlements
Owner: Signal Arena project owner
Last reviewed: 2026-09-16
Supersedes: duplicated Founder Pack composition in `full_game_spec.md` and `monetization.txt`
Required evidence: catalog contract, payment reconciliation, entitlement idempotency, refund/revoke tests, asset provenance
Canonical dependencies: `economy_monetization_referrals.md`, `game_balance_spec.md`, `topbar_currency_ui_spec.md`, `asset_provenance_and_workflow.md`

## 1. Payment boundary

The ordinary user payment flow is:

```text
Telegram Stars/XTR
→ Coin Pack
→ Coins
→ Signal Arena goods and services
```

Coins are the internal, account-bound, non-transferable and non-withdrawable premium currency. Regular catalog products do not expose direct Telegram Stars prices.

Direct entitlement purchase with Telegram Stars is an exception only when required by the platform or by a separately announced special promotion. Such an exception must have its own SKU, payment/reconciliation rules, feature flag, and human approval before publication.

## 2. Canonical SKUs

| SKU | Price | Core entitlements | Availability |
|---|---:|---|---|
| `founder_supporter_v1` | 299 Coins | Founder badge, profile accent, Founder Archive thanks | limited supply, release-configured |
| `founder_v1` | 899 Coins | Supporter contents, Founder frame, 30-day Premium, Founder collectible set, Founder scenario pack | limited supply, release-configured |
| `founding_arena_v1` | 1,799 Coins | Founder contents, 30-day Arena Pass, rare Decision Seal, seasonal cosmetic set | limited supply, release-configured |

Founder Packs are non-competitive digital bundles. They never grant score, outcome, ranking, risk advantage, correct answers, tokens, allocation, income, liquidity or investment rights.

## 3. SKU record

Every catalog SKU must define:

```text
sku
version
priceCoins
optionalDirectStarsPrice
paymentMode: coins | direct_stars_exception
entitlementIds
premiumPeriod
arenaPassPeriod
cosmeticAssetIds
decisionSealAssetId
scenarioPackId
localizationKeys
availabilityStart
availabilityEnd
supplyLimit
reservedSupply
refundPolicy
revokePolicy
requiredFeatureFlag
status
```

`optionalDirectStarsPrice` is absent for ordinary SKUs and may be populated only for an approved platform or special-promotion exception.

All asset references use stable `assetId` values. SKU publication is blocked when an entitlement, localization key, asset provenance record, supply rule or refund/revoke rule is missing.

## 4. Purchase and entitlement flow

```text
catalog
→ preview
→ Coins spend authorization
→ idempotent ledger mutation
→ entitlement grant
→ inventory
→ equip
→ public profile/tournament rendering
```

Coin Pack acquisition uses the Telegram payment flow:

```text
create Coin Pack order
→ sendInvoice(XTR)
→ pre_checkout_query
→ successful_payment
→ idempotent Coins ledger credit
→ receipt
```

The client never grants an entitlement or mutates a balance. Refunds revoke only unconsumed entitlements where platform rules permit; every mutation is auditable and idempotent.

## 5. Acceptance gates

- [ ] SKU schema and shared contract exist.
- [ ] Coin price and entitlement IDs are versioned.
- [ ] Coin spend and direct-Stars exception paths are distinct.
- [ ] Supply reservation is atomic.
- [ ] Duplicate payment and duplicate entitlement tests pass.
- [ ] Refund/revoke behavior is defined and tested.
- [ ] All assets have stable IDs and approved provenance.
- [ ] No SKU changes score, outcome, ranking or risk.
- [ ] Preview, localization, fallback and public rendering pass QA.
