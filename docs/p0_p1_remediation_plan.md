# Signal Arena — P0/P1 Remediation Plan

Date: 2026-09-14
Source: `github_150_gap_audit.md`

## P0-0 — Confirm implementation repository

**Goal:** remove ambiguity about where executable Signal Arena code lives.

Checklist:

- [ ] Confirm `hudyakovictor/ssarena` is the authoritative runtime repository.
- [ ] If not, update `docs/repository_migration_map.md` with the authoritative repository.
- [ ] Add an implementation status to `developing_status.md`.
- [ ] Define the first implementation branch and local run command.

Gate:

```text
A new agent can identify the repository, install command, run command,
and test command without guessing.
```

## P0-1 — Create executable foundation and CI

**Goal:** make the project runnable and automatically verifiable.

Checklist:

- [ ] Add package manifest and scripts.
- [ ] Add source/client/server directory layout.
- [ ] Add test directories.
- [ ] Add `.github/workflows/ci.yml`.
- [ ] Run install, typecheck, lint, unit, integration, E2E, and build.
- [ ] Publish test/build artifacts.
- [ ] Add secret and dependency scanning.

Gate:

```text
A clean checkout can install, run tests, and build in CI.
```

## P1-1 — Versioned contracts

- [ ] Add `contracts/openapi.yaml` or JSON Schema.
- [ ] Generate TypeScript types.
- [ ] Add request/response fixtures.
- [ ] Add contract tests.
- [ ] Document versioning and backward compatibility.

## P1-2 — Database and seed

- [ ] Add migrations.
- [ ] Add repository interfaces.
- [ ] Add demo seed for all UI states.
- [ ] Add rollback and repeat-seed tests.
- [ ] Add Pip ledger constraints.

## P1-3 — Vertical slice

Implement and test:

```text
bootstrap
→ scenario
→ evidence
→ decision
→ seal
→ outcome
→ score
→ explanation
→ progression
→ Pips
→ rematch
```

Required evidence:

- [ ] desktop screenshot;
- [ ] mobile screenshots;
- [ ] E2E trace;
- [ ] deterministic scoring output;
- [ ] duplicate-submit test;
- [ ] refresh recovery test.

## P1-4 — Scenario and historical data pipeline

- [ ] Implement ScenarioPackage schema.
- [ ] Implement validator.
- [ ] Implement public/hidden projections.
- [ ] Implement provider interfaces.
- [ ] Implement free MVP OHLCV adapter.
- [ ] Store immutable snapshots and hashes.
- [ ] Add future-leak tests.
- [ ] Add recorded replay fixtures.

## P1-5 — Visual lab, assets, and motion

- [ ] Implement fixture-driven visual lab.
- [ ] Add asset registry and provenance validator.
- [ ] Add PipGem/Entity stable asset IDs.
- [ ] Add motion tokens and interaction states.
- [ ] Add visual regression.
- [ ] Add reduced-motion and accessibility tests.
- [ ] Add mobile performance smoke.

## P1-6 — Learning content registry

- [ ] Link Theory Module, Worked Example, Skill Card, Card Header, Scenario, Debrief, and Delayed Rematch.
- [ ] Link Cards, Protocols, Entities, Chapters, and Level 1–99.
- [ ] Add validator for broken links and untranslated canonical Entity names.
- [ ] Add beginner/core/advanced fixtures.

## P1-7 — Economy runtime

- [ ] Implement server-authoritative Pip ledger.
- [ ] Implement earning, caps, sinks, idempotency, reconciliation.
- [ ] Implement first-session and recovery Rematch rules.
- [ ] Add economy integration tests.
- [ ] Add fraud/duplicate reward tests.

## P1-8 — Accessibility, security, performance

- [ ] Add axe/Playwright checks.
- [ ] Add keyboard/focus matrix.
- [ ] Add reduced-motion checks.
- [ ] Add secret/dependency scanning.
- [ ] Add env and log-redaction tests.
- [ ] Add asset-size and performance budgets.

## Closure rule

Do not mark a remediation item `ACCEPTED` from documentation alone. Each item requires executable implementation, tests, QA evidence, and a status report.
