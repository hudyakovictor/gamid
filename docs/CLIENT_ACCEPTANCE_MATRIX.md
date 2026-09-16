# Client Acceptance Matrix — Current Status Model

Status: REQUIRED
Scope: client acceptance status and evidence crosswalk
Owner: Signal Arena project owner
Last reviewed: 2026-09-16
Supersedes: numeric Iteration 1 prototype assessment
Required evidence: browser E2E, visual/responsive QA, accessibility QA, reduced-motion QA, contract and API evidence
Canonical dependencies: `developing_status.md`, `acceptance_matrix.md`, `INTERFACE_SHELL.md`, `motion_interaction_system_spec.md`

## 1. Acceptance rule

Client acceptance is not an aggregate score. A strong UI result cannot compensate for a future leak, broken authentication, client-authoritative score, missing accessibility evidence or an unresolved P0/P1 blocker.

Allowed statuses:

```text
PASS
PARTIAL
OPEN
BLOCKED
NOT_APPLICABLE
```

Every factor must be backed by:

```text
status
gate
evidence
environment
last_verified
owner
blocker
```

The authoritative values belong in gate/evidence records. This document defines the required matrix shape and the current known baseline; empty evidence is not acceptance.

## 2. Current factor baseline

| # | Factor | Status | Gate | Evidence | Environment | Last verified | Owner | Blocker |
|---:|---|---|---|---|---|---|---|---|
| 1 | Preload state | PARTIAL | client preload | — | local | — | client | browser QA |
| 2 | Main menu routing | PARTIAL | route map | — | local | — | client | Arena Hub route evidence |
| 3 | Academy route | PARTIAL | route map | — | local | — | client | browser QA |
| 4 | Scenario brief | PARTIAL | client flow | — | local | — | client | browser QA |
| 5 | Scenario identity | PARTIAL | public projection | — | local | — | client/API | browser QA |
| 6 | Public data separation | PASS | future-leak | — | local | 2026-09-15 | API/client | production evidence |
| 7 | Hidden future separation | PASS | future-leak | — | local | 2026-09-15 | API/client | browser evidence |
| 8 | Historical reveal | PARTIAL | reveal flow | — | local | — | client/API | browser E2E |
| 9 | Source Groups | PASS | ScenarioPackage | — | local | 2026-09-15 | content/API | publication pipeline |
| 10 | Skill Cards | PARTIAL | learning linkage | — | local | — | content/client | content registry |
| 11 | Evidence selection | PARTIAL | Decision Workspace | — | local | — | client | browser QA |
| 12 | Decision actions | PARTIAL | decision contract | — | local | — | client/API | browser E2E |
| 13 | Invalidation field | OPEN | scoring contract | — | local | — | scoring | rubric governance |
| 14 | Confidence field | OPEN | scoring contract | — | local | — | scoring | rubric governance |
| 15 | Process scoring | PARTIAL | deterministic replay | — | local | 2026-09-15 | scoring | production calibration |
| 16 | Outcome separation | PASS | public/hidden projection | — | local | 2026-09-15 | API | browser evidence |
| 17 | Debrief structure | OPEN | learning ladder | — | local | — | content/client | content registry |
| 18 | Rematch route | OPEN | delayed rematch | — | local | — | client/content | rematch fixtures |
| 19 | Entity reveal | OPEN | hidden Entity | — | local | — | content/client | browser QA |
| 20 | Account progression | OPEN | balance contract | — | local | — | economy | economy runtime |
| 21 | Mobile layout model | OPEN | responsive QA | — | local | — | client | viewport evidence |
| 22 | Accessibility model | OPEN | accessibility QA | — | local | — | client | browser accessibility run |
| 23 | Keyboard navigation | OPEN | keyboard/focus QA | — | local | — | client | browser accessibility run |
| 24 | Reduced motion | OPEN | reduced-motion QA | — | local | — | client | browser evidence |
| 25 | Error states | OPEN | error-state QA | — | local | — | client/API | browser E2E |
| 26 | Typed state | PASS | client typecheck | — | local | 2026-09-15 | client | production build evidence |
| 27 | Deterministic fixture | PASS | deterministic replay | — | local | 2026-09-15 | scoring | production governance |
| 28 | Phaser scene map | PASS | client build | — | local | 2026-09-15 | client | visual QA |
| 29 | API adapter boundary | PASS | API contract | — | local | 2026-09-15 | client/API | browser E2E |
| 30 | Persistence boundary | PASS | persistence contract | — | local | 2026-09-15 | API/DB | staging rehearsal |
| 31 | Test coverage | PARTIAL | test suite | — | local | 2026-09-15 | QA | browser/accessibility gaps |
| 32 | E2E flow | PARTIAL | E2E | — | local | 2026-09-15 | QA | browser visual/accessibility evidence |
| 33 | Visual QA | OPEN | visual QA | — | local | — | client | viewport evidence |
| 34 | Economy boundary | OPEN | Coins ledger | — | local | — | economy | ledger not shipped |
| 35 | Production readiness | BLOCKED | release readiness | — | local | 2026-09-15 | release | unresolved production gates |

The `PASS` and `PARTIAL` values above are a human-readable baseline and do not replace evidence records. A gate is accepted only when the evidence record is valid for the relevant commit, environment, fixture version and contract version.

## 3. Historical Prototype Assessment

The former numeric Iteration 1 table is retained as historical, non-canonical, superseded context only. Its values must not be averaged or presented as current acceptance.

| # | Factor | Historical target | Iteration 1 score |
|---:|---|---:|---:|
| 1 | Preload state | 100 | 90 |
| 2 | Main menu routing | 100 | 80 |
| 3 | Academy route | 100 | 75 |
| 4 | Scenario brief | 100 | 80 |
| 5 | Scenario identity | 100 | 85 |
| 6 | Public data separation | 100 | 80 |
| 7 | Hidden future separation | 100 | 80 |
| 8 | Historical reveal | 100 | 75 |
| 9 | Source groups | 100 | 80 |
| 10 | Skill cards | 100 | 75 |
| 11 | Evidence selection | 100 | 75 |
| 12 | Decision actions | 100 | 85 |
| 13 | Invalidation field | 100 | 70 |
| 14 | Confidence field | 100 | 70 |
| 15 | Process scoring | 100 | 65 |
| 16 | Outcome separation | 100 | 80 |
| 17 | Debrief structure | 100 | 75 |
| 18 | Rematch route | 100 | 70 |
| 19 | Entity reveal | 100 | 65 |
| 20 | Player progression | 100 | 40 |
| 21 | Mobile layout model | 100 | 40 |
| 22 | Accessibility model | 100 | 45 |
| 23 | Keyboard navigation | 100 | 45 |
| 24 | Reduced motion | 100 | 30 |
| 25 | Error states | 100 | 30 |
| 26 | Typed state | 100 | 85 |
| 27 | Deterministic fixture | 100 | 85 |
| 28 | Phaser scene map | 100 | 85 |
| 29 | API adapter boundary | 100 | 25 |
| 30 | Persistence boundary | 100 | 20 |
| 31 | Test coverage | 100 | 20 |
| 32 | E2E flow | 100 | 15 |
| 33 | Visual QA | 100 | 20 |
| 34 | Economy boundary | 100 | 15 |
| 35 | Production readiness | 100 | 10 |
