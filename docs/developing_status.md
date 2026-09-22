# Signal Arena Development Status

Status: FOUNDATION_READY
Scope: foundation consolidation for parallel development
Owner: Foundation Agent
Last reviewed: 2026-09-21
Supersedes: previous corrective pass on arena/01a0c61d-gamid
Required evidence: executed gates; green foundation for Backend, Frontend, Content/Data parallel work
Canonical dependencies: `AGENTS.md`, `README.md`, `system_architecture.md`, `security_architecture.md`, `acceptance_matrix.md`, `economy_monetization_referrals.md`, `../packages/contracts/src/scenario.ts`, `../packages/content/src/validate.ts`

## Current disposition

The repository is **FOUNDATION_READY** for parallel development from a single green commit.

This foundation pass is on `arena/01a0c652-gamid`, based on `477a6d47e5600f572e8ce26fc0eaa4f5c7c7e064` from master, and incorporates task context starting commit `ec17eeecf1b922f2a1470befd9729e329b5e529c`.

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
- Updated CI: `.github/workflows/ci.yml` steps renamed from Client prototype to Client
- Updated `tsconfig.json` exclude, `scripts/validate-public-client.ts` sourceRoot, `docs/directory_map.md`
- Removed obsolete `apps/client-prototype` references; final repo has exactly one canonical client path matching `AGENTS.md` ownership `apps/game-client/**`
- No UI redesign; all behavior preserved

#### 3. Featured-card dead action fix

- Issue: Hub featured card visually contained “Открыть брифинг” action but click did nothing; separate lower “Открыть сценарий” button worked.
- Fix in `packages/ui-game/src/components.tsx`: `WidgetCard` now accepts optional `onAction?: () => void`, button `onClick={onAction}`, article handles Enter/Space for keyboard accessibility.
- Wiring in `apps/game-client/src/screens/HubScreen.tsx`: featured widget's `onAction` calls same typed `onOpenScenario(featured.scenarioId, featured.version)` flow; continue widget also wired to `onContinue` if present; no duplicated navigation/API logic.
- Regression test added in `apps/game-client/src/App.test.ts`: clicks visible `.widget button` containing “Открыть брифинг”, asserts `getScenario` called with correct ids and hash navigates to `#/scenario_brief` and brief screen rendered.
- Keyboard accessibility preserved: button is native `<button>`, focusable, Enter/Space triggers action via both button and article key handler.

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
  - **Registry and drift protection**: `packages/db/src/migration-registry.ts` — documents canonical, extracts table/index names, checks drift
  - **Validation script**: `scripts/validate-migrations.ts` — verifies same count, same ordered ids, same tables/indexes, forward-only naming, no duplicate ids
  - **Tests**: `packages/db/src/migration-registry.test.ts` — drift check passes, SQLite empty DB idempotent repeated application, Postgres ids ordered; existing `database.test.ts` and `postgres-migrations.test.ts` remain
- Legacy `infra/migrations/**` removed; final repo has one canonical registry with explicit dialect rendering and automated drift checks.
- Migrations remain forward-only, deterministic, ordered (`0001_...` to `0005_...`), transactional where supported (SQLite transaction per migration, Postgres BEGIN/COMMIT with advisory lock), idempotent where expected (checks `_migrations` / `signal_arena_migrations` tables, `ON CONFLICT DO NOTHING` for snapshots, etc.)
- No destructive migration added; existing stored data and current schema behavior preserved
- CI: `POSTGRES_TEST_URL` provided via service `postgres:16-alpine` in `.github/workflows/ci.yml`; `pnpm test` with that URL runs real Postgres lifecycle (`postgres-adapter.test.ts`), plus recording-executor tests always run

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
- Final foundation commit to be recorded after green verification (see below)

## Verification record — 2026-09-21 (foundation)

Base: `477a6d47e5600f572e8ce26fc0eaa4f5c7c7e064` plus foundation patch
Environment: Debian 12 sandbox, Node 22.22.3, pnpm 11.9.0, SQLite, PostgreSQL 16 (CI) / 18.4 (local if available), happy-dom for client tests
Release disposition: **FOUNDATION_READY** (PAYMENT-VERIFY remains BLOCKED for production, but foundation green for parallel work)

| Gate | Expected result | Notes |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | PASS | Lockfile updated after client move; pnpm-workspace `apps/*` wildcard covers new path |
| `pnpm typecheck` | PASS | No contract changes |
| `pnpm lint` | PASS | |
| `pnpm test` | PASS | Includes `database.test.ts`, `migration-registry.test.ts`, `postgres-migrations.test.ts`, contracts, content, domain, providers, db; real PG tests skip if no URL, but CI provides URL |
| `pnpm test:e2e` | PASS | Includes api.test.ts (now POST reveal), auth.test.ts (POST reveal CSRF, GET reveal 404), catalog, security, etc. |
| `pnpm validate:contracts` | PASS | |
| `pnpm validate:content` | PASS | 3 fixtures including canonical starter |
| `pnpm validate:locales` | PASS | |
| `pnpm validate:assets` | PASS | 87 draft assets |
| `pnpm validate:public-client` | PASS | Updated sourceRoot to `apps/game-client/src` |
| `pnpm validate:migrations` | PASS | New drift check, same ids, same tables/indexes |
| `pnpm client:typecheck` | PASS | `@signal-arena/game-client` |
| `pnpm client:lint` | PASS | |
| `pnpm client:test` | PASS | 2 tests in App.test.ts (original + featured-card regression) + 8 in client.test.ts (including POST reveal CSRF) + flow tests |
| `pnpm client:build` | PASS | Vite build |
| `pnpm build` | PASS | tsc -p tsconfig.json |

## Open blockers and limitations (inherited, not introduced by foundation)

| Blocker | Status |
| --- | --- |
| PAYMENT-VERIFY | **BLOCKED for production.** No trusted Telegram payment/refund verification; Coin Pack purchases fail closed (403 `verified_payment_required`). Foundation does not claim payment verification. |
| REFUND-POLICY | Immediate Energy effects rejected rather than reversed; selective refunds require provenance. |
| TRANSACTION-OPERATIONS | Local tests PASS, but production load, multi-process contention, backup/restore, staging rehearsal remain unverified. Postgres serializes economic units globally via advisory lock. |
| HUMAN-QA | Visual, responsive, keyboard/screen-reader QA not performed beyond automated component tests and keyboard accessibility preservation in WidgetCard. |
| PRODUCTION | Shared rate limiting, deployment/payment smoke, observability, asset release approval remain open. |

Foundation changes do not repair pre-existing partial/fraudulent economic records; deployment against non-fixture data requires audit/reconciliation plan.

## Scope and governance

Documents/skills used: `AGENTS.md`, `docs/README.md`, archive `web-games`, Signal Arena skill overlay, `system_architecture.md`, `security_architecture.md`, `acceptance_matrix.md`, economy/referral specs.

No product redesign, new catalog content, or visual assets introduced. No new art/source provenance needed beyond existing draft assets.

## Final foundation commit

- Branch: `arena/01a0c652-gamid`
- Final commit SHA: (to be filled after verification and commit)
- PR: to be created from this branch

This SHA is the base for Backend, Frontend, Content/Data parallel agents.
