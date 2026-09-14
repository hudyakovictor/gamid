# Signal Arena — Implementation Plan, Iteration Gates & Prompt Library

> **DOCUMENT ROLE: HUMAN-ONLY CONTROL DOCUMENT**
>
> This file is not an automatic instruction set for coding agents. Agents must not use this document wholesale at startup. The owner selects one task prompt, provides only the relevant context, and runs the required verification prompt separately.

## Cross-document contract

Before any implementation task, consult only the relevant documents through `docs/README.md`. The canonical product model is `../full_game_spec.md`; curriculum is `../academy_plan_99.md`; scenario contracts are `scenario_authoring_schema_99.md`; historical sources and APIs are `scenario_authoring_and_historical_data_spec.md` and `historical_data_api_integration_plan.md`; learning mechanics are in `learning_science_evidence_and_curriculum_plan.md`; motion is in `motion_interaction_system_spec.md`; economy is in `economy_monetization_referrals_v1.md`.

When a shared concept changes, update the canonical document first, then all dependent documents, fixtures, schemas, tests, and prompts. Run the whole-system audit after the change.

## Universal Definition of Done

Every iteration requires implementation, unit tests, integration tests where boundaries changed, contract tests when API changed, error-path tests, idempotency tests for mutations, regression tests, typecheck, lint, build, manual QA, visual/responsive QA for UI, accessibility checks, reduced-motion QA for motion, data-integrity checks, evidence, known limitations, and explicit status.

Blocking conditions:

```text
failing typecheck
failing build
critical failing test
P0/P1 defect
unverified primary flow
duplicate reward risk
client-authoritative score or balance
future-data leak
hidden Entity leak
motion blocks meaningful action
missing evidence
```

## Iteration dependency map

```text
ITERATION 00 Contract and state machine
  → ITERATION 01 Database, migrations, seed
  → ITERATION 02 Mock API and client shell
  → ITERATION 03 Main visual client and visual lab
  → ITERATION 04 Scenario engine and scoring
  → ITERATION 05 Real API and persistence
  → ITERATION 06 Progression and Pips
  → ITERATION 07 Pip Shop and cosmetics
  → ITERATION 08 Stars and monetization
  → ITERATION 09 Referral
  → ITERATION 10 Tournaments
  → ITERATION 11 Periodic integration audit
```

Motion implementation is a client stream after contract and fixtures:

```text
motion tokens
→ interaction state specs
→ micro feedback
→ screen transitions
→ reveal choreography
→ celebration states
→ reduced-motion/accessibility QA
```

Scenario authoring and API gates can proceed after the contract:

```text
Contract
→ API-01 provider interfaces
→ API-02 Binance adapter
→ API-03 snapshots/provenance
→ scenario schema validator
→ scenario import
→ client/API/scoring E2E
```

## Required scenario gates

Every authored scenario must pass schema, source availability, future-leak, hidden Entity, import, reveal determinism, client projection, scoring, E2E, and human content checks in `scenario_authoring_schema_99.md`.

## Required learning gates

Every learning feature must connect Theory Module, Worked Example, Skill Card, Card Header, recall, decision, debrief, and delayed rematch according to `learning_science_evidence_and_curriculum_plan.md`.

## Required motion gates

Every non-trivial animation must declare purpose, trigger, before/after states, easing, duration, interruption policy, reduced-motion fallback, and sound behavior where relevant. Check enter/exit/in-scene easing, auto-advance, focus, mobile layout, visual regression, reduced motion, and performance using `motion_interaction_system_spec.md`.

## Required economy gates

Every reward or spend mutation must use the server-authoritative ledger, idempotency key, reconciliation, and no-pay-to-win checks from `economy_monetization_referrals_v1.md`.

## Periodic whole-system validation prompt

Run after every 3–5 merged PRs, before a release candidate, and after shared type/API/database/scoring/economy/localization/visual-state/motion changes.

```text
Audit the complete Signal Arena system. Do not silently fix issues before reporting.

Read docs/README.md and the relevant canonical files.
Check:
- client/API/schema compatibility;
- migrations, seed, and snapshots;
- Theory Module/Skill Card/Card Header linkage;
- scenario public/hidden projections;
- t0 and future-leak protection;
- exact English Entity names;
- Level 1–99 rules;
- deterministic scoring;
- Pips ledger and entitlement integrity;
- referral and tournament constraints;
- loading/error/locked/sealed/result states;
- motion purpose, timing, easing, interruption, auto-advance, reduced motion,
  celebration, and performance;
- visual, accessibility, responsive, and performance checks;
- complete primary flow.

Run lint, typecheck, unit, integration, contract, E2E, build, migration replay,
seed replay, visual regression, viewport QA, accessibility, reduced-motion QA,
future-leak tests, deterministic scoring replay, ledger reconciliation, and
duplicate reward tests.

Return PASS, BLOCKED, or REJECTED with commands, results, cross-layer
inconsistencies, severity, reproduction, affected files, remediation,
regression gaps, and final acceptance checklist.
```
