# Signal Arena — Implementation Plan, Iteration Gates & Prompt Library

> **DOCUMENT ROLE: HUMAN-ONLY CONTROL DOCUMENT**
>
> This file is not an automatic instruction set for coding agents. Agents must not use this document wholesale at startup. The owner selects one task prompt, provides only the relevant context, and runs the required verification prompt separately.

## Cross-document contract

Before any implementation task, read `AGENTS.md`, then `docs/README.md`, then only the relevant archive skill and project documents. The canonical product model is `../full_game_spec.md`; curriculum is `../academy_plan_99.md`; scenario contracts are `scenario_authoring_schema_99.md`; historical sources and APIs are `scenario_authoring_and_historical_data_spec.md` and `historical_data_api_integration_plan.md`; learning mechanics are in `learning_science_evidence_and_curriculum_plan.md`; motion is in `motion_interaction_system_spec.md`; asset workflow is in `asset_provenance_and_workflow.md`; economy is in `economy_monetization_referrals_v1.md`.

Every focused task prompt must include a dependency block:

```md
## Task context

Read:
- relevant canonical document
- relevant technical document
- relevant QA document
- relevant asset/motion document, if applicable

Relevant invariants:
- ...

Acceptance gates:
- ...
```

When a shared concept changes, update the canonical source first, then dependent documents, fixtures, schemas, tests, prompts, and asset registry. Run the whole-system audit after the change.

## Universal Definition of Done

Every iteration requires implementation, unit tests, integration tests where boundaries changed, contract tests when API changed, error-path tests, idempotency tests for mutations, regression tests, typecheck, lint, build, manual QA, visual/responsive QA for UI, accessibility checks, reduced-motion QA for motion, asset provenance checks for asset work, data-integrity checks, evidence, known limitations, and explicit status.

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
unknown-license production asset
missing asset provenance
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

Asset implementation is a visual/content stream:

```text
asset need
→ existing asset/license check
→ original/generated/custom decision
→ provenance record
→ stable assetId
→ import
→ visual/responsive/accessibility QA
→ release approval
```

## Required task gates

### Scenario gates

Schema, source availability, future-leak, hidden Entity, import, reveal determinism, client projection, scoring, E2E, and human content checks in `scenario_authoring_schema_99.md`.

### Learning gates

Theory Module, Worked Example, Skill Card, Card Header, recall, decision, debrief, and delayed rematch linkage in `learning_science_evidence_and_curriculum_plan.md`.

### Motion gates

Purpose, trigger, states, easing, duration, interruption, reduced-motion fallback, focus, auto-advance, visual regression, accessibility, and performance in `motion_interaction_system_spec.md`.

### Asset gates

Stable assetId, origin, source, license/permission, commercial/modification rights, sizes, formats, fallback, visual QA, reduced-motion behavior where animated, and no placeholder in release builds in `asset_provenance_and_workflow.md`.

### Economy gates

Server-authoritative ledger, idempotency, reconciliation, and no-pay-to-win checks in `economy_monetization_referrals_v1.md`.

## Periodic whole-system validation prompt

Run after every 3–5 merged PRs, before a release candidate, and after shared type/API/database/scoring/economy/localization/visual-state/motion/asset changes.

```text
Audit the complete Signal Arena system. Do not silently fix issues before reporting.

Read AGENTS.md, docs/README.md, the relevant canonical documents,
and the current git diff/last merged PRs.

Check:
- client/API/schema compatibility;
- migrations, seed, and snapshots;
- Theory Module/Skill Card/Card Header linkage;
- scenario public/hidden projections;
- t0 and future-leak protection;
- exact English Entity names;
- Level 1–99 rules;
- deterministic scoring;
- Pip ledger and entitlement integrity;
- referral and tournament constraints;
- asset IDs, provenance, licenses, fallbacks, and release safety;
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
