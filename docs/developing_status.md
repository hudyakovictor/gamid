# Signal Arena Development Status

Status date: 2026-09-14

## Current status

The repository contains the product specification, curriculum, economy rules, motion system, asset provenance workflow, security/deployment/scaling/observability contracts, Vercel alpha and provider migration strategy, AI agent operations architecture, internal roadmap/release control-plane specification, agent contract, iteration gates, and an executable SQLite foundation with ScenarioPackage import, DB-backed public projection, and sealed scenario-run lifecycle.

The project is **not yet accepted as a complete executable implementation**. Iteration 00/01 now provides versioned contracts, content validation, deterministic foundation scoring, DB-backed scenario reads, start/seal/reveal run endpoints, tests, scripts, and CI configuration. The repository cleanup and deployment architecture pass is complete at the documentation level; production controls remain planned until implemented and evidenced.

## Acceptance status

```text
Documentation-only: no longer true
Executable foundation: PASS
Production vertical slice: NOT YET ACCEPTED
Overall product: BLOCKED
```

The foundation, database/migration/seed gate, ScenarioPackage importer/projection boundary, and foundation scenario-run lifecycle are executable and locally evidenced, but the product remains blocked until authentication, production scoring service, real historical providers, Phaser client, Pips ledger, structured logging/alerting, visual/release asset QA, and the complete vertical slice are implemented and evidenced. Entity portraits and Skill Card artwork are original project assets with provenance recorded in `assets/asset-manifest.json`; they remain draft until QA approval. Logging, metrics, tracing, audit events, alerts, and incident response are specified in `observability_and_incident_response.md`; they are not yet shipped by the current foundation.

## Immediate next sequence

1. Confirm `hudyakovictor/ssarena` as the authoritative runtime repository.
2. Foundation — executable scaffold, scripts, CI and baseline fixture. **PASS**.
3. Real contract tests. **PASS**.
4. Database, migrations and repeatable seed fixtures. **PASS** for the SQLite foundation gate.
5. ScenarioPackage validator/importer and public/hidden projection boundary. **PASS** for the foundation gate.
6. DB-backed Scenario Run API: start, immutable seal, and post-seal reveal. **PASS** for the foundation gate.
7. Scoring golden fixtures and production scoring service.
8. Phaser client vertical slice:

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

9. Historical provider adapters and point-in-time snapshot pipeline.
10. Server-authoritative Pips ledger.
11. Visual lab, motion/accessibility QA and production asset release approval.
12. Vercel alpha deployment and provider/payment smoke test.
13. AI agent runtime contracts, isolated job runner, and CRM approvals.
14. Roadmap control plane: contracts, gate/evidence ingestion, blocker calculation, Admin API and CRM views.
15. Full integration audit and release evidence.

## Current evidence

```text
pnpm install --frozen-lockfile                  PASS
pnpm typecheck                                  PASS
pnpm lint                                       PASS
pnpm test                                       PASS — 22 tests
pnpm test:e2e                                   PASS — 4 tests
pnpm validate:contracts                         PASS
pnpm validate:content                           PASS
pnpm validate:locales                           PASS
pnpm validate:assets                            PASS — 81 assets
pnpm build                                      PASS
DB_PATH=var/db-validation.sqlite pnpm db:migrate PASS — repeatable
DB_PATH=var/db-validation.sqlite pnpm db:seed    PASS — repeatable
```

The DB foundation stores full server-side ScenarioPackages, preserves `(scenario_id, version)` records, enforces scenario/user foreign keys, and makes scenario-run creation idempotent by `idempotency_key`. The importer rejects invalid JSON, post-t0/unavailable sources, invalid future ranges, and mismatched future hashes. The API reads versioned packages from SQLite, returns only public projection before seal, rejects reveal before seal, and exposes reveal data only after an immutable sealed decision. This is not yet production authentication, provider ingestion, or production scoring.

## Decision policy

Audit and simulation results are internal inputs. They are not canonical product documents. Final decisions are recorded in the active specifications and this status file, without publishing raw audit output in the main documentation path.

## Acceptance rule

No implementation phase is accepted from documentation alone. Acceptance requires executable code, automated tests, manual QA, evidence, and explicit status.
