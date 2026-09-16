# Signal Arena Game Balance Specification

Status: REQUIRED
Scope: progression numbers, formulas, caps and balance hypotheses
Owner: Signal Arena project owner
Last reviewed: 2026-09-16
Supersedes: legacy balance notes
Required evidence: balance config validation, economy simulation, golden fixtures, progression tests
Canonical dependencies: `economy_monetization_referrals.md`, `catalog_sku_spec.md`, `../packages/contracts/src/scenario.ts`

This document defines the progression and pacing numbers: Account Level/XP, Mastery Stars, Energy, and the balance vocabulary. Prices, Coin Packs, and monetization live in `economy_monetization_referrals.md`. Top Bar layout lives in `topbar_currency_ui_spec.md`. All numbers below are hypotheses until validated against golden fixtures and economy simulation; hypotheses are tagged `H-`.

## 1. Balance vocabulary

| System | Unit | Purpose | Spendable | Purchasable |
|---|---|---|---|---|
| Account progression | XP / Account Level | long-term verified learning | no | no |
| Activity access | Energy | pace eligible solo Arena modes | yes | refill only |
| Scenario mastery | Mastery Stars | completion and skill gates | no | no |
| Premium economy | Coins | Premium, cosmetics, services, tournaments | yes | through Telegram Stars Coin Packs |
| Checkout | Telegram Stars/XTR | external payment rail | external | managed by Telegram |
| Competition | Skill Rating | divisions and matchmaking | no | no |
| Habit | Discipline Streak | consistent qualified activity | n/a | no |

Telegram Stars are not displayed in the Top Bar. Mastery Stars are not currency. Coins are account-bound, non-transferable, and non-withdrawable.

## 2. Level disambiguation

- `Account Level` — player progression, range 1–99 (this document).
- `Scenario Level` — scenario difficulty/progression, integer 1–99 (`packages/contracts/src/scenario.ts`).

Never use a bare "Level" in specifications, UI copy keys, or analytics event names.

## 3. Account Level and XP

### 3.1 Level range and curve

Account Level 1–99 (`H-BAL-1`):

```text
xpToNext(L) = roundTo25(90 + 35L + 8L^1.55)
```

Reference snapshot (generated server configuration is authoritative and must be tested against the formula before release):

| Account Level | XP to next | Cumulative XP at level start |
|---:|---:|---:|
| 1 | 125 | 0 |
| 2 | 175 | 125 |
| 3 | 250 | 300 |
| 4 | 300 | 550 |
| 5 | 350 | 850 |
| 6 | 425 | 1,200 |
| 7 | 500 | 1,625 |
| 8 | 575 | 2,125 |
| 9 | 650 | 2,700 |
| 10 | 725 | 3,350 |
| 15 | 1,150 | 7,775 |
| 20 | 1,625 | 14,450 |
| 30 | 2,700 | 35,375 |
| 40 | 3,925 | 67,800 |
| 50 | 5,275 | 113,025 |
| 60 | 6,750 | 172,350 |
| 70 | 8,325 | 246,900 |
| 80 | 10,025 | 337,750 |
| 90 | 11,800 | 445,875 |
| 98 | 13,275 | 545,400 |
| 99 | — | 558,675 |

The server stores the curve version; the client renders returned values only.

### 3.2 XP rewards (`H-BAL-2`)

| Activity | Base XP | Conditions |
|---|---:|---|
| Onboarding completion | 100 | once per account |
| Academy theory node | 10 | first completion |
| Worked example | 20 | first completion |
| Guided Academy scenario | 40 | first valid completion |
| Exam pass | 150 | first pass per exam version |
| Quick Run | 25 | valid finalized run |
| Blind Scenario | 35 | valid finalized run |
| Conflict Scenario | 45 | valid finalized run |
| Daily Fix | 50 | first valid completion per day |
| Post-Loss Protocol | 30 | once per qualifying trigger |
| Rematch completion | 20 | valid delayed rematch |
| Rematch improvement | +40 | improvement ≥ 10 points, once per pair |
| Challenge Friend | 20 | valid completion, once per challenge |
| Tournament | 0 | grants Rating/event rewards instead of paid XP opportunity |

### 3.3 Quality modifier

Applied only to the first rewardable completion in the relevant reward window:

| Quality Score | XP modifier |
|---|---|
| 0–49 | ×0.75 |
| 50–69 | ×1.00 |
| 70–84 | ×1.15 |
| 85–94 | ×1.30 |
| 95–100 | ×1.40 |

### 3.4 Repeat and cap rules

- First completion receives normal XP.
- Second completion of the same version within 7 days receives 25% base XP, only for a valid Rematch or best-score improvement.
- Further identical repetitions receive 0 XP.
- Maximum normal solo XP per UTC day: 500; one-time onboarding, first Exam pass, and compensation do not consume this cap.
- Client-only events never generate XP.

## 4. Mastery Stars

Each mastery-bearing scenario stores the best result from 0–3 Stars (`H-BAL-3`):

- ★☆☆ — scenario completed;
- ★★☆ — Quality Score ≥ 70;
- ★★★ — Quality Score ≥ 85 plus scenario key conditions.

Key conditions are defined in the scenario `evaluationRules`. Stars are never spent or purchased; their sum opens chapters, difficulties, and Exams. Thresholds 70/85 intentionally match the XP quality bands (§3.3).

## 5. Energy (`H-BAL-4`)

- Cap 5/5 at start; value never exceeds the current cap.
- Eligible Arena launch costs 1 Energy; immediate (off-schedule) Rematch costs 1 Energy.
- Academy and mandatory onboarding never cost Energy.
- Regen: 1 Energy per 30 minutes (`H-ECON-1`, hypothesis; Premium raises cap and rate).
- Scheduled Rematch, base debrief, and personal Decision Trace are free.
- Energy never affects Quality Score or tournament results; backend is the source of truth.

## 6. Coins (pointer)

Coins pricing, packs, and Founder Support are defined in `economy_monetization_referrals.md` §§5–7. Balance-relevant rules repeated here for locality:

- No starter Coins: new accounts receive full Energy, onboarding XP, one Common Cosmetic Voucher (cosmetic only), and Rookie Ticket unlock after onboarding + 3 valid solo scenarios + 15 Mastery Stars.
- Regular tournaments are not required to grant Coins; special promo Coins cap at 50 per account per UTC week.
- Base rate hypothesis: `1 Telegram Star = 2 Coins` (`H-ECON-2`); pack bonuses per §5.2 of the economy spec.

## 7. Discipline Streak (`H-BAL-5`)

Consecutive UTC days with at least one qualified completion. Milestones grant XP only (day 3 / 7 / 14 hypotheses: 50 / 150 / 400 XP), never Coins. Streak breaks reset the counter; no streak recovery purchases.

## 8. Retired Pips mapping

`Pips`, `PipGem`, `Pip balance`, `Pip reward` are deprecated. See `economy_monetization_referrals.md` §11 for the canonical replacement table.

## 9. Open hypotheses

- `H-BAL-1` Account Level curve formula and table.
- `H-BAL-2` XP reward values.
- `H-BAL-3` Mastery thresholds and key-condition schema in `evaluationRules`.
- `H-BAL-4` Energy costs and cap progression.
- `H-BAL-5` Streak milestones.
- `H-ECON-1` Energy regen timer (30 min) and Premium rate effects.
- `H-ECON-2` Coins base rate and pack bonuses.

Each hypothesis requires an economy-simulation note and, where scoring is involved, golden fixtures before release calibration.
