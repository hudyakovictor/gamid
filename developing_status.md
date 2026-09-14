# Signal Arena Development Status

Status date: 2026-09-14

## Current status

The repository contains the product specification, curriculum, economy rules, motion system, asset provenance workflow, agent contract, iteration gates, and the first executable foundation with tested SQLite database, ScenarioPackage importer, and projection boundaries.

The project is **not yet accepted as a complete executable implementation**. Iteration 00/01 now provides versioned contracts, content validation, deterministic foundation scoring, a public scenario projection endpoint, tests, scripts, and CI configuration.

## Acceptance status

```text
Documentation-only: no longer true
Executable foundation: PASS
Production vertical slice: NOT YET ACCEPTED
Overall product: BLOCKED
```

The foundation, database/migration/seed gate, and ScenarioPackage importer/projection boundary are executable and locally evidenced, but the product remains blocked until auth, production persistence workflows, real historical providers, production scoring service, the Phaser client, Pips ledger, production asset provenance, and the complete vertical slice are implemented and evidenced.

## Immediate next sequence

1. Confirm `hudyakovictor/ssarena` as the authoritative runtime repository.
2. Foundation — executable scaffold, scripts, CI and baseline fixture. **PASS**.
3. Real contract tests. **PASS**.
4. Database, migrations and repeatable seed fixtures. **PASS** for the SQLite foundation gate.
5. ScenarioPackage validator/importer and public/hidden projection boundary. **PASS** for the foundation gate.
6. Scoring golden fixtures and production scoring service.
7. Phaser client vertical slice:

```text
bootstrap
→ scenario
→ evidence
→ decision
→ seal
→ historical reveal
→ score
→ debrief
→ progression
→ rematch
```

8. Real public/hidden projections and historical snapshot pipeline.
9. Server-authoritative Pips ledger.
10. Visual lab, motion/accessibility QA and production asset provenance.
11. Full integration audit and release evidence.

## Current evidence

```text
pnpm install --frozen-lockfile                  PASS
pnpm typecheck                                  PASS
pnpm lint                                       PASS
pnpm test                                       PASS — 18 tests
pnpm test:e2e                                   PASS — 2 tests
pnpm validate:contracts                         PASS
pnpm validate:content                           PASS
pnpm validate:locales                           PASS
pnpm build                                      PASS
DB_PATH=var/db-validation.sqlite pnpm db:migrate PASS — repeatable
DB_PATH=var/db-validation.sqlite pnpm db:seed    PASS — repeatable
```

The DB foundation stores full server-side ScenarioPackages, preserves `(scenario_id, version)` records, enforces scenario/user foreign keys, and makes scenario-run creation idempotent by `idempotency_key`. The importer rejects invalid JSON, post-t0/unavailable sources, invalid future ranges, and mismatched future hashes. Public and reveal projection contracts are separate; the reveal projection is not exposed through the pre-seal API. This is not yet production persistence or authentication.

## Decision policy

Audit and simulation results are internal inputs. They are not canonical product documents. Final decisions are recorded in the active specifications and this status file, without publishing raw audit output in the main documentation path.

## Acceptance rule

No implementation phase is accepted from documentation alone. Acceptance requires executable code, automated tests, manual QA, evidence, and explicit status.
