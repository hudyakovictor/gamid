# Signal Arena Economy, Monetization & Referral Specification

Status: REQUIRED
Scope: economy, payments, referrals and guardrails
Owner: Signal Arena project owner
Last reviewed: 2026-09-16
Supersedes: Pips-based economy v1
Required evidence: server-authoritative ledger, payment reconciliation, duplicate reward tests, refund/revoke tests, anti-abuse checks
Canonical dependencies: `game_balance_spec.md`, `catalog_sku_spec.md`, `topbar_currency_ui_spec.md`, `referral_and_growth_spec.md`

This document supersedes the Pips-based economy (v1). The word `Pips` (and `PipGem`, `Pip balance`, `Pip reward`) is retired vocabulary: it must not appear in UI, new documentation, or property names. Legacy occurrences in code or old documents are deprecated terminology; see §11 for the replacement map.

The economy must support learning and retention without selling decision quality, score, correct answers, ranking advantage, or financial outcomes.

## 0. Level disambiguation

Two different progressions share the word "level". Specifications must never use a bare "Level":

- `Account Level` — player progression, range 1–99 (see `game_balance_spec.md`).
- `Scenario Level` — scenario difficulty/progression, integer 1–99 (see `packages/contracts/src/scenario.ts`).

## 1. Scope

Currencies, XP/Energy/Mastery rules, Coin Packs, the Coins price ladder, referral rewards, anti-abuse rules, tournament rewards, analytics, and balance targets.

## 2. Currency model

| Asset | Earned by | Spent on | Transferable | Competitive power |
|---|---|---|---|---|
| XP | verified learning activity | Account Level progression | no | none |
| Energy | regen timer, refill services | eligible solo Arena launches | no | none (access pacing only) |
| Mastery Stars | scenario quality (0–3 per scenario) | progression gates (chapters, exams, difficulties) | no | gate unlocks only, never score |
| Coins | Telegram Stars Coin Packs; promo grants (referral, special events, compensation) | tournaments tickets, Arena Pass, Premium, cosmetics, Energy services, Founder Support | no | none |
| Telegram Stars/XTR | external purchase | Coin Packs only (regular flow) | n/a (platform rail) | none |
| Skill Rating | competitive outcomes | nothing (divisions and matchmaking input) | no | leaderboard position only |
| Discipline Streak | consecutive days with qualified activity | milestone XP only | no | none |

Telegram Stars are not displayed in the Top Bar and are never a gameplay reward. Mastery Stars are not currency: they are never spent, never purchased, and have no relation to Telegram Stars. Coins are account-bound, non-transferable, and non-withdrawable. Regular Quality Score never mints Coins automatically.

Promo Coins (referral, special tournament prizes, compensation) share the single Coins balance with a server-side `promo` flag. They spend exactly like purchased Coins but cannot be withdrawn or transferred.

## 3. XP and Account Level

XP is defined in `game_balance_spec.md` (curve, rewards, quality modifier, daily cap). Rules relevant to the economy:

- XP is granted only for verified completions; purchases, Coins, Premium, and tournament tickets never grant XP.
- Client-only events never generate XP.
- The server stores the curve version; the client renders returned values only.

## 4. Access and consumables

Base learning is free: base debrief, personal Decision Trace, and scheduled Rematch never require payment. Coins unlock extended analytics, cosmetics, convenience, and premium access — never the understanding of the mistake itself.

| Need | Cost model |
|---|---|
| Quick Run / eligible Arena launch | 1 Energy |
| Immediate Rematch (skip schedule) | 1 Energy |
| Scheduled Rematch | free |
| Base debrief + Decision Trace | free |
| Extended period analytics | Premium or 120 Coins |
| Name change (extra) | 100 Coins |
| +1 Energy | 20 Coins |
| Full Energy refill | 75 Coins |

## 5. Coins

### 5.1 Payment chain

```text
Telegram Stars → Coin Pack → Coins → goods and services
```

Regular goods never carry dual Stars/Coins prices. Telegram Stars appear only in the Coin Pack payment flow. Direct entitlement purchase for Stars is an exceptional mechanism for separately announced limited promotions, special Founder packs, partner offers, or platform requirements — never the ordinary user flow. Every exception requires a dedicated SKU, feature flag, reconciliation path and human approval.

> Telegram Stars/XTR are the external payment method, used primarily for Coin Packs. Coins are the single premium in-game currency of Signal Arena. Premium, Arena Pass, tournament tickets, Energy services, Founder Support, and cosmetic items are priced in Coins. Telegram Stars are not shown in the Top Bar and are not used as gameplay rewards. Every Coin Pack shows the exact Coins granted and the exact Stars price before payment confirmation.

### 5.2 Coin Packs

Base rate: `50 Stars = 100 Coins`, i.e. `1 Telegram Star = 2 Coins`. Larger packs carry a moderate bonus (no excessive pressure):

| Pack | Price | Granted | Coins per Star |
|---|---:|---:|---:|
| Starter | 50 Stars | 100 Coins | 2.00 |
| Standard | 100 Stars | 220 Coins | 2.20 |
| Arena | 250 Stars | 600 Coins | 2.40 |
| Vault | 500 Stars | 1,300 Coins | 2.60 |
| Patron | 1,000 Stars | 2,700 Coins | 2.70 |

Pack UI shows granted Coins, Stars price, and value vs base rate (e.g. `600 Coins / 250 Telegram Stars / +20% value`).

### 5.3 Tournaments

| Item | Price |
|---|---|
| Rookie Tournament Ticket | first free after qualification (onboarding + 3 valid solo scenarios + 15 Mastery Stars) |
| Weekly Tournament Ticket | 100 Coins |
| Ranked Tournament Ticket | 150 Coins |
| Seasonal Tournament Ticket | 250 Coins |
| Private tournament creation | from 500 Coins |

### 5.4 Cosmetics

| Rarity | Price range |
|---|---|
| Common | 120–250 Coins |
| Rare | 400–800 Coins |
| Epic | 900–1,600 Coins |
| Legendary / Seasonal | 1,800–3,000 Coins |

Price depends on rarity, animation, seasonality, and scarcity — never on gameplay advantage. Selected cosmetics may alternatively be granted via achievements or vouchers; no purchasable item affects score, matchmaking, scenario truth, ratings, or tournament probability.

### 5.5 Subscriptions

| Product | Price | Period |
|---|---|---|
| Premium | 599 Coins | 30 days |
| Arena Pass | 749 Coins | 30 days |
| Premium + Arena Pass | 1,199 Coins | 30 days |

The bundle discount is approximately 11%.

Premium: raised Energy cap, faster regen, one full weekly refill, extended decision history, extra analytics, profile theme, monthly cosmetic reward. Arena Pass: 8 standard tournament entries, seasonal cosmetic track, extended tournament history, registration notifications, no extra attempts inside one tournament.

### 5.6 Founder Support (priced in Coins)

Founder Pack prices and complete entitlement composition are defined only in `catalog_sku_spec.md`:

```text
founder_supporter_v1
founder_v1
founding_arena_v1
```

Founder Packs are always non-competitive and make no token, income, share, ROI or future-value promises.

### 5.7 Rules

- Never sell correct answers, score multipliers, rating protection, extra competitive attempts, or probability manipulation.
- Premium scenarios/content must also be earnable through progression or clearly labeled as optional content.
- Use a transparent confirmation screen and receipt restoration.
- Refunds revoke unconsumed entitlements where platform rules permit; purchases after refund windows only for rewards.
- All grant and spend operations are server-authoritative, ledgered, and idempotent.

### 5.8 Monetization funnel

`first scenario -> result -> XP/Mastery reward -> store preview -> optional Coin Pack offer`

Do not interrupt the first decision with a paywall. The first premium prompt appears after the user has received value and understands Coins.

## 6. Referral system

Referral is a product loop, not a multilevel scheme.

### 6.1 Flow

1. User opens Invite Friends and receives a single invite code/link.
2. Invitee starts with a pending attribution window of 7 days.
3. Invitee completes onboarding and three valid solo scenarios.
4. Both accounts receive 25 promo Coins each (once per invitee).
5. If the invitee makes a first confirmed, non-refunded purchase, the inviter receives 50 promo Coins after the refund-risk window.
6. If the invitee completes a first paid tournament, they receive a promo ticket fragment per event rules.

> After the invitee completes onboarding and three valid solo scenarios, both sides receive 25 Coins. After the invitee's first confirmed and non-refunded purchase, the inviter receives 50 Coins. All referral grants are server-side, idempotent, monthly-capped, and anti-abuse checked.

### 6.2 Limits

- One-level referrals only; no second-level rewards.
- Activation reward: once per invitee.
- Inviter cap: 250 Coins per calendar month; max 5 purchase bonuses per month.
- No rewards for self-referrals, duplicate devices, payment reuse, or scripted completion.
- Suspicious grants flow: Hold → Review → Grant/Reject. Never silently deduct legitimate balances.
- No cash, Stars, TON, or tradable assets as referral rewards.

### 6.3 Anti-abuse

Server-side checks for account age, device fingerprint risk, payment instrument reuse, IP/ASN concentration, velocity, self-referral patterns, and scenario completion quality. Referral analytics must separate attributed, activated, retained, and paid invitees.

## 7. Tournament economy

- Default tournament rewards: Rating, Season Points, qualification, cosmetic fragments, badges, titles, emotes, frames, season-history records.
- Regular tournaments are not required to grant Coins.
- Promo Coins are allowed only for pre-announced special events with a fixed amount, never funded directly from entry fees, granted server-side, non-withdrawable, and independent of purchased attempts.
- Promo tournament Coins cap: maximum 50 Coins per account per UTC week (upper bound for special events, not a guaranteed weekly reward).
- Coins never buy ranking points, score boosts, easier scenarios, or a second competitive chance.

## 8. Ledger and integrity

Every mutation is an immutable ledger event:

`event_id, user_id, asset, amount, reason, source_id, scenario_id, idempotency_key, promo, created_at, risk_state`.

The `promo` flag marks referral, promotional, and compensation Coins. Balances are derived from the ledger or reconciled against it. Client balances are display-only. Negative balances are impossible. Duplicate events must be rejected by idempotency key.

## 9. Required events

`currency_earned`, `currency_spent`, `coin_pack_viewed`, `coin_pack_purchased`, `coins_credited`, `xp_awarded`, `mastery_awarded`, `energy_spent`, `energy_refilled`, `store_viewed`, `store_item_clicked`, `purchase_started`, `purchase_completed`, `purchase_refunded`, `referral_link_created`, `referral_attributed`, `referral_activated`, `referral_reward_held`, `referral_reward_granted`, `tournament_reward_granted`, `coin_balance_bucketed`.

## 10. Rewarded ads

The canonical rewarded-ad rewards are:

```text
ENERGY_GRANT
COSMETIC_FRAGMENT_GRANT
```

One completed, server-verified rewarded ad grants `+1 Energy`, subject to daily and session caps. Rewarded ads never grant direct XP, direct Mastery Stars, Rating, tournament access, a score modifier, hidden information or an automatic ad after a failed decision. The Energy-funded run follows ordinary XP and Mastery rules. Scheduled Rematch remains free; immediate voluntary Rematch uses Energy. No separate rematch currency or practice-attempt asset exists.

## 11. Product guardrails

The economy reinforces the core promise: better decisions, better evidence, better discipline. It must never imply financial returns, investment advice, guaranteed market success, or real-money trading outcomes. Coins, XP, Energy, and Mastery Stars never change score, outcome, ranking, or risk advantage.

## 12. Retired Pips vocabulary

`Pips`, `PipGem`, `Pip balance`, and `Pip reward` are deprecated. Replacement depends on meaning:

| Old term | Replacement |
|---|---|
| Pips for completion | XP or Mastery Stars |
| Pips as spendable game resource | Energy |
| Pips for item purchases | Coins |
| PipGem in Top Bar | Coin icon |
| Stars as paid currency | Coins |
| Telegram Stars | XTR payment in the store only |

New accounts receive no starter Coins: full Energy, onboarding XP, one Common Cosmetic Voucher (cosmetic only, not spendable on Energy or tournaments), and Rookie Ticket unlock after qualification.
