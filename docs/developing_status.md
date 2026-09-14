# Signal Arena Development Status

Status date: 2026-09-14

## Current status

The repository contains the product specification, curriculum, economy rules, motion system, asset provenance workflow, security/deployment/scaling/observability contracts, Vercel alpha and provider migration strategy, AI agent operations architecture, internal roadmap/release-control specification, agent contract, iteration gates, an executable SQLite foundation with ScenarioPackage import, DB-backed public projection, sealed scenario-run lifecycle, a Telegram authentication/session boundary, API security hardening for the local boundary, a `PersistencePort` consumed by the API with SQLite and PostgreSQL adapters, forward-only PostgreSQL migrations with an explicit migration command, a server-authoritative foundation scoring service, a bounded Binance provider adapter boundary, and idempotent normalized snapshot persistence. The client prototype is a Vite workspace package with a typed bootstrap, package-level tests, build scripts and a planned viewport QA matrix.

The project is **not yet accepted as a complete executable implementation**. Iteration 00/01 now provides versioned contracts, content validation, deterministic foundation scoring, DB-backed scenario reads, start/seal/reveal run endpoints, Telegram identity verification, hashed sessions, logout/revocation, tests, scripts, and CI configuration. The repository cleanup and deployment architecture pass is complete at the documentation level; production controls remain planned until implemented and evidenced.

## Acceptance status

```text
Documentation-only: no longer true
Executable foundation: PASS
Production vertical slice: NOT YET ACCEPTED
Overall product: BLOCKED
```

The foundation, database/migration/seed gate, ScenarioPackage importer/projection boundary, foundation scenario-run lifecycle, Telegram authentication boundary, local API hardening, SQLite persistence adapter, PostgreSQL pool/repository lifecycle, PostgreSQL migration runner, foundation scoring service, Binance adapter boundary and normalized snapshot persistence are executable and locally evidenced. The product remains blocked until shared production rate limiting, ScenarioPackage ingestion/publication, production scoring governance, Phaser client, Pips ledger, structured logging/alerting, browser visual/responsive/accessibility QA, visual/release asset QA, backup/restore rehearsal and the complete vertical slice are implemented and evidenced. Entity portraits and Skill Card artwork are original project assets with provenance recorded in `assets/asset-manifest.json`; they remain draft until QA approval. Logging, metrics, tracing, audit events, alerts, and incident response are specified in `observability_and_incident_response.md`; they are not yet shipped by the current foundation.

## Immediate next sequence

1. Confirm `hudyakovictor/ssarena` as the authoritative runtime repository.
2. Foundation — executable scaffold, scripts, CI and baseline fixture. **PASS**.
3. Real contract tests. **PASS**.
4. Database, migrations and repeatable seed fixtures. **PASS** for the SQLite foundation gate.
5. ScenarioPackage validator/importer and public/hidden projection boundary. **PASS** for the foundation gate.
6. DB-backed Scenario Run API: start, immutable seal, and post-seal reveal. **PASS** for the foundation gate.
7. Telegram auth boundary, session extraction, route protection, logout/revocation and local API hardening. **PASS** for the local gate; shared production rate limiting, structured observability and deployment validation remain open.
8. Foundation scoring contract, golden fixtures and score persistence. **PASS** for `score-v1` foundation gate; production rubric calibration and review tooling remain open.
9. Historical provider adapters and point-in-time snapshot pipeline. Binance adapter boundary, security fixtures and normalized snapshot persistence are **PASS**; scheduling and ScenarioPackage ingestion remain open.
10. Phaser client vertical slice:

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

11. PostgreSQL pool/repository adapter, readiness/shutdown behavior and migration command. **PASS** locally with a real PostgreSQL integration test; restore drill, staging rehearsal and shared production rate limiting remain open.
12. Server-authoritative Pips ledger.
13. Visual lab, motion/accessibility QA and production asset release approval.
14. Vercel alpha deployment and provider/payment smoke test.
15. AI agent runtime contracts, isolated job runner, and CRM approvals.
16. Roadmap control plane: contracts, gate/evidence ingestion, blocker calculation, Admin API and CRM views.
17. Full integration audit and release evidence.

## Current evidence

```text
pnpm install --frozen-lockfile                  PASS
pnpm typecheck                                  PASS
pnpm lint                                       PASS
POSTGRES_TEST_URL=... pnpm test                PASS — 44 tests
pnpm test:e2e                                   PASS — 10 tests
pnpm validate:contracts                         PASS
pnpm validate:content                           PASS
pnpm validate:locales                           PASS
pnpm validate:assets                            PASS — 81 assets
pnpm build                                      PASS
DB_PATH=var/db-validation.sqlite pnpm db:migrate PASS — repeatable, including historical snapshots
DB_PATH=var/db-validation.sqlite pnpm db:seed    PASS — repeatable
```

The DB foundation stores full server-side ScenarioPackages, preserves `(scenario_id, version)` records, enforces scenario/user foreign keys, and makes scenario-run creation idempotent by `idempotency_key`. The importer rejects invalid JSON, post-t0/unavailable sources, invalid future ranges, and mismatched future hashes. The API reads versioned packages from SQLite or PostgreSQL through the same `PersistencePort`, returns only public projection before seal, rejects reveal before seal, and exposes reveal data plus the persisted process score only after an immutable sealed decision. Telegram auth, async shared replay protection, session revocation, local CSRF/CORS/header/rate-limit controls, foundation scoring, PostgreSQL lifecycle integration and Binance adapter validation are locally evidenced; shared production rate limiting, structured observability, provider ingestion, rubric governance, backup/restore rehearsal and production scoring calibration remain open.

## Decision policy

Audit and simulation results are internal inputs. They are not canonical product documents. Final decisions are recorded in the active specifications and this status file, without publishing raw audit output in the main documentation path.

## Acceptance rule

No implementation phase is accepted from documentation alone. Acceptance requires executable code, automated tests, manual QA, evidence, and explicit status.
