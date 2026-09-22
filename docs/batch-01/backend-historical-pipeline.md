# Batch 01 — Backend Historical Pipeline

Status: COMPLETE
Owner: Backend Agent
Branch: `arena/01a0c6cf-gamid` (session-fixed; see §0.1)
Starting commit: `80498e993ea220e9455bb5708b5188f822986b25`
Date: 2026-09-22

## 0. Startup declaration

### 0.1 Role

**Role: Backend Agent** (Signal Arena parallel batch 01).

### 0.2 Baseline verification

- Required starting commit: `80498e993ea220e9455bb5708b5188f822986b25`
- Verified via `git rev-parse HEAD` → `80498e993ea220e9455bb5708b5188f822986b25` — **MATCH**.
- Task prompt asks to create branch `arena/batch-01-backend-historical-pipeline`.
  The Arena session is fixed to branch `arena/01a0c6cf-gamid` (system binding:
  all work must stay on this branch; switching/creating other branches breaks
  session tracking). **Conflict recorded:** the requested branch name cannot be
  honoured without violating the session binding. All work proceeds on
  `arena/01a0c6cf-gamid`, branched from the exact required commit. No rebase,
  no merge of other candidates.

### 0.3 Documents read (smallest relevant context)

1. `AGENTS.md` — agent contract, ownership, frozen contracts, invariants.
2. `docs/README.md` — documentation hub and canonical hierarchy.
3. `.claude/skills/signal-arena/SKILL.md` — Signal Arena project overlay
   (contract-first workflow, invariants, quality gate).
4. Backend-relevant only:
   - `docs/system_architecture.md` (§1 monorepo, §2 topology, §7 API stack,
     §9 domain boundaries)
   - `docs/security_architecture.md` (trust boundaries, API/admin security,
     provider/SSRF rules, release gates)
   - `docs/acceptance_matrix.md` (scenario pipeline, database, release gates)
   - `packages/contracts/src/scenario.ts` + `provider.ts` + `run.ts`
     (frozen executable contracts — read-only)
   - `packages/content/src/validate.ts` + fixtures (existing validation and
     ScenarioPackage model — read-only)
   - `packages/domain/src/scenario.ts` (projections, decision guards)
   - `packages/db/src/migrations.ts`, `postgres-migrations.ts`,
     `schema-manifest.ts`, `migration-registry.ts`, `repository.ts`,
     `ports.ts`, `sqlite-adapter.ts`, `postgres-adapter.ts`
     (persistence boundary, canonical migration source, drift validation)
   - `packages/providers/src/binance.ts` (existing adapter)
   - `apps/api-server/src/server.ts` + `main.ts` (API conventions, auth,
     admin gating, CSRF/CORS)
   - `tests/e2e/ingestion.test.ts` (existing ingestion behaviour that must
     keep passing)
   - `scripts/validate-migrations.ts` (migration gate)

Not ingested: game-design/art/audio/multiplayer docs, frontend screens,
economy/catalog deep specs, roadmap/CRM specs, research/competitors —
out of scope for this backend slice.

### 0.4 Skill routing

- Required project overlay: `.claude/skills/signal-arena/SKILL.md` — loaded.
- `AGENTS.md` §11 literally asks to select an archive game-development
  sub-skill. **Recorded:** no available game-development sub-skill
  (`web-games`, `mobile-games`, `game-design`, `2d-games`, `game-art`,
  `game-audio`, `multiplayer`, `3d-games`, `pc-games`, `vr-ar`) accurately
  matches this backend ingestion/persistence/transactionality/security/API
  task. Per the task prompt, no irrelevant sub-skill is selected. The
  repository backend documents + Signal Arena overlay govern instead.
- HTTP endpoints do not make this a web-game implementation task.

### 0.5 Acceptance criteria (restated from task prompt)

D1. **Historical import boundary** — versioned import using existing
domain/contract model; parse/normalize/validate/persist/report separated;
malformed/inconsistent packages rejected with actionable paths+reasons; no
partial writes; no trusting client publication state; immutable source
material preserved. No second incompatible scenario-package model.

D2. **Dry-run mode** — real dry-run: parse+validate+readiness evaluation,
intended inserts/updates/skips/conflicts, deterministic report, **zero**
persistent writes, no ID consumption, no review-state mutation, no external
side effects. Tests prove identical DB state before/after incl. failures.

D3. **Atomic real import** — one transaction for all related writes; full
rollback on any required-write failure; never scenario-version without
required snapshot links; never partial evidence/review records; deterministic
summary distinguishing inserted / already-present / conflicting / rejected.
Rollback tested at >1 failure point.

D4. **Idempotency & conflicts** — byte-identical or semantically identical
re-import creates no duplicates; stable idempotency identity; DB-enforced
uniqueness; safe retries; conflicting reuse detected; retry vs conflicting
mutation distinguished; correct under concurrency. No check-then-insert
without DB protection. Concurrency/race tests for supported DBs.

D5. **Immutable source snapshots** — persist source identity, URL/canonical
ref when available, retrieval/capture metadata, normalized content hash,
raw/canonical content per architecture, provenance, licensing/usage when
supplied, creation timestamp, relationship to scenario versions. Never
silently overwritten. Same identity + different content → conflict with
machine-readable reason.

D6. **Scenario-version-to-snapshot linkage** — explicit persisted links,
transactional with import; duplicates prevented; missing required links block
readiness; queryable for audit; no hidden-future leak via player routes.

D7. **Review-state transition policy** — strict server-side policy using ONLY
frozen review states (`draft`, `research`, `point_in_time_validation`,
`review`, `validated`, `published`); explicit allowed transitions; invalid
rejected; skip attempts rejected; terminal states explicit; authorization +
ownership enforced; auditable transition records where schema supports it;
logic in domain layer, not route handlers. Every allowed/disallowed
transition tested. No new shared status values in `packages/contracts`.

D8. **Publication-readiness evaluation** — server-side, derived from
persisted facts, never client-accepted. Structured reason codes incl.
invalid_package, incomplete_validation, missing public pre-t0 data, missing
hidden future data, missing snapshot provenance, missing snapshot link,
hash mismatch, unresolved review requirement, invalid state transition,
conflicting immutable data, unsupported provider data (+ repo-specific).
Import ≠ approval ≠ readiness ≠ publication.

D9. **Harden Binance adapter** — scope: existing Binance adapter only.
Bounded timeout, cancellation, transient-only retries, exponential backoff
with jitter, max retries, explicit rate-limit handling, malformed rejection,
timestamp/interval validation, ordering + duplicate handling, numeric
validation, response-size/record-count bounds, deterministic normalization,
sanitized errors, no secret leakage. Mocked deterministic tests only; no
live dependency; no fabricated market data.

D10. **Administrative audit/read surface** — authenticated admin reads (via
existing API conventions + frozen contracts) for import summaries, readiness
+ reasons, snapshots, linkage, review history, conflicts. Server-side admin
auth; player ownership intact; hidden future never via player routes; no
secrets/stack traces; deterministic ordering; pagination/safe limits.
No incompatible new public contract; document exact gap if frozen contracts
block an endpoint.

D11. **Migrations & schema-intent validation** — SQLite + PostgreSQL
migrations in established style. Clean migration succeeds; repeated
migration succeeds/safely reports applied; manifest updated; deep drift
validation passes; uniqueness + FK constraints match domain intent (prompt
truncated at “match doma…”; implemented as: match domain intent, tested from
empty DB for both dialects, forward-only, transactional where supported).

Cross-cutting: production-shaped (not toy); no filler/duplication/boilerplate
inflation; no premium functionality; no game-loop/scoring/progression/contract
changes; dependency direction `contracts ← content/domain/providers/db/
api-server/game-client`; no frontend/UI imports in backend; no raw provider/
DB models in public responses.

### 0.6 Scope record

- Starting commit: `80498e993ea220e9455bb5708b5188f822986b25`
- Branch: `arena/01a0c6cf-gamid` (session-fixed)
- Task scope: backend vertical slice for historical crypto scenario
  ingestion → review → persistence → publication-readiness (+ Binance
  hardening + admin audit reads + migrations).
- Owned files:
  - `apps/api-server/**`
  - `packages/db/**`
  - `packages/domain/**`
  - `packages/providers/**`
  - backend tests within owned areas
  - `docs/batch-01/backend-historical-pipeline.md` (this file)
- Forbidden files (not modified):
  - `packages/contracts/**` (frozen)
  - `packages/content/**` (read-only reference)
  - `apps/game-client/**`, `packages/ui-game/**`, visual assets
  - root workspace / package-manager config, workflows
  - unrelated docs, `docs/developing_status.md`
- Dependencies: frozen contracts (`scenario.ts`, `provider.ts`, `run.ts`),
  existing content validator semantics, existing `PersistencePort` + adapters,
  existing Fastify auth/admin conventions, existing Binance adapter.
- Required tests: domain unit (import/review/readiness), db unit (dry-run
  zero-write, atomic rollback × N points, idempotency, immutability,
  links, concurrency), provider mocked tests, api-server route tests,
  migration/drift tests, plus existing gates (`typecheck`, `lint`, `test`,
  `validate:migrations`, `validate:contracts`, `validate:content`,
  e2e ingestion compatibility).
- External sources: none (no live Binance; no new assets; no AI data).
- Quality gates: `pnpm typecheck`, `pnpm lint`, `pnpm test`,
  `pnpm validate:migrations`, `pnpm validate:contracts`,
  `pnpm validate:content`, e2e ingestion subset where runnable; new tests
  must pass; no contract changes; no drift.

### 0.7 Canonical conflicts

None found between the read documents on architecture, ownership, schema, or
security behaviour. `docs/developing_status.md` was intentionally NOT used as
a design source (forbidden to modify; status snapshot, not spec). Proceeding.

---

## 1. Design

> Recorded as the slice landed. All paths below are relative to the repo
> root. Frozen contracts (`packages/contracts/**`) were not modified.

### 1.1 Import envelope

- Versioned boundary: `packages/domain/src/historical-import.ts`,
  `HISTORICAL_IMPORT_FORMAT_VERSION = "1.0"`, strict
  `HistoricalImportEnvelopeSchema`. Uses the frozen contract model only
  (`ScenarioPackage`, `HistoricalMarketSnapshot`) — no second package
  model.
- Stages are separated and independently tested: `parseHistoricalImportInput`
  (object/JSON-string/Buffer → untrusted envelope; throws
  `HistoricalImportParseError` with actionable issues) →
  `normalizeHistoricalImportEnvelope` (deterministic ordering, reviewStatus
  forced to `draft`, requested statuses preserved per
  `scenarioId@version`, `importHash`) → `validateHistoricalImportEnvelope`
  (semantic issues; never throws).
- Defensive bounds: `HISTORICAL_IMPORT_LIMITS` (20 scenarios / 100
  snapshots / 500 links / 100 licensing / 100 capture entries).
- Envelope extras: `links[]` (`scenarioId`, `scenarioVersion`, `sourceId`,
  `snapshotContentHash`, `linkRole ∈ {source, public, future}`),
  `licensing[]`, `capture[]`, optional `importMetadata` (excluded from the
  import hash).
- Validation highlights: duplicate/conflicting identities (including
  same-hash-different-content inside one envelope), dangling
  link/licensing/capture references, per-scenario link coverage,
  snapshot content-hash verification, candle order/OHLC/range/asOf
  checks, scenario point-in-time rules (source groups, pre-t0
  availability, future range, `futureHash` match).
- Snapshot identity is `provenance.contentHash`
  (`sha256:<hex(sha256(JSON.stringify(candles)))>`), computed over
  normalized candles in stored order — the same convention the Binance
  adapter uses (see §1.5). `importHash` covers draft-forced scenarios +
  snapshots + links + licensing + capture.

### 1.2 Idempotency identity

- Whole-envelope idempotency: `historical_imports.import_hash UNIQUE`.
  `importId = imp-<hash-hex>`, `snapshotId = snap-<hash-hex>` —
  deterministic, so dry-run and retries consume no IDs.
- Insert-first writes everywhere (`ON CONFLICT DO NOTHING` /
  `INSERT OR IGNORE`); classification happens on the follow-up read
  (inserted / already_present / conflicting). No check-then-insert.
- Stored rows are authoritative: for snapshots the stored `snapshot_id`
  (not the deterministic candidate) feeds link FKs, so legacy rows with
  the same hash converge correctly. Stored scenario/snapshot bytes are
  never overwritten — not even by editors, not even by re-imports.
- Outcomes per item: `inserted | already_present | conflicting |
  rejected`, with machine-readable reason codes
  (`conflicting_immutable_data`, `rejected_due_to_conflict`,
  `licensing_preserved`, `metadata_completed`, `invalid_envelope`).
- Real import runs stages (scenarios → snapshots → links → metadata →
  readiness → summary) inside ONE `PersistencePort.atomic()` unit; any
  conflicting item flips the summary status to `conflict` (partial
  persistence of non-conflicting items is intentional and fully
  reported). Invalid/unparseable input never persists — the rejected
  summary is ephemeral but deterministic.
- Concurrency: identical concurrent imports converge on one stored
  summary (`duplicate: true` for losers, via the UNIQUE row +
  re-read); conflicting concurrent imports serialize to one
  `completed` + one `conflict`. Postgres serializes via the existing
  advisory-lock `atomic()`; SQLite via the serialized adapter queue.
- Metadata is immutable first-wins with monotonic NULL gap-fill
  (`COALESCE` on conflict): later imports can complete missing
  licensing/capture fields but never overwrite present values.

### 1.3 Review policy

- `packages/domain/src/review-policy.ts` owns the matrix over the FROZEN
  states only: `draft → research → point_in_time_validation → review →
  validated → published`, with immediate-predecessor rework edges plus
  `validated → review`. `published` is terminal and immutable. Skips in
  either direction are rejected; same-state calls are idempotent noops.
- Policy evaluation is pure (`evaluateReviewTransition`) with
  machine-readable codes (`unknown_status`, `forbidden`,
  `terminal_state`, `invalid_transition`); `assertReviewTransition`
  throws `ReviewPolicyError`.
- Enforcement point: `transitionScenarioReviewStatus` in
  `packages/db/src/historical-import-service.ts` — authz first, then
  check-act (read column → policy → readiness gate for `published` →
  write + audit) entirely inside `atomic()`, so concurrent transitions
  serialize to a single audit row plus idempotent noops.
- The pre-existing `POST /api/v1/admin/scenarios/:scenarioId/review`
  bypass (direct status write, no audit) was rewired onto this service
  (`apps/api-server/src/server.ts` → `handleReviewTransition`). The
  e2e-pinned flows (`review → validated → review`, 422/404 codes) are
  policy-compatible and still pass unmodified.

### 1.4 Readiness

- `packages/domain/src/readiness.ts`: `evaluateScenarioReadiness` derives
  publication readiness from PERSISTED facts only (stored package
  re-validated fail-closed, authoritative review-status column,
  persisted links, stored snapshots re-verified by content hash).
- Reason codes: `invalid_package`, `incomplete_validation`,
  `missing_public_pre_t0_data`, `missing_hidden_future_data`,
  `missing_snapshot_provenance`, `missing_snapshot_link`,
  `hash_mismatch`, `unresolved_review_requirement`,
  `invalid_state_transition`, `conflicting_immutable_data`,
  `unsupported_provider_data`. Reasons are sorted; evaluation is pure
  and deterministic.
- Import, approval, readiness, and publication are distinct: import
  lands `draft`; review walks the matrix; `validated → published` is
  blocked unless `ready` (service throws `publication_not_ready` with
  the structured reasons; the route maps it to 422).
- Dry-run reports hypothetical post-import readiness (persisted links +
  would-persist links); real-import summaries embed post-write
  readiness evaluated inside the same transaction.

### 1.5 Provider hardening

- `packages/providers/src/binance.ts` already had: HTTPS host allowlist,
  per-attempt timeout + abort, bounded streaming reads, request
  validation (symbol/interval/asOf/limit ≤ 1000), content-type check,
  candle normalization with strict ordering, OHLC decimals, no-future
  leak (`closeTime ≤ asOf`), non-empty candles, provenance with the §1.1
  content-hash convention, and a final contract-schema parse.
- Added this batch: bounded retries with exponential backoff
  (`maxAttempts` default 3, `retryBaseMs`/`retryMaxMs`); 429 handling
  with `Retry-After` honor (seconds or HTTP-date, capped) and a
  distinct `provider_rate_limited` code on exhaustion; 5xx + timeout +
  transport retries (idempotent GET); NO retries for deterministic
  failures (other 4xx, invalid/oversized bodies); external
  `AbortSignal` cancellation (queued, in-flight, and mid-backoff) with
  a distinct `provider_cancelled` code; opt-in client-side request
  spacing (`minIntervalMs`, FIFO mutex); row-count bound (provider must
  not return more rows than requested); fully sanitized errors (fixed
  messages per code — no URLs, bodies, or transport internals leak).
- `now`/`sleep`/`fetchImplementation` are injectable; all tests are
  mocked (no live Binance, no fabricated market data — synthetic
  klines only).

### 1.6 Admin surface

- New module `apps/api-server/src/historical-admin.ts`, registered from
  `server.ts`. Routes (all under `/api/v1/admin/historical/`, all
  editor-only):
  - `POST imports/dry-run` → 200 + `DryRunReport` (8MB body limit).
  - `POST imports` → 201 created / 200 duplicate / 422 ephemeral
    rejected summary with actionable issues (8MB body limit).
  - `GET imports?limit&offset` → paged `{ data, page }` with per-import
    counts (fail-closed `summaryCorrupt` flag, never a 500).
  - `GET imports/:importId` → full stored summary; 404 `import_not_found`.
  - `GET snapshots?limit&offset` → metadata-only page (no candles).
  - `GET snapshots/:snapshotId` → full snapshot + licensing/capture +
    referencing links; 404 `snapshot_not_found`.
  - `GET scenarios/:id/versions/:v/readiness` → readiness report.
  - `GET scenarios/:id/versions/:v/links` → persisted links.
  - `GET scenarios/:id/versions/:v/transitions` → audit trail.
- Authorization in three layers: central `preHandler` (401/403),
  per-route editor check from trusted server config, service-level
  `assertEditor` before any work (existence never leaks to
  non-editors).
- Schemas are route-local Zod (`historical-admin.ts`), reusing the
  service report schemas as subschemas; every response is validated
  before send. Pagination: `limit` 1–200 (default 50), `offset ≥ 0`,
  deterministic store orderings. Error mapping is codes-only
  (`toHttpError`): no secrets, no traces, no raw provider/DB detail.
- Leak discipline: no route returns full scenario packages (the carrier
  of hidden future data); verified by `leakScan` assertions in route
  tests.

### 1.7 Migrations

- `0006_historical_pipeline` (SQLite canonical
  `packages/db/src/migrations.ts` + Postgres rendering
  `postgres-migrations.ts`, forward-only, transactional, idempotent):
  - `historical_imports` (`import_id` PK, `import_hash` UNIQUE,
    status CHECK, `summary_json`, `created_by`, `created_at`) +
    `(created_at, import_id)` index.
  - `historical_snapshot_metadata` (`snapshot_id` PK → snapshots,
    `licensing_json`, `capture_json`, `created_at`).
  - `scenario_snapshot_links` (composite PK
    `(scenario_id, scenario_version, snapshot_id, source_id)`, FKs to
    snapshots + scenarios, `link_role` CHECK, snapshot + scenario
    indexes).
  - `scenario_review_transitions` (`transition_id` PK, scenario FK,
    `actor_user_id` → users, scenario + actor indexes).
- Drizzle `schema.ts`, `schema-manifest.ts`, and the drift checker
  updated in lockstep; `validate:migrations` passes (parity + order +
  forward-only). Count-asserting tests updated 5 → 6 migrations with
  the exact table list.

### 1.8 Contract gaps

- None. No frozen contract changed (`validate:contracts` passes).
- New admin/import shapes are local Zod schemas in domain (envelope,
  policy, readiness), db service (reports/summaries), and api-server
  (wire envelopes) — layered so the service schemas are the single
  source of truth reused by routes.
- Adjacent known gap (NOT introduced here, intentionally untouched):
  legacy `POST /api/v1/admin/scenarios` preserves a client-supplied
  `reviewStatus` on direct content upsert. That behavior is pinned by
  `tests/e2e/ingestion.test.ts` (outside backend ownership) and serves
  hand-authored content, not the historical pipeline (which forces
  `draft`). Recommended follow-up: migrate the legacy route onto the
  transition service once e2e ownership allows.

---

## 2. Completion report

Role: Backend Agent
Starting commit: `80498e993ea220e9455bb5708b5188f822986b25`
Final commit: implementation `2808b1364c08d674b1012e7256d493d47a977ee2`; report finalized at
the tip of `arena/01a0c6cf-gamid` (verify: `git rev-parse HEAD`).
Branch/PR: `arena/01a0c6cf-gamid` (session-fixed; requested branch name
`arena/batch-01-backend-historical-pipeline` could not be honoured — see
§0.2). No PR opened, nothing merged.

Scope completed:
- D1 historical import boundary: versioned envelope, separated
  parse/normalize/validate/persist/report, actionable issues, atomic
  real import, forced draft, immutable snapshots + metadata + links.
- D2 dry-run: full prediction incl. hypothetical readiness, zero
  writes (no transaction, no IDs), deterministic reports.
- D3 idempotency + concurrency: UNIQUE import hash, insert-first
  writes, stored-row authority, duplicate convergence, conflict
  isolation — SQLite + Postgres.
- D4 review policy: frozen-state matrix, terminal published, noops,
  authz-first service, audit trail; legacy review bypass rewired.
- D5 readiness: persisted-facts-only evaluation, structured reason
  codes, publication gate on `validated → published`.
- D6 Binance hardening: retry/backoff, 429 + Retry-After, rate-limit
  code, cancellation, request spacing, bounds, sanitized errors;
  mocked tests only.
- D7 admin surface: dry-run/import/audit/read routes, editor-only,
  pagination, codes-only errors, no hidden-future-data leaks.
- D8 migrations: 0006 both dialects, manifest + drift parity,
  forward-only/transactional/idempotent, count tests updated.

Documents and skills used:
- `AGENTS.md` (contract, ownership, invariants, §14 report format)
- `docs/README.md`, `.claude/skills/signal-arena/SKILL.md` (overlay)
- `docs/system_architecture.md`, `docs/security_architecture.md`,
  `docs/acceptance_matrix.md` (backend-relevant sections)
- Frozen `packages/contracts/src/{scenario,provider,run}.ts` (read-only)
- `packages/content/src/validate.ts` + fixtures (read-only reference)
- `packages/db` persistence boundary + migration toolchain (read, extended)
- `packages/providers/src/binance.ts`, `apps/api-server/src/{server,main}.ts`
  (read, extended), `tests/e2e/ingestion.test.ts` (must-keep-green)
- Skill routing: no archive game sub-skill matches this backend task
  (recorded per task override in §0.4).

Changed files:
- NEW `packages/domain/src/historical-import.ts` (+ test): envelope
  boundary (parse/normalize/validate, limits, hashes, issues).
- NEW `packages/domain/src/review-policy.ts` (+ test): frozen matrix.
- NEW `packages/domain/src/readiness.ts` (+ test): readiness evaluation.
- NEW `packages/db/src/historical-import-store.ts`: SQLite store for
  imports/snapshots/metadata/links/transitions (+ gap-fill upsert).
- NEW `packages/db/src/historical-import-service.ts` (+ dual-driver
  test): dry-run / atomic import / transitions / readiness assembly,
  zod report schemas.
- `packages/db/src/{ports,sqlite-adapter,postgres-adapter,index}.ts`:
  20+1 Batch-01 port methods, both adapters.
- `packages/db/src/{migrations,postgres-migrations,schema,
  schema-manifest}.ts`: 0006 tables both dialects + manifest.
- `packages/db/src/{database,migration-registry,postgres-migrations}
  .test.ts`: counts 5 → 6 + new-table assertions.
- `packages/db/package.json` (+ lockfile): `zod` dependency.
- `packages/providers/src/binance.ts` (+ tests): retry/backoff/429/
  cancel/spacing/sanitized-errors hardening; 10 mocked tests.
- NEW `apps/api-server/src/historical-admin.ts` (+ 5 route tests):
  schemas, error mapping, 9 routes.
- `apps/api-server/src/server.ts`: historical route registration +
  strict review-route rewire.
- `apps/api-server/package.json`, `packages/domain/package.json`
  (+ lockfile): `zod` dependency.
- This file: `docs/batch-01/backend-historical-pipeline.md`.

Contracts changed:
- none. `packages/contracts/**` untouched; `validate:contracts` passes.

Migrations/data changes:
- `0006_historical_pipeline` (SQLite + Postgres): `historical_imports`,
  `historical_snapshot_metadata`, `scenario_snapshot_links`,
  `scenario_review_transitions` with PK/UNIQUE/FK/CHECK constraints and
  indexes. Forward-only, transactional, idempotent; manifest + drift
  parity verified by `validate:migrations` and migration tests run from
  empty.

Assets/sources and provenance:
- none. No live Binance calls, no market data vendored, no AI data, no
  assets. All fixtures are synthetic (clearly-labeled test klines and
  scenario copies).

Commands executed:
- `pnpm typecheck` — PASS (clean).
- `pnpm lint` — PASS (clean).
- `pnpm test` — PASS: 180 tests, 177 pass, 0 fail, 3 skipped
  (Postgres-driver subtests; no server in sandbox).
- `node --import tsx --test
  apps/api-server/src/historical-admin.test.ts` — PASS: 5/5 route
  tests (authz, lifecycle, audit reads, strict review, publish gate).
- `node --import tsx --test tests/e2e/{api,auth,catalog,economy,
  ingestion,referrals,security,store}.test.ts` — PASS: 26/26
  (browser-smoke excluded: needs game-client build, outside ownership).
- `pnpm validate:migrations` — PASS (6 IDs, drift parity).
- `pnpm validate:contracts` — PASS (projection excludes hidden data).
- `pnpm validate:content` — PASS (registry intact).
- `pnpm install` (zod for db/api-server/domain) — PASS.

Automated QA:
- Same as above. New coverage: 17 domain/service subtests × SQLite
  (+ Postgres when `POSTGRES_TEST_URL` is set), 10 provider tests,
  5 route tests, updated migration count tests. Rollback verified at
  all 5 import stages; concurrency verified (identical + conflicting);
  dry-run zero-write verified incl. no-`atomic()` spy.

Manual/visual/responsive/accessibility QA:
- none — backend-only change, no UI surface touched.

Inherited defects:
- Legacy `POST /api/v1/admin/scenarios/:scenarioId/review` performed a
  direct status write (policy skip, no readiness gate, no audit).
  FIXED by rewiring onto the transition service; e2e still green.
- Legacy `POST /api/v1/admin/scenarios` preserves client-supplied
  reviewStatus (pre-existing, e2e-pinned, outside ownership to change).
  Left untouched; recorded as follow-up (see §1.8).

Introduced defects or regressions:
- none known. Unit + route + e2e suites fully green; no contract,
  content, game-loop, scoring, or progression changes.

Known limitations and required follow-up:
- Postgres integration paths are typechecked + migration-tested, but
  live PG-driver tests did not run here (no server in sandbox).
  They run wherever `POSTGRES_TEST_URL` is set; CI should confirm.
- Audit-trail ties on identical `created_at` order by `transition_id`
  (deterministic, not chronological). Production clocks make ties
  unlikely; add a `seq` column in a future migration if ms-collision
  ordering must be chronological.
- Import routes cap bodies at 8MB; envelopes beyond
  `HISTORICAL_IMPORT_LIMITS` are rejected by validation (422 + issues).
- The hardened Binance adapter is not yet called by any route; a
  future batch can add an operator-triggered fetch → import flow.
- Legacy direct-ingest route should migrate onto the transition
  service once e2e ownership allows (see §1.8).
