# Signal Arena Development Status

Status: ACCEPTED_LOCAL
Scope: current implementation status and evidence snapshot
Owner: Signal Arena project owner
Last reviewed: 2026-09-21
Supersedes: previous status snapshots
Required evidence: gate/evidence records for every accepted local or production claim
Canonical dependencies: `roadmap_and_release_control_plane.md`, `acceptance_matrix.md`, `system_architecture.md`

Status date: 2026-09-21

## Status vocabulary

```text
REQUIRED
PLANNED
IMPLEMENTED_LOCAL
ACCEPTED_LOCAL
PRODUCTION_READY
BLOCKED
DEPRECATED
```

`developing_status.md` and gate/evidence records are the only sources of actual implementation status. Target architecture and product specifications do not imply implementation.

## Evidence record minimum

Every accepted claim must reference:

```text
gate_id
evidence_id
commit_sha
environment
verified_at
blocker_id
notes
```

## Current status

The repository contains the product specification, curriculum, economy rules, motion system, asset provenance workflow, security/deployment/scaling/observability contracts, Vercel alpha and provider migration strategy, AI agent operations architecture, internal roadmap/release-control specification, agent contract, iteration gates, an executable SQLite foundation with ScenarioPackage import, DB-backed public projection, sealed scenario-run lifecycle, a Telegram authentication/session boundary, API security hardening for the local boundary, a `PersistencePort` consumed by the API with SQLite and PostgreSQL adapters, forward-only PostgreSQL migrations with an explicit migration command, a server-authoritative foundation scoring service, a bounded Binance provider adapter boundary, idempotent normalized snapshot persistence, and the `apps/client-prototype` interface-shell client: a Vite + React 19 workspace package implementing the vertical slice (bootstrap → hub → scenario brief → decision workspace → decision lock → server reveal → score breakdown → debrief → rematch) against the API contracts, with a pure flow reducer, local run persistence for refresh recovery, Telegram `initData` auth with fixture fallback, typed contract-validated API responses, and Vitest coverage of the flow, persistence, and client boundary.

The project is **not yet accepted as a complete executable implementation**. Foundation claims below are `ACCEPTED_LOCAL`, not `PRODUCTION_READY`. Iteration 00/01 now provides versioned contracts, content validation, deterministic foundation scoring, DB-backed scenario reads, start/seal/reveal run endpoints, Telegram identity verification, hashed sessions, logout/revocation, tests, scripts, and CI configuration. The repository cleanup and deployment architecture pass is complete at the documentation level; production controls remain planned until implemented and evidenced.

Three further runtime pieces landed on 2026-09-21: (1) the **learning content registry** (`packages/content/src/registry.ts`) — an executable link from curriculum to game data: 15 theory modules (display numbers 00–14), ~110 chapters, 40 skill cards, 9 protocols, 40 canonical (exact-English) entities, and Scenario Level ranges that cover 1–99 exactly once, enforced by `validate:content` (broken-link, canonical-name and level-coverage checks) plus beginner/core/advanced ScenarioPackage fixtures; (2) the **server-authoritative economy runtime** — an immutable `ledger_events` table (event, user, asset, signed amount, reason, source/scenario refs, idempotency key, promo flag, risk state) with derived balances (Coins summed from the ledger, including the promo subset; XP/Mastery/Energy kept in a `user_economy_state` row updated atomically with each event), the XP curve from `game_balance_spec.md` §3.1, quality modifiers, mastery stars, the 500-XP UTC-day cap and 30-minute energy regen, reward grants wired into reveal (idempotent per run, so replayed reveals never double-grant), and `GET /api/v1/users/:userId/balance` + `GET /api/v1/users/:userId/ledger` endpoints; and (3) the **store/checkout + referral runtime** on top of that ledger — `GET /api/v1/catalog` (5 Coin Packs at the canonical Stars prices, 4 services, 3 Founder SKUs per `catalog_sku_spec.md`), `POST /api/v1/purchases` (Coin Pack credit reconciled by Telegram invoice id so a replayed payment can never double-credit; service and SKU purchases with server-side Coins spend authorization, atomic supply reservation, entitlement grants unique per user, and energy grants applied by the server), `POST /api/v1/purchases/:purchaseId/refund` (coins returned, entitlements revoked, purchase marked refunded, double-refund rejected), and the referral loop (`POST /api/v1/referrals` one idempotent code per inviter; attribution with the 7-day window and self-referral rejection; server-driven activation at 3 valid solo scenarios paying 25 promo Coins to both sides exactly once; first confirmed invitee purchase paying the inviter 50 promo Coins once; 250 promo-Coins-per-inviter-per-UTC-month cap enforced from the ledger). The client Top Bar renders only server-derived values (display-only, per `economy_monetization_referrals.md` §8) with a placeholder state while the snapshot loads.

## Acceptance status

```text
Documentation-only: no longer true
Executable foundation: PASS
Production vertical slice: NOT YET ACCEPTED
Overall product: BLOCKED
```

The foundation, database/migration/seed gate, ScenarioPackage importer/projection boundary, foundation scenario-run lifecycle, Telegram authentication boundary, local API hardening, SQLite persistence adapter, PostgreSQL pool/repository lifecycle, PostgreSQL migration runner, foundation scoring service, Binance adapter boundary, normalized snapshot persistence, the learning content registry and the server-authoritative economy ledger (SQLite path with idempotent duplicate-reward e2e; Postgres adapter mirrored, its migration included in the ordered runner) are executable and locally evidenced. The product remains blocked until shared production rate limiting, ScenarioPackage ingestion/publication, production scoring governance, store/checkout and referral flows on top of the ledger (the ledger itself — including the promo-balance — is implemented), structured logging/alerting, browser visual/responsive/accessibility QA, visual/release asset QA, backup/restore rehearsal and the production-complete vertical slice are implemented and evidenced. The Phaser runtime foundation slice is executable locally, but its browser and accessibility gates are still open. Entity portraits and Skill Card artwork are original project assets with provenance recorded in `assets/asset-manifest.json`; they remain draft until QA approval. Logging, metrics, tracing, audit events, alerts, and incident response are specified in `observability_and_incident_response.md`; they are not yet shipped by the current foundation.

## Immediate next sequence

1. Confirm `hudyakovictor/ssarena` as the authoritative runtime repository.
2. Foundation — executable scaffold, scripts, CI and baseline fixture. **PASS**.
3. Real contract tests. **PASS**.
4. Database, migrations and repeatable seed fixtures. **PASS** for the SQLite foundation gate.
5. ScenarioPackage validator/importer and public/hidden projection boundary. **PASS** for the foundation gate.
6. DB-backed Scenario Run API: start, immutable seal, and post-seal reveal. **PASS** for the foundation gate.
7. Telegram auth boundary, session extraction, route protection, logout/revocation and local API hardening. **PASS** for the local gate; shared production rate limiting, structured observability and deployment validation remain open.
8. Foundation scoring contract, golden fixtures and score persistence. **PASS** for `score-v1` foundation gate; production rubric calibration and review tooling remain open.
9. Historical provider adapters and point-in-time snapshot pipeline. Binance adapter boundary, security fixtures and normalized snapshot persistence are **PASS**; Snapshot scheduling remains open, ScenarioPackage ingestion/publication is **PASS** (see 13b).
10. Client prototype vertical slice: interface shell (all 15 stable screen IDs), flow reducer with reveal-before-seal guard, typed contract-validated API client, refresh recovery via persisted idempotency keys, duplicate-seal recovery, and 26 client unit tests **PASS locally**; scenario catalog (`GET /api/v1/scenarios`), user run history (`GET /api/v1/users/:userId/scenario-runs`, `GET /api/v1/users/me`) and server-derived balance (`GET /api/v1/users/:userId/balance`) endpoints are implemented with e2e tests; the Top Bar renders server-derived balance values only (display-only). Browser E2E, visual/responsive/accessibility evidence and production assets remain open (manual QA required).

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
12. Server-authoritative economy ledger (XP/Energy/Mastery/Coins economy v2). **PASS** locally (SQLite path): immutable `ledger_events` with idempotency-keyed duplicates rejected, derived balances (Coins from the ledger incl. promo subset; XP/Mastery/Energy state row), XP curve + quality modifier + 500 XP/UTC-day cap, mastery stars (H-BAL-3), 30-minute energy regen, idempotent reward grants on reveal, `balance`/`ledger` endpoints and duplicate-reward e2e.
12b. Store/checkout + referrals on the ledger. **PASS** locally (SQLite path): catalog contract + canonical data (5 packs, 4 services, 3 Founder SKUs) with `validateCatalog`-style unit tests, invoice-reconciled Coin Pack purchase (duplicate payment credits once), service/SKU purchases with balance checks, idempotent client keys, atomic supply reservation, unique entitlement grants, refund/revoke, and the full referral lifecycle (code → attribution → 3 scenarios → both sides paid once, purchase bonus once, self-referral rejected, monthly promo cap from the ledger). A full Postgres integration test for ledger/store/referrals remains open.
13. Learning content registry (curriculum → game data link). **PASS** locally: `packages/content` registry (modules 00–14, ~110 chapters, 40 cards, 9 protocols, 40 canonical entities, levels 1–99 covered exactly once), `validate:content` checks broken links, canonical exact-English Entity names and level coverage, plus beginner (level 3), core (level 32) and advanced (level 78) ScenarioPackage fixtures.
14. Visual lab, motion/accessibility QA and production asset release approval.
15. Vercel alpha deployment and provider/payment smoke test.
16. AI agent runtime contracts, isolated job runner, and CRM approvals.
17. Roadmap control plane: contracts, gate/evidence ingestion, blocker calculation, Admin API and CRM views.
18. Full integration audit and release evidence.

## Current evidence

```text
pnpm install --frozen-lockfile                  PASS
pnpm typecheck                                  PASS
pnpm lint                                       PASS
pnpm test                                       PASS — 67 tests, 1 skipped (incl. economy curve/snapshot, ledger idempotency, catalog spec tables, content registry)
pnpm test:e2e                                   PASS — 24 tests (incl. duplicate-reward idempotency, balance/ledger, store checkout incl. duplicate payment + refund/revoke, referral lifecycle, scenario ingestion/publication gate)
pnpm client:typecheck                           PASS
pnpm client:lint                                PASS
pnpm client:test                                PASS — 26 tests (flow reducer, persistence, API client incl. balance contract)
pnpm client:build                               PASS — 307 kB JS / 14 kB CSS (gzip 92 kB)
pnpm design-system:typecheck                    PASS
pnpm design-system:build                        PASS
pnpm validate:contracts                         PASS
pnpm validate:content                           PASS — 3 fixtures + registry (15 modules 00–14, 40 cards, 9 protocols, 40 entities, levels 1–99 exact coverage)
pnpm validate:locales                           PASS
pnpm validate:assets                            PASS — 87 assets (skill-card paths corrected to .svg, topbar mockup path corrected)
pnpm validate:public-client                     PASS — no hidden/future truth or client-authoritative scoring in apps/client-prototype/src
pnpm build                                      PASS
DB_PATH=var/db-validation.sqlite pnpm db:migrate PASS — repeatable, including historical snapshots, 0004_economy_ledger and 0005_catalog_purchases_referrals
DB_PATH=var/db-validation.sqlite pnpm db:seed    PASS — repeatable
Manual smoke (live API, fixture mode):          PASS — start → seal → reveal → score 87 → balance (XP +52, ★★) → replayed reveal (no double grant) → ledger (2 idempotency-keyed events) → catalog → pack_arena purchase (+600 Coins) → replayed invoice (no double credit) → energy service (−20 Coins) → referral code + self-referral rejection
```

Client prototype manual QA notes (pending human browser QA): the vertical slice
was exercised against a live local API (start → seal → reveal → history) and the
flow/persistence/client boundaries are covered by unit tests. Visual,
responsive and accessibility gates for the browser runtime remain open and
require manual QA with screenshots.

The DB foundation stores full server-side ScenarioPackages, preserves `(scenario_id, version)` records, enforces scenario/user foreign keys, and makes scenario-run creation idempotent by `idempotency_key`. The importer rejects invalid JSON, post-t0/unavailable sources, invalid future ranges, and mismatched future hashes. The API reads versioned packages from SQLite or PostgreSQL through the same `PersistencePort`, returns only public projection before seal, rejects reveal before seal, and exposes reveal data plus the persisted process score only after an immutable sealed decision. Telegram auth, async shared replay protection, session revocation, local CSRF/CORS/header/rate-limit controls, foundation scoring, PostgreSQL lifecycle integration, Binance adapter validation, the scenario catalog and user run-history read endpoints, and the client prototype flow (pure reducer with reveal-before-seal guard, refresh recovery, duplicate-seal recovery, contract-validated responses) are locally evidenced; shared production rate limiting, structured observability, provider ingestion, rubric governance, browser E2E/accessibility evidence, backup/restore rehearsal and production scoring calibration remain open.

## Decision policy

Audit and simulation results are internal inputs. They are not canonical product documents. Final decisions are recorded in the active specifications and this status file, without publishing raw audit output in the main documentation path.

## Acceptance rule

No implementation phase is accepted from documentation alone. Acceptance requires executable code, automated tests, manual QA, evidence, and explicit status.
