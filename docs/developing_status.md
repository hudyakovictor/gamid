# Signal Arena Development Status

Status: FOUNDATION_CORRECTIVE_IN_REVIEW
Scope: corrective repair pass for PR #3 (foundation consolidation for parallel development)
Owner: Foundation Agent
Last reviewed: 2026-09-22
Supersedes: previous foundation status recorded on PR #3 head `623eef1`
Required evidence: executed gates recorded below; GitHub CI green on the final corrective head
Canonical dependencies: `AGENTS.md`, `README.md`, `system_architecture.md`, `security_architecture.md`, `acceptance_matrix.md`, `economy_monetization_referrals.md`, `../packages/contracts/src/scenario.ts`, `../packages/content/src/validate.ts`

## Current disposition

Parallel-development readiness and production-release readiness are tracked separately:

- **Parallel-development readiness:** the foundation is green for Backend, Frontend, and Content/Data parallel work once all mandatory gates pass on the final corrective head AND GitHub CI is green on that head (CI provides the PostgreSQL service and the real-browser smoke). Until GitHub CI has run green on the final corrective head, the status is **FOUNDATION_CORRECTIVE_IN_REVIEW**, not FOUNDATION_READY.
- **Production-release readiness:** **BLOCKED** — see the blockers table (PAYMENT-VERIFY, shared rate limiting, observability, deployment, human QA). These are not fixed and are not labelled as such.

This corrective pass is on `arena/01a0c66f-gamid`, based on PR #3 head `623eef13c7e2d957340ded2d0d7e5172f731cb07`, and targets the PR #3 branch `arena/01a0c652-gamid`.

The authoritative future baseline for parallel agents is the **final merged PR #3 head/merge commit** recorded after acceptance — not an older intermediate SHA (`b4f2572…` is no longer authoritative). The exact final corrective SHA is reported in the corrective PR description and completion report.

### Foundation corrections implemented

#### 1. Reveal endpoint: GET → POST

- Old mutating endpoint `GET /api/v1/scenario-runs/:runId/reveal` removed (was violating invariant that mutating operations must not use GET, and was granting rewards on GET).
- New endpoint: `POST /api/v1/scenario-runs/:runId/reveal`
  - Requires authentication (fixture or Telegram session)
  - Requires CSRF (`x-sa-csrf` matching `sa_csrf` cookie in Telegram auth mode; fixture mode is dev-only bypass)
  - Enforces seal-before-reveal (409 if state is `started`)
  - Idempotent: repeated POST returns same revealed state, does not duplicate XP, Coins, Mastery Stars, referral rewards, or ledger events (idempotency keys `economy:xp:${runId}`, `economy:mastery:${runId}`, etc.)
  - Preserves server-only future-data isolation before authorized reveal (public projection schema strict)
  - Cross-user: run lookup is scoped to authenticated user, returns 404 if not owned
  - Unauthenticated: 401
  - CSRF-invalid: 403
  - GET `/reveal` now returns 404 (not operational)
- Typed client adapter updated: `ApiClient.revealRun()` uses POST; `getReveal()` deprecated alias now also POST.
- Tests updated: `tests/e2e/api.test.ts`, `tests/e2e/auth.test.ts`, `apps/game-client/src/api/client.test.ts`, `apps/game-client/src/App.test.ts`
- Documentation updated: `docs/foundation.md`, `AGENTS.md` invariant preserved

#### 2. Canonical frontend path

- Moved `apps/client-prototype/**` → `apps/game-client/**` via `git mv` preserving history.
- Renamed workspace package to `@signal-arena/game-client`
- Updated root scripts: `client:typecheck`, `client:lint`, `client:test`, `client:build` now filter `@signal-arena/game-client`
- NOTE: `.github/workflows/ci.yml` step **labels** still read “Client prototype …”. The workflow file cannot be modified in this environment (missing `workflows` permission — verified by probe), so this is a cosmetic follow-up, not a completed change. The `client:*` steps run against `@signal-arena/game-client` regardless of the label text.
- Updated `tsconfig.json` exclude, `scripts/validate-public-client.ts` sourceRoot, `docs/directory_map.md`
- Removed obsolete `apps/client-prototype` references; final repo has exactly one canonical client path matching `AGENTS.md` ownership `apps/game-client/**`
- No UI redesign; all behavior preserved

#### 3. Featured-card action fix + duplicate keyboard activation fix

- Issue: Hub featured card visually contained “Открыть брифинг” action but click did nothing; separate lower “Открыть сценарий” button worked.
- Original fix in `packages/ui-game/src/components.tsx` wired `WidgetCard.onAction` to the button and added a parent `<article>` `onKeyDown` handler with `tabIndex={0}`.
- Corrective fix (this pass): that arrangement caused **duplicate keyboard activation** — key events from the native button bubbled to the article's handler and fired `onAction` twice — plus a second focus target. `WidgetCard` now keeps the native `<button>` as the single interactive/focusable control and removes the parent `tabIndex`/`onKeyDown`. The `<article>` is a passive card, so non-action widgets are no longer misleading controls. Visual appearance and the shared typed `onAction` adapter are preserved; navigation/API logic is not duplicated.
- Regression tests:
  - `apps/game-client/src/App.test.ts` — featured CTA opens the scenario brief.
  - `apps/game-client/src/components/WidgetCard.test.ts` — exact call count of **one** for mouse click, Enter and Space; single focusable control; removed parent key handling no longer double-fires.
  - `tests/e2e/browser-smoke.test.ts` — keyboard activation (Enter) against real browser semantics.

#### 4. Canonical migration source

- Audited:
  - `infra/migrations/**` — legacy, contained only `0001_foundation.sql`, identical to first SQLite migration, not referenced by code, now removed.
  - `packages/db/src/migrations.ts` — SQLite migrations, 5 entries, transactional, idempotent
  - `packages/db/src/postgres-migrations.ts` — PostgreSQL dialect, 5 entries, locked with `pg_advisory_xact_lock`, transactional, idempotent
  - `scripts/migrate-db.ts` — SQLite migrate script
  - `scripts/migrate-postgres.ts` — Postgres migrate script
- Selected canonical source:
  - **Canonical**: `packages/db/src/migrations.ts` (source of truth for schema intent and ordering)
  - **Dialect rendering**: `packages/db/src/postgres-migrations.ts` (explicit dialect rendering)
  - **Canonical schema-intent manifest**: `packages/db/src/schema-manifest.ts` (deterministic, reviewable table-level intent both dialects must satisfy)
  - **Registry and drift protection**: `packages/db/src/migration-registry.ts` — bounded extractor (not a general SQL parser) that verifies tables, columns, primary keys, unique constraints, foreign-key relationships and named indexes for both dialects against the manifest
  - **Validation script**: `scripts/validate-migrations.ts` — exports `validateMigrations()` (single source of truth): same count, identical ordered ids, forward-only naming, no duplicate ids, deep drift check, and hard FAILURE if legacy `infra/migrations/**` returns with files
  - **Tests**: `packages/db/src/migration-registry.test.ts` (drift passes + NEGATIVE tests for missing column / unique / foreign key / index / primary key, id/order divergence, count mismatch), `packages/db/src/migration-validation.test.ts` (mirrors the validator inside `pnpm test`; legacy files fail), plus existing `database.test.ts` and `postgres-migrations.test.ts`
- Legacy `infra/migrations/**` removed; final repo has one canonical registry with explicit dialect rendering, a schema manifest, and automated deep drift checks.
- Migrations remain forward-only, deterministic, ordered (`0001_...` to `0005_...`), transactional where supported (SQLite transaction per migration, Postgres BEGIN/COMMIT with advisory lock), idempotent where expected. Migration ids, order, and production schema are unchanged by this corrective pass.
- No destructive migration added; existing stored data and current schema behavior preserved.
- CI: `POSTGRES_TEST_URL` is provided via service `postgres:16-alpine` in the existing `.github/workflows/ci.yml`; `pnpm test` with that URL runs the real Postgres lifecycle (`postgres-adapter.test.ts`), plus recording-executor tests always run. Locally without the URL, the real PG lifecycle is reported UNVERIFIED (it skips only when the URL is absent).

#### 5. Frozen contract boundary and canonical fixture

- `packages/contracts/**` frozen, no changes in this commit
- Canonical integration fixture selected: `packages/content/src/fixtures/starter-scenario.ts`
  - Reuses current validated starter fixture, no duplicate content
  - Scenario ID `foundation-false-breakout-001`, version `1.0.0`, level 3, mode `academy`
  - Verified flow:
    - content validation → `pnpm validate:content` PASS (3 fixtures)
    - clean migration → `database.test.ts`, `migration-registry.test.ts`, `postgres-migrations.test.ts` PASS
    - import/seed → `seedFoundation` uses starter fixture
    - public API projection → `api.test.ts` checks no hidden future, `ScenarioPublicProjectionSchema` strict
    - client rendering → `App.test.ts` catalog → brief → start → workspace, plus featured-card regression
    - run start → POST `/api/v1/scenario-runs` with idempotency key, retry returns same runId
    - immutable seal → POST `/seal` with decision trace, duplicate same decision returns same, different decision fails 409, score not exposed in seal response
    - process scoring → server `evaluateFoundationDecision` returns 87, breakdown validated
    - reveal → POST `/reveal` returns hiddenEntities `["fake_breakout_phantom"]`, historicalFutureSegment, score 87, idempotent rewards
    - persisted readback → GET `/api/v1/users/:userId/scenario-runs` returns user-scoped summaries, no decision/breakdown leakage
- Documented in `docs/foundation.md` with exact path, purpose, and flow mapping

#### 6. CI enforcement of mandatory gates (fallback path)

The CI workflow file `.github/workflows/ci.yml` cannot be modified in this environment: pushing any change under `.github/workflows/` is rejected with `refusing to allow a GitHub App to create or update workflow without workflows permission` (verified by probe on the corrective branch). This document does **not** claim the workflow was updated. The missing mandatory gates are enforced through commands the existing, unchanged `ci.yml` already runs, and every direct command remains available (single source of truth, non-zero exit on failure, no output suppression, no recursive pnpm scripts):

| Mandatory command | Existing CI step that enforces it | Nested command |
| --- | --- | --- |
| `pnpm validate:migrations` | `Unit tests` → `pnpm test` | `packages/db/src/migration-validation.test.ts` calls the same `validateMigrations()` as the script |
| `pnpm design-system:typecheck` | `Build` → `pnpm build` | `pnpm build` runs `pnpm design-system:typecheck` |
| `pnpm design-system:build` | `Build` → `pnpm build` | `pnpm build` runs `pnpm design-system:build` |
| real-browser smoke | `API tests` → `pnpm test:e2e` | `pnpm test:e2e` runs `pnpm test:e2e:browser` |

Follow-up (not a completed claim): once GitHub is reconnected with `workflows` permission, add these four as explicit named steps and rename the “Client prototype …” step labels to “Client …”.

#### 7. Real-browser lifecycle smoke test

`tests/e2e/browser-smoke.test.ts` drives headless system Chrome/Chromium via `puppeteer-core` (no per-run browser download; uses Chrome preinstalled on GitHub Ubuntu runners). Explicit deterministic browser resolution (`CHROME_PATH`/`CHROMIUM_PATH` → Google Chrome → Chromium → BLOCKED). Isolated API subprocess + isolated temp SQLite DB; static server serves the built client and proxies `/api`; processes and temp files cleaned up even on failure; bounded timeouts; deterministic readiness checks. Covers the full lifecycle and asserts: reveal uses POST (never GET), hidden future/outcome data absent before reveal, Process Score only after reveal, persisted readback, and no page/console/critical-network errors. “Browser unavailable” is never a PASS in CI.

#### 8. Preserved security/API work + client reveal fix

POST reveal, auth, user-ownership scoping, CSRF, seal-before-reveal, future-data isolation, server-authoritative scoring, idempotent rewards, atomic persistence, contracts, canonical English Entity names, scenario level invariants, canonical client path `apps/game-client`, package `@signal-arena/game-client`, and the canonical integration fixture are all preserved. A latent client bug was fixed so POST reveal actually works in a real browser: `ApiClient` no longer sends `content-type: application/json` on body-less POSTs (reveal, logout), which Fastify rejected with `FST_ERR_CTP_EMPTY_JSON_BODY` (400). No routes, methods, or contracts changed.

## Verification record — 2026-09-22 (corrective, local)

Base: PR #3 head `623eef13c7e2d957340ded2d0d7e5172f731cb07` plus corrective patches
Environment: Linux sandbox, Node 22.22.3, pnpm 11.9.0, SQLite (better-sqlite3 built from source with local Node headers), happy-dom for client tests. No local Chrome/Chromium and no local PostgreSQL.
Disposition: parallel-development **CORRECTIVE_IN_REVIEW** pending GitHub CI green on the final corrective head; production **BLOCKED** (see blockers).

| Gate | Result (local) | Notes |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | PASS | `npm_config_nodedir=/usr/local` to build better-sqlite3; `PUPPETEER_SKIP_DOWNLOAD=true` |
| `pnpm typecheck` | PASS | No contract changes |
| `pnpm lint` | PASS | |
| `pnpm test` | PASS | 90 pass / 2 skipped; now includes migration negative tests + `migration-validation.test.ts` |
| `pnpm test:e2e` (API portion) | PASS | 26 API e2e tests pass |
| real-browser smoke | UNVERIFIED (local) / must run in CI | No local Chrome; resolver correctly reports BLOCKED (never a false PASS). Full lifecycle validated locally through the real `ApiClient` against the harness (POST reveal → score 87 + hidden entity; persisted readback). |
| `pnpm validate:contracts` | PASS | |
| `pnpm validate:content` | PASS | 3 fixtures including canonical starter |
| `pnpm validate:locales` | PASS | |
| `pnpm validate:assets` | PASS | 87 draft assets |
| `pnpm validate:public-client` | PASS | |
| `pnpm validate:migrations` | PASS | Deep drift check against schema manifest; legacy `infra/migrations/**` files fail (verified) |
| `pnpm client:typecheck` | PASS | |
| `pnpm client:lint` | PASS | |
| `pnpm client:test` | PASS | 34 tests (incl. WidgetCard exact-once + reveal content-type regression) |
| `pnpm client:build` | PASS | Vite build |
| `pnpm design-system:typecheck` | PASS | |
| `pnpm design-system:build` | PASS | |
| `pnpm build` | PASS | Also runs design-system typecheck + build |
| `pnpm audit --prod --audit-level high` | PASS | No known vulnerabilities |

PostgreSQL: **UNVERIFIED locally** (no local PostgreSQL and no `POSTGRES_TEST_URL`). GitHub CI provides `postgres:16-alpine` and `POSTGRES_TEST_URL`, so the real Postgres lifecycle runs there and must not silently skip. Do not read this as a PostgreSQL PASS until CI has run it.

## Open blockers and limitations

Inherited (present in the recorded base, not introduced by this corrective pass):

| Blocker | Status |
| --- | --- |
| PAYMENT-VERIFY | **BLOCKED for production.** No trusted Telegram payment/refund verification; Coin Pack purchases fail closed (403 `verified_payment_required`). Not claimed as fixed. |
| REFUND-POLICY | Immediate Energy effects rejected rather than reversed; selective refunds require provenance. |
| TRANSACTION-OPERATIONS | Local tests PASS, but production load, multi-process contention, backup/restore, staging rehearsal remain unverified. |
| HUMAN-QA | Visual, responsive, keyboard/screen-reader QA not performed beyond automated component + real-browser keyboard tests. |
| PRODUCTION | Shared rate limiting, deployment/payment smoke, observability, asset release approval remain open. |

This corrective pass does not repair pre-existing partial/fraudulent economic records; deployment against non-fixture data requires an audit/reconciliation plan.

## Scope and governance

Documents/skills used: `AGENTS.md`, `docs/README.md`, archive `web-games`, Signal Arena skill overlay, `system_architecture.md`, `security_architecture.md`, `acceptance_matrix.md`, economy/referral specs.

No product redesign, scoring change, economy value change, Premium behavior, new catalog content, contract change, or visual assets introduced.

## Readiness

- **Parallel-development readiness:** NOT_READY until GitHub CI is green on the final corrective head (all mandatory gates including the real-browser smoke and PostgreSQL run there). Local gates are green.
- **Production readiness:** BLOCKED — PAYMENT-VERIFY, shared rate limiting, observability, deployment, human QA (see blockers).
- Authoritative future baseline: the final merged PR #3 head/merge commit recorded after acceptance. The exact final corrective SHA is reported in the corrective PR description and completion report (not hard-coded here, to avoid a self-referential stale SHA).
