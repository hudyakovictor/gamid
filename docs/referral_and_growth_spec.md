# Referral and Growth Specification

Status: REQUIRED
Scope: referral lifecycle, rewards and anti-abuse
Owner: Signal Arena project owner
Last reviewed: 2026-09-16
Supersedes: none
Required evidence: attribution, idempotency, cap and anti-abuse tests
Canonical dependencies: `economy_monetization_referrals.md`, `game_balance_spec.md`

## Goal

Turn a satisfied player into a source of qualified new players without spam, multi-level incentives, or pay-to-win pressure.

## Invite loop

`Invite Friends -> link/code -> onboarding -> 3 scenarios -> activation -> retention -> optional purchase`

The inviter sees a progress card:

```text
Alex: 2/3 scenarios completed
Activation reward: +25 Coins
```

The invitee sees their own reward before sharing any data:

```text
Complete 3 scenarios
Get 25 Coins
```

## Reward table

| Milestone | Inviter | Invitee |
|---|---:|---:|
| Valid attribution | 0 | 0 |
| Onboarding + 3 valid solo scenarios | 25 promo Coins | 25 promo Coins |
| First confirmed, non-refunded purchase | 50 promo Coins (after refund-risk window) | standard purchase entitlement |
| First paid tournament | — | promo ticket fragment per event rules |

Promo Coins share the single Coins balance with a server-side `promo` flag: spendable like purchased Coins, never withdrawable or transferable.

## Limits

- One-level referrals only.
- Seven-day attribution window.
- 250 promo Coins per inviter per calendar month.
- Five purchase bonuses per month.
- No rewards for self-referrals, duplicate devices, payment reuse, or scripted completion.
- Rewards are held while risk review is pending.

## Lifecycle metrics

Track invite sent, click, attribution, onboarding completion, first scenario, third scenario, activation, day-7 retention, day-30 retention, purchase, refund, reward hold, and fraud reversal.

## Messaging

The tone is direct and non-financial:

> Invite someone who likes difficult decisions. If they finish three scenarios, both of you get a small archive credit.

Never promise earnings, investment performance, tokens, cash, or market advantage.
