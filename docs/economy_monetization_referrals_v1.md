# Signal Arena Economy, Monetization & Referral Specification v1

Status: proposed canonical economy baseline
Date: 2026-09-14

## 1. Scope

This document closes the previously underspecified economy layer: currencies, Pip sinks, Stars monetization, referral rewards, anti-abuse rules, tournament rewards, analytics, and balance targets.

The economy must support learning and retention without selling decision quality, score, correct answers, ranking advantage, or financial outcomes.

## 2. Currency model

| Asset | Earned by | Spent on | Transferable | Competitive power |
|---|---|---|---|---|
| Stars | purchase, selected campaigns | premium access and premium cosmetics | no | none |
| Pips | quality play, practice, verified referrals | practice, rematch, explanations, earned cosmetics, Helper items | no | none |
| Skill XP | scenario learning | level progression and unlock gates | no | no direct power |
| Rating | competitive outcomes | nothing | no | leaderboard position only |

### 2.1 Pip identity

Canonical Top Bar icon: `PipGem`.

- Compact cyan-blue faceted shard, visually closer to a gem than a coin.
- One bright vertical core line.
- Dark navy outline and restrained glow.
- Must remain legible at 16 px.
- Must never resemble Telegram Stars, a gold coin, TON, a blockchain logo, or cash.
- Small UI: `◆ 128`.
- Reward UI: `+4 ◆`.
- Large UI may use the `Pip Pulse` animation, but Top Bar stays simple.

Stars remain a gold five-point star. This gives the immediate game-readable pair: `⭐ Stars = purchased access`, `◆ Pips = earned progress`.

## 3. Pip earning rules

Pips are awarded once per finalized scenario, with server-side idempotency.

| Event | Pips | Rule |
|---|---:|---|
| Complete scenario | 1 | valid finalized run |
| Score 70-84 | 1 | score band, once |
| Score 85-100 | 2 | replaces the 70-84 bonus |
| Valid invalidation | 1 | evidence-backed invalidation |
| Strong evidence | 1 | only once per scenario |
| Disciplined Wait/No Trade | 1 | only when rubric validates it |
| Improvement rematch | 2 | improvement >= 10 points, once per scenario |
| Daily first completion | 2 | account-wide daily bonus |
| Streak day 3 / 7 / 14 | 3 / 6 / 12 | once per streak milestone |
| Verified referral activation | 10 | after invitee completes onboarding and 3 scenarios |
| Invitee first premium purchase | 20 | once, after refund window |

### 3.1 Caps

- Base gameplay issuance: maximum 12 Pips per account per UTC day, excluding streak milestones.
- Referral issuance: maximum 100 Pips per calendar month.
- No Pip award for repeated identical submissions, abandoned runs, or client-only events.
- First-session grant: 20 Pips, non-repeatable.

## 4. Pip sinks

The store must show an immediately spendable item for every normal Pip balance.

| Item | Cost | Purpose |
|---|---:|---|
| Rematch token | 12 Pips | replay a completed scenario with fresh evaluation |
| Practice scenario | 18 Pips | extra non-rated practice |
| Deep explanation | 20 Pips | expanded post-scenario analysis |
| Evidence replay | 24 Pips | replay evidence timeline and decision audit |
| The Helper emotion | 80 Pips | cosmetic |
| Pip Gem frame | 150 Pips | profile cosmetic |
| Profile title | 250 Pips | earned display title |
| Common card skin | 400 Pips | cosmetic |
| Rare Helper outfit | 900 Pips | cosmetic |
| Seasonal earned badge | 1,200 Pips | cosmetic and collection item |

### 4.1 Earned-or-paid parity

Selected cosmetics may be purchased via either:

- Stars for immediate access.
- Pips for earned access.

Pip-purchased cosmetics are account-bound and never transferable. No item purchasable with Pips affects score, matchmaking, scenario truth, ratings, or tournament probability.

### 4.2 Sink targets

Target weekly Pip outflow per active user:

- New user: 20-40 Pips.
- Regular user: 45-90 Pips.
- Heavy user: 90-160 Pips.

The store should expose low-cost sinks first: Rematch, Practice, and Deep Explanation.

## 5. Stars monetization

Stars are the premium access currency, not a power currency.

### 5.1 Product ladder

| Product | Suggested price | Includes |
|---|---:|---|
| Supporter pack | 99 Stars | cosmetic badge + profile accent |
| Scenario pack | 199 Stars | 5 premium scenarios |
| Deep-dive pack | 249 Stars | 10 premium explanation unlocks |
| Helper pack | 299 Stars | Helper outfit + emotion set |
| Season pass | 799 Stars | seasonal track, cosmetics, premium missions |
| Founder archive | 1,499 Stars | founder cosmetics, title, archive access |

Prices are product hypotheses, not legal or platform-specific price promises. Final pricing must be tested by platform and region.

### 5.2 Rules

- Never sell correct answers, score multipliers, rating protection, extra competitive attempts, or probability manipulation.
- Premium scenarios must also be earnable through progression or clearly labeled as optional content.
- Use a transparent confirmation screen and receipt restoration.
- Refunds revoke unconsumed entitlements where platform rules permit.
- All grant and spend operations are server-authoritative and ledgered.

### 5.3 Monetization funnel

`first scenario -> result -> Pip Gem reward -> store preview -> optional premium offer`

Do not interrupt the first decision with a paywall. The first premium prompt appears after the user has received value and understands Pips.

## 6. Referral system

Referral is a product loop, not a multilevel scheme.

### 6.1 Flow

1. User opens Invite Friends and receives a single invite code/link.
2. Invitee starts with a pending attribution window of 7 days.
3. Invitee completes onboarding and three finalized scenarios.
4. Both accounts receive the activation reward.
5. If the invitee buys a premium product, the inviter receives the purchase reward after the refund window.

### 6.2 Rewards

- Inviter: 10 Pips per verified activation.
- Invitee: 10 Pips after three scenarios, plus one Rematch token.
- Inviter: 20 Pips after invitee's first non-refunded premium purchase.
- Monthly inviter cap: 100 Pips and 5 purchase bonuses.
- No second-level rewards.
- No cash, Stars, TON, or tradable assets as referral rewards.

### 6.3 Anti-abuse

Use server-side checks for account age, device fingerprint risk, payment instrument reuse, IP/ASN concentration, velocity, self-referral patterns, and scenario completion quality. Hold suspicious rewards for review; do not silently deduct legitimate balances. Referral analytics must separate attributed, activated, retained, and paid invitees.

## 7. Tournament economy

- Free practice tournaments award Pips, XP, badges, and cosmetics.
- Premium tournaments may use Stars for entry only if prize and rules are transparent.
- Pips never buy ranking points, score boosts, easier scenarios, or a second competitive chance.
- Tournament Pip rewards are included in the weekly outflow budget and capped separately at 60 Pips per account per week.

## 8. Ledger and integrity

Every mutation is an immutable ledger event:

`event_id, user_id, asset, amount, reason, source_id, scenario_id, idempotency_key, created_at, risk_state`.

Balances are derived from the ledger or reconciled against it. Client balances are display-only. Negative balances are impossible. Duplicate events must be rejected by idempotency key.

## 9. Required events

`currency_earned`, `currency_spent`, `store_viewed`, `store_item_clicked`, `purchase_started`, `purchase_completed`, `purchase_refunded`, `referral_link_created`, `referral_attributed`, `referral_activated`, `referral_reward_held`, `referral_reward_granted`, `tournament_reward_granted`, `pip_balance_bucketed`.

## 10. Product guardrails

The economy reinforces the core promise: better decisions, better evidence, better discipline. It must never imply financial returns, investment advice, guaranteed market success, or real-money trading outcomes.
