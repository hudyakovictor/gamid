# Signal Arena — Implementation Plan, Iteration Gates & Prompt Library

> **DOCUMENT ROLE: HUMAN-ONLY CONTROL DOCUMENT**
>
> This file is not an automatic instruction set for coding agents. Agents must not use this document wholesale at startup. The owner selects one task prompt, provides only the relevant context, and runs the required verification prompt separately.
>
> This document is the source for planning, review, QA gates, and periodic integration audits.

## 0. Canonical naming rule

Signal Arena uses one unified entity group from the original specification: **Entities**. There is no generic Enemy/Boss split in the canonical content model.

All entity names remain English in every locale, including Russian UI. Do not translate, transliterate, or invent localized names.

Canonical names from the existing specification include:

- Wick Mimic
- Fake Breakout Phantom
- Indicator Cult
- Stop-Hunt Kraken
- Liquidity Hydra
- Slippage Slime
- FOMO Wraith
- Loss Aversion Wraith
- Revenge Wraith
- Dopamine Imp
- Paper-Hands Poltergeist
- Routine Rot
- Anchor Golem
- Hubris Dragon
- System Breaker
- Certainty Siren
- Meme Mirage
- Headline Titan
- Narrative Siren
- Confirmation Bias Cult
- Cycle Ouroboros
- Social Echo
- Leverage Goblin
- Drawdown Leviathan
- Correlation Spider
- Volatility Chimera
- Regime Shifter
- Whale Syndicate
- Expectancy Sphinx
- Risk Mirage
- Averaging Maw
- Rug Pull Phantom
- Honeypot Mimic
- Approval Leech
- Token Parasite
- Unlock Titan
- Insider Syndicate
- Governance Golem
- Yield Chimera
- Bridge Wraith

These names are not translated as «Сигнальный паразит», «Призрак пробоя», or any other localized equivalent. The canonical name stays English. Descriptions, explanatory copy, and ordinary UI text may be localized.

Use stable English IDs separately from display names:

```ts
{
  id: "fake_breakout_phantom",
  name: "Fake Breakout Phantom",
  description: {
    en: "...",
    ru: "..."
  }
}
```

Do not introduce `Enemy`, `Boss`, or `MasteryBoss` as replacement top-level entity categories unless a future approved decision explicitly changes the original specification. The existing model is:

```text
Entity
→ UNKNOWN PATTERN
→ EMERGING PATTERN
→ IDENTIFIED
→ MASTERY I
→ MASTERY II
→ MASTERY III
→ MASTERY IV
→ MASTERY V
```

An entity is not «unlocked» as a collectible character. It is identified and mastered through Academy, Exam, Arena, Collection, rematch, delayed retention, and transfer across contexts.

## 1. Development operating model

Work in parallel after the contract is frozen:

```text
Contract and state machine
        ↓
Database schema + migrations + seeded fixtures
        ↓
Mock API + visual client
        ↘
         Real API + scoring + persistence
                ↓
         Integration and regression audit
```

The visual client begins immediately after the contract and fixtures exist. It must not wait for the full backend.

The database is added early, but the client never connects directly to it:

```text
Client → API → services → repositories → database
```

## 2. Iteration statuses

```text
PLANNED
IN_PROGRESS
BLOCKED
READY_FOR_REVIEW
ACCEPTED
REJECTED
```

Do not use `DONE` as a substitute for acceptance. An iteration can be `ACCEPTED` only after all mandatory gates pass.

## 3. Universal Definition of Done

Every iteration must include:

- [ ] Scope implemented.
- [ ] Out-of-scope work did not silently enter the change.
- [ ] Unit tests added or updated.
- [ ] Integration tests added or updated where boundaries changed.
- [ ] API contract tests added or updated when API changed.
- [ ] Error-path tests added.
- [ ] Idempotency tests added for every mutation.
- [ ] Regression tests pass.
- [ ] Loading/error/empty/locked states checked where applicable.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Build passes.
- [ ] Manual QA checklist completed.
- [ ] Visual/responsive QA completed for UI work.
- [ ] Accessibility check completed for new controls.
- [ ] Security and data-integrity check completed.
- [ ] No secrets or sensitive payment data entered the repository or logs.
- [ ] Evidence bundle attached: commands, outputs, screenshots, traces, or reports.
- [ ] Known limitations have owners and backlog tickets.
- [ ] Final status is explicitly recorded.

Mandatory blocking conditions:

```text
failing typecheck
failing build
failing critical test
P0/P1 defect
unverified primary flow
duplicate reward risk
client-authoritative score or balance
missing acceptance evidence
```

## 4. Iteration plan

### ITERATION 00 — Contract and state machine

**Goal:** freeze domain entities, API schemas, error codes, UI states, and fixtures.

**Scope:** Scenario, Card, Entity, Evidence, Decision, Outcome, Score, Reward, PipLedgerEntry, PlayerProfile.

**Tests:** schema validation, invalid payloads, state transitions, response fixtures, error codes.

**Checklist:**

- [ ] Every endpoint has request and response schema.
- [ ] Every mutation has idempotency behavior.
- [ ] Entity names and IDs match the canonical specification.
- [ ] No translated entity names exist.
- [ ] UI states include loading, ready, sealed, resolving, result, error, empty, locked, insufficient currency.
- [ ] Mock fixtures cover all states.
- [ ] Acceptance report attached.

### ITERATION 01 — Database, migrations, and seed

**Goal:** create schema, repositories, migrations, and demo data.

**Seed scenarios:** available, completed, failed, invalidation, locked, insufficient Pips, premium marker, referral progress.

**Tests:** fresh migration, rollback, repeated seed, constraints, foreign keys, ledger idempotency, duplicate decisions, negative-balance rejection.

**Checklist:**

- [ ] Entity catalog contains the canonical English names.
- [ ] Entity progression uses UNKNOWN PATTERN, EMERGING PATTERN, IDENTIFIED, and MASTERY tiers.
- [ ] Client has no direct database access.
- [ ] No secrets in seed.
- [ ] Every fixture is reachable through a stable API scenario ID.

### ITERATION 02 — Mock API and client shell

**Goal:** make the complete client flow work against fixtures.

**Screens:** Home, Scenario, Evidence, Decision, Seal, Resolving, Outcome, Score, Explanation, Profile, Top Bar, error, locked, insufficient currency.

**Tests:** bootstrap, scenario load, submit, result, timeout, API error, insufficient balance, session recovery.

**Checklist:**

- [ ] Full primary loop works.
- [ ] No dead end.
- [ ] All fixtures can be switched in dev mode.
- [ ] No production logic depends on mock-only fields.

### ITERATION 03 — Main visual client and visual lab

**Goal:** iterate rapidly on the primary visual language while preserving the contract.

**Visual variants:** compact, tactical, editorial, cinematic, mobile.

**Components:** Top Bar, PipGem, Stars, Task Card, CandleChart, Source Groups, Evidence, Skill Hand, Decision Sheet, Seal, Score, Debrief, Helper.

**Tests:** component states, interactions, responsive layouts, keyboard navigation, accessibility labels, visual regression snapshots.

**Checklist:**

- [ ] 16 px PipGem is readable.
- [ ] Stars and Pips are visually distinct.
- [ ] Entity names remain English in Russian mode.
- [ ] Mobile portrait, mobile landscape, and desktop checked.
- [ ] Loading/error/locked/insufficient states checked.
- [ ] Chosen variant is documented; rejected variants remain outside production path.

### ITERATION 04 — Scenario engine and scoring

**Goal:** deterministic point-in-time scenario resolution and disclosed quality scoring.

**Tests:** Long, Short, Wait, No Trade, invalidation, insufficient evidence, timeout, duplicate submit, post-seal mutation, deterministic replay, future-leak prevention, terminal-interaction tests.

**Checklist:**

- [ ] Client does not calculate authoritative score.
- [ ] Pips and Stars cannot affect score.
- [ ] Good process/bad outcome is scored correctly.
- [ ] Bad process/lucky outcome is scored correctly.
- [ ] Hidden Entity state is server-side.
- [ ] Scoring rubric version is recorded.

### ITERATION 05 — Real API and persistence

**Goal:** replace mock transport with staging API without changing UI behavior.

**Tests:** contract, authorization, persistence, refresh recovery, retries, idempotency, network failure, database failure.

**Checklist:**

- [ ] Mock and real responses conform to the same schema.
- [ ] Duplicate decision does not duplicate result.
- [ ] Result survives refresh.
- [ ] Player cannot access another player’s state.
- [ ] Logs contain no secrets.

### ITERATION 06 — Progression and Pips

**Goal:** implement Entity learning progression, Skill XP, Pips, and ledger.

**Tests:** score-band reward, evidence reward, No Trade reward, improvement reward, daily cap, streak milestone, duplicate reward, ledger reconciliation, negative balance.

**Checklist:**

- [ ] 20-Pip first-session grant.
- [ ] Free first Rematch.
- [ ] Free daily Rematch after first failure.
- [ ] PipGem Top Bar and `+N ◆` reward toast.
- [ ] Pips never change score, outcome, matchmaking, or ranking.
- [ ] Entity progression is identify/reinforce/mastery, not unlock-the-character.

### ITERATION 07 — Pip Shop and cosmetics

**Tests:** catalog, sufficient/insufficient balance, successful spend, duplicate purchase, ownership, refresh, no-stat modification.

**Checklist:** Rematch, Practice, Deep Explanation, Evidence Replay, Helper cosmetics, PipGem frame, title, seasonal item.

### ITERATION 08 — Stars and monetization

**Tests:** catalog, pending, success, failure, restore, refund, revoke, duplicate receipt, invalid receipt, verification failure.

**Checklist:** no correct answers, score boosts, outcome boosts, risk boosts, ranking advantage, or hidden paywall. First offer appears after gameplay value.

### ITERATION 09 — Referral

**Tests:** link creation, attribution window, activation after three scenarios, inviter/invitee rewards, refund-window delay, self-referral rejection, duplicate-device hold, monthly caps.

**Checklist:** one level only, no cash/Stars/TON reward, fraud holds, lifecycle analytics.

### ITERATION 10 — Tournaments

**Tests:** join, finalize, submit, duplicate submit, ordering, tie-breaker, rewards, close, reconciliation.

**Checklist:** free practice tournament first; Pips never buy ranking points or competitive advantage.

### ITERATION 11 — Periodic integration and regression gate

**Goal:** after several pull requests, verify that the whole product still forms one coherent system.

**Required cadence:** run after every 3–5 merged PRs, before a release candidate, and whenever a change touches shared types, API, database, scoring, economy, localization, or visual state contracts.

**Tests:** full lint, typecheck, unit, integration, contract, E2E, build, migration replay, seed replay, visual regression, responsive viewport QA, accessibility, performance smoke, deterministic scoring replay, future-leak checks, terminal interaction checks, ledger reconciliation, duplicate reward tests.

**Output:** an integration audit report with PASS, BLOCKED, or REJECTED status. No feature is considered accepted if the combined system fails.

## 5. Task prompt templates

### 5.1 Contract task

```text
Work only on the assigned contract task for Signal Arena.
Read the relevant canonical documents first.
Use English canonical Entity IDs and preserve all canonical Entity names exactly.
Do not translate Entity names, even in Russian UI.
Do not add Enemy, Boss, or MasteryBoss as a replacement top-level category.

Before coding, list files, schemas, dependencies, tests, and acceptance criteria.
Implement only the requested scope.
At the end run typecheck, lint, relevant tests, contract tests, and build.
Return exact commands, results, changed files, known limitations, and acceptance status.
Do not claim ACCEPTED if any mandatory gate failed.
```

### 5.2 Database task

```text
Implement only the assigned database/repository task.
Use stable English IDs and the canonical unified Entity catalog.
Preserve Entity names such as Fake Breakout Phantom, FOMO Wraith, Liquidity Hydra, and Drawdown Leviathan exactly.
Create migrations, constraints, seed fixtures, and idempotency tests.
Verify fresh migration, rollback, repeated seed, foreign keys, duplicate mutation rejection, and negative-balance protection.
Do not let the client access the database directly.
Run all required gates and return evidence.
```

### 5.3 Client visual task

```text
Implement only the assigned client visual task against the approved contract and mock fixtures.
Do not invent domain entities or translate Entity names.
Preserve exact canonical Entity display names in every locale.
Create all required loading, error, locked, empty, sealed, resolving, result, and insufficient-currency states.
Use the visual lab for variants; do not alter scoring or economy rules.
Run component tests, interaction tests, responsive QA, accessibility checks, visual regression, typecheck, lint, and build.
Return screenshots or equivalent evidence and mark ACCEPTED only if every gate passes.
```

### 5.4 Scoring task

```text
Implement only the assigned scenario/scoring task.
Use point-in-time data and server-authoritative resolution.
Test Long, Short, Wait, No Trade, invalidation, insufficient evidence, timeout, duplicate submit, post-seal mutation, future leakage, lucky profit with bad process, and good process with bad outcome.
Pips, Stars, cosmetics, and purchases must not affect score or outcome.
Run deterministic replay tests and full relevant regression tests.
Return rubric version, changed files, exact test commands, results, and acceptance status.
```

### 5.5 Economy task

```text
Implement only the assigned economy task.
Pips are earned non-transferable progress currency; Stars are premium access currency.
Use the immutable server-authoritative ledger and idempotency keys.
Test earning, spending, caps, refresh, retry, duplicate requests, insufficient balance, and reconciliation.
Never sell score, answers, outcomes, ranking advantage, or risk advantage.
Do not use economy changes to alter Entity scoring.
Run economy, API, regression, typecheck, lint, build, and manual QA gates.
```

### 5.6 Referral task

```text
Implement only the assigned referral task.
Use one-level referrals, seven-day attribution, activation after three finalized scenarios, reward holds, monthly caps, and anti-abuse checks.
No second-level rewards. No cash, Stars, TON, or tradable assets.
Test attribution expiry, self-referral, duplicate devices, payment reuse, refund window, and idempotent rewards.
Run analytics event tests and all mandatory quality gates.
```

## 6. Periodic whole-system validation prompt

Run this prompt periodically after several PRs. It is a control prompt, not a feature implementation prompt.

```text
You are performing a Signal Arena whole-system integration audit.
This is an audit only. Do not implement fixes before producing the report.

Read:
- README.md
- AGENTS.md
- full_game_spec.md
- academy_plan_99.md
- style-tone.txt
- brand.md
- docs/system_architecture_v4.md
- docs/master_prompt_integration.md
- docs/acceptance_matrix.md
- docs/final_20_80_audit.md
- docs/economy_monetization_referrals_v1.md
- docs/pip_economy_150_simulation.md
- docs/topbar_currency_ui_spec.md
- docs/referral_and_growth_spec.md
- current git diff and the last 3–5 merged PRs

Audit, in this order:
1. Build and environment health.
2. TypeScript type consistency.
3. API contract versus client usage.
4. Database schema, migrations, repositories, and seed fixtures.
5. Client states versus API states.
6. Scenario state machine and decision immutability.
7. Point-in-time integrity and future-leak prevention.
8. Deterministic scoring and rubric versioning.
9. Entity catalog: unified Entity group, exact English names, stable IDs,
   no invented Enemy/Boss split, no translated Entity names.
10. Academy → Exam → Arena → Collection progression.
11. Entity progression: UNKNOWN PATTERN → EMERGING PATTERN → IDENTIFIED
    → MASTERY I–V; verify that identification/mastery is not treated as
    ordinary character unlocking.
12. Pips ledger, caps, sinks, duplicate rewards, and reconciliation.
13. Stars entitlements and pay-to-win prohibitions.
14. Referral attribution, activation, holds, caps, and fraud controls.
15. Tournament ranking and reward integrity.
16. Analytics event names and payloads.
17. Loading, error, empty, locked, sealed, resolving, result, and
    insufficient-currency UI states.
18. PipGem readability and Stars/Pips visual distinction.
19. Responsive viewport, accessibility, performance smoke, and visual regression.
20. Regression across the complete primary loop:
    bootstrap → scenario → evidence → decision → seal → outcome → score
    → explanation → progression → Pips → rematch.

Run and record:
- npm run lint
- npm run typecheck
- npm run test
- integration tests
- contract tests
- E2E tests
- npm run build
- migration replay
- seed replay
- visual regression
- viewport QA
- accessibility checks
- deterministic scoring replay
- future-leak tests
- terminal interaction tests
- ledger reconciliation
- duplicate reward tests

For every failure report:
- severity P0/P1/P2/P3;
- file and symbol;
- reproduction steps;
- expected result;
- actual result;
- affected contract or document;
- minimal fix proposal;
- whether it blocks acceptance.

Return exactly:
1. Executive status: PASS, BLOCKED, or REJECTED.
2. Commands and results.
3. Cross-layer inconsistencies.
4. Broken user flows.
5. Naming/localization violations.
6. Data and economy integrity issues.
7. Visual and accessibility issues.
8. Prioritized remediation plan.
9. Regression coverage gaps.
10. Final acceptance checklist.

Do not silently fix issues during this audit.
Do not claim PASS if any P0/P1 issue, failing required test, contract mismatch,
future-leak risk, duplicate reward risk, or broken primary flow exists.
```

## 7. Post-audit repair prompt

Run only after the audit report exists:

```text
Implement only the P0/P1 fixes listed in the attached integration audit.
Do not broaden scope.
For each fix, add or update a regression test first where practical.
Preserve the canonical unified Entity model and exact English Entity names.
After implementation rerun every failed gate and the complete primary-loop smoke test.
Return a before/after failure table, changed files, test evidence, and updated acceptance status.
```

## 8. Acceptance report template

```text
Iteration:
PRs included:
Commit range:
Date:
Reviewer:

User-visible result:
Scope:
Out of scope:

Changed files:

Automated checks:
- lint:
- typecheck:
- unit:
- integration:
- contract:
- E2E:
- build:
- visual regression:
- accessibility:
- performance smoke:

Manual QA:
- primary flow:
- refresh/retry:
- error state:
- empty/locked state:
- mobile:
- desktop:

Data/economy integrity:
- idempotency:
- ledger reconciliation:
- client-authority check:
- future-leak check:

Evidence:
Known limitations:
Backlog tickets:

Final status: PLANNED / IN_PROGRESS / BLOCKED / READY_FOR_REVIEW / ACCEPTED / REJECTED
Blocking defects:
```

## 9. Non-negotiable product invariants

- The original full specification remains the source of truth for the unified Entity catalog.
- Entity names are always English and exact; descriptions can be localized.
- Cards can be translated only when a recognized term is absent; well-known terms such as Stop Loss, Take Profit, Breakout, Liquidity Sweep, Support, Resistance, Short Squeeze, No Trade, and Wait remain English.
- Client never connects directly to the database.
- Score, outcomes, hidden entities, and balances are server-authoritative.
- Pips never create competitive advantage.
- Purchases never sell answers, score, outcomes, risk advantage, or ranking advantage.
- No feature is accepted without tests, checklist, evidence, and explicit status.
- Periodic integration audits must be run after several PRs and before release candidates.
