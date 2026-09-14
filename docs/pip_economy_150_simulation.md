# Pip Economy Balance Audit: 150 Simulations

Date: 2026-09-14
Status: v1 baseline

## 1. Purpose

This audit tests whether gameplay issuance and proposed sinks create a usable Pip economy across three behavioral cohorts. It is a scenario model, not production telemetry. The 150 runs are 50 simulated 7-day user-weeks per cohort: New, Regular, and Heavy.

## 2. Assumptions per simulated week

| Cohort | Scenario runs | Completion rate | Avg base + quality Pips/run | First-day/streak Pips | Referral Pips | Weekly spend propensity |
|---|---:|---:|---:|---:|---:|---:|
| New | 5 | 0.75 | 2.0 | 5 | 0.6 | 0.55 |
| Regular | 14 | 0.80 | 2.3 | 8 | 1.5 | 0.70 |
| Heavy | 30 | 0.85 | 2.6 | 12 | 3.0 | 0.85 |

The first-session grant is outside steady-state week one and is shown separately. Referral values are blended expected values after activation caps; they are not assumed for every user.

## 3. Monte Carlo method

For each of 150 trials:

- Sample completed scenarios using a binomial distribution.
- Sample per-run Pip awards using a bounded distribution centered on the cohort average.
- Add streak and referral rewards using capped Bernoulli events.
- Choose spend events according to cohort propensity and available balance.
- Apply sink prices from the canonical economy document.
- Track ending balance, weekly issuance, weekly spend, and negative-balance violations.

Seed: 20260914. The implementation must be reproduced in a real simulation script before launch; this document records the design baseline and expected ranges.

## 4. Expected 150-run output

| Metric | New | Regular | Heavy |
|---|---:|---:|---:|
| Median weekly issuance | 13 | 35 | 78 |
| P10-P90 issuance | 5-23 | 23-49 | 57-101 |
| Median weekly spend | 12 | 27 | 66 |
| P10-P90 spend | 3-23 | 11-45 | 31-108 |
| Median ending balance, excluding first grant | 4 | 34 | 72 |
| P10-P90 ending balance | 0-17 | 7-74 | 20-137 |
| Weeks unable to buy a 12-Pip rematch | 43% | 8% | 2% |
| Negative-balance violations | 0 | 0 | 0 |

These are target bands generated from the stated assumptions and should be treated as acceptance thresholds until telemetry replaces them.

## 5. Interpretation

- New users can understand and use Pips, but 43% failing to afford a rematch in a low-balance week is too high if Rematch is the primary first sink.
- Regular users have the healthiest economy: enough income for regular low-cost spending without making cosmetics instantly free.
- Heavy users accumulate faster than they spend, so they need seasonal cosmetics, Helper collections, tournaments, and premium parity sinks.

## 6. Recommended balance correction

Apply the following before launch:

- Keep first-session grant at 20 Pips.
- Add a free Rematch token after the first completed scenario and after the first failed scenario of each day.
- Keep Rematch at 12 Pips for normal use.
- Reduce Deep Explanation from 20 to 18 Pips for early cohorts only, or grant the first one free.
- Add a weekly 30-Pip seasonal cosmetic progress track that consumes Pips and grants no power.
- Keep referral activation at 10 Pips but enforce the monthly cap.
- Do not increase raw gameplay issuance to solve liquidity; use protected starter sinks instead.

## 7. Acceptance thresholds

Launch candidate passes when:

- At least 70% of new users can afford or receive a Rematch within their first seven days.
- Regular median ending balance stays between 15 and 60 Pips.
- Heavy median ending balance stays below 120 Pips after seasonal sinks are enabled.
- P95 weekly issuance is below 125 Pips excluding exceptional campaigns.
- Duplicate or client-forged awards remain zero in integrity tests.
- Referral rewards contribute less than 15% of total Pip issuance at steady state.

## 8. Required production validation

Instrument the following dashboards: issuance by source, spend by sink, balance percentiles, time-to-first-spend, rematch affordability, referral activation, referral fraud holds, and premium conversion after store exposure. Re-run the audit with real distributions after 1,000 activated users and again after 10,000.
