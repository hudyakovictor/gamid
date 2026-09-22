# Foundation Commit — Parallel Development Baseline

Status: REQUIRED
Owner: Foundation Agent
Last reviewed: 2026-09-22

## Role

Foundation Agent — repository hygiene, CI, workspace boundaries, frozen contracts, migration consolidation, minimal client/API scaffolding for parallel work.

## Starting point

- Corrective pass base commit (PR #3 head): `623eef13c7e2d957340ded2d0d7e5172f731cb07`
- Corrective branch: `arena/01a0c66f-gamid` (targets `arena/01a0c652-gamid`, the PR #3 branch)
- Authoritative future baseline: the **final merged PR #3 head/merge commit** recorded after acceptance — NOT any older intermediate SHA. The exact corrective-branch SHA is reported in the corrective PR description and completion report after committing; it is deliberately not hard-coded inside a tracked commit (a self-referential final SHA would be stale the moment it is committed).

## Canonical paths

### Frontend

- Canonical client path: `apps/game-client/**`
- Workspace package: `@signal-arena/game-client`
- Legacy path `apps/client-prototype/**` has been moved to `apps/game-client/**` with git history preserved via `git mv`.
- No competing client applications remain.

### Migrations

- Canonical migration source: `packages/db/src/migrations.ts` (SQLite, source of truth for schema intent and ordering)
- Dialect rendering: `packages/db/src/postgres-migrations.ts` (PostgreSQL, explicit dialect rendering of same intent)
- Canonical schema-intent manifest: `packages/db/src/schema-manifest.ts` (deterministic, reviewable table-level intent both dialects must satisfy)
- Registry and drift protection: `packages/db/src/migration-registry.ts` (bounded extractor for our own CREATE TABLE / CREATE INDEX shapes — not a general SQL parser)
- Validation: `pnpm validate:migrations` checks:
  - Same migration count and identical ordered ids across dialects
  - Forward-only, deterministic, ordered naming (`0001_...` etc.), no duplicate ids
  - Both dialect renderings match the canonical schema manifest at the level of: table names, column names, primary keys, required unique constraints, foreign-key relationships, and named indexes (including index uniqueness)
  - Documented, allowed dialect differences (TEXT vs TIMESTAMPTZ, JSON text vs JSONB, TEXT vs UUID, INTEGER-as-boolean vs BOOLEAN, dialect-specific defaults/CHECK syntax) are ignored — see `ALLOWED_DIALECT_DIFFERENCES`
  - Legacy `infra/migrations/**`: if it returns with any files, validation FAILS (non-zero exit), not a warning
- Tests:
  - `packages/db/src/database.test.ts` — SQLite idempotency and foundation schema from empty DB
  - `packages/db/src/migration-registry.test.ts` — drift check, extractor coverage, and NEGATIVE tests proving detection of a missing column, missing unique constraint, missing foreign key, missing named index, missing primary key, id/order divergence, and count mismatch
  - `packages/db/src/migration-validation.test.ts` — mirrors `pnpm validate:migrations` inside `pnpm test`; proves legacy `infra/migrations/**` files cause failure
  - `packages/db/src/postgres-migrations.test.ts` — ordered, locked, transactional, rollback on failure (recording executor)
  - `packages/db/src/postgres-adapter.test.ts` — real PostgreSQL lifecycle when `POSTGRES_TEST_URL` is set (CI provides it)
- Migrations are forward-only, deterministic, transactional where supported, idempotent where expected.
- Migration ids, order, and production schema are unchanged by this corrective pass. No destructive migration added.

### Contracts

- `packages/contracts/**` is frozen for parallel batch.
- No contract changes in this foundation commit.
- If a contract change becomes unavoidable, report:

```
CONTRACT_CHANGE_REQUIRED
Reason:
Exact proposed change:
Compatibility impact:
Migration or fixture impact:
Tests requiring updates:
```

### Canonical integration fixture

- Path: `packages/content/src/fixtures/starter-scenario.ts`
- Purpose: Minimal validated starter fixture for end-to-end integration. Reuses current validated fixture instead of creating duplicate content.
- Scenario ID: `foundation-false-breakout-001`, version `1.0.0`, level 3, mode `academy`
- Supports:
  - content validation (`pnpm validate:content` — validates 3 fixtures including this one)
  - clean migration (SQLite and Postgres empty DB tests)
  - import/seed (`seedFoundation` uses this fixture)
  - public API projection (GET /api/v1/scenarios/:id returns public projection without hiddenEntities)
  - client rendering (Hub lists it, brief screen renders it)
  - run start (POST /api/v1/scenario-runs with idempotency key)
  - immutable seal (POST /api/v1/scenario-runs/:runId/seal — decision is immutable, duplicate seal with same decision returns same, different decision fails)
  - process scoring (server-only `evaluateFoundationDecision` returns score 87 for canonical evidence)
  - reveal (POST /api/v1/scenario-runs/:runId/reveal — seal-before-reveal enforced, idempotent rewards, server-only future data isolated before authorized reveal)
  - persisted readback (GET /api/v1/users/:userId/scenario-runs returns sealed/revealed run summary, no decision leakage)

Verified flow (manual mapping to existing e2e tests):

```
content validation
→ clean migration (database.test.ts, postgres-migrations.test.ts)
→ import/seed (seedFoundation)
→ public API projection (api.test.ts: scenario API reads versioned package, never returns hidden future)
→ client rendering (App.test.ts: catalog → brief → start → workspace)
→ run start (api.test.ts: POST /api/v1/scenario-runs, idempotent retry)
→ immutable seal (api.test.ts: seal, score not exposed in seal response)
→ process scoring (seal evaluates to 87, breakdown validated)
→ reveal (api.test.ts: POST reveal returns hiddenEntities, historicalFutureSegment, score)
→ persisted readback (catalog.test.ts: run history user-scoped, only summaries)
```

## API lifecycle change

- Reveal endpoint changed from mutating GET to POST:
  - Old: `GET /api/v1/scenario-runs/:runId/reveal` (mutating, now removed)
  - New: `POST /api/v1/scenario-runs/:runId/reveal`
- Typed client adapter: `ApiClient.revealRun()` uses POST, `getReveal()` deprecated alias now also POST for compatibility.
- Corrective fix (this pass): `ApiClient` no longer sends `content-type: application/json` on body-less POSTs (reveal, logout). A JSON content-type with an empty body is rejected by Fastify (`FST_ERR_CTP_EMPTY_JSON_BODY`, 400), which broke POST reveal in a real browser; the `server.inject`-based tests never exercised this header path. The POST method, routes, auth, CSRF, and contracts are unchanged.
- CSRF handling: all POST mutations require `x-sa-csrf` matching `sa_csrf` cookie in Telegram auth mode; fixture mode bypass remains dev-only.
- Tests updated: `tests/e2e/api.test.ts`, `tests/e2e/auth.test.ts`, `apps/game-client/src/api/client.test.ts`, `apps/game-client/src/App.test.ts`
- Security invariants preserved:
  - Unauthenticated request → 401
  - Cross-user request → 404 (run not found for that user)
  - CSRF-invalid → 403
  - Seal-before-reveal → 409 if not sealed
  - Idempotency: retries do not duplicate XP, Coins, Mastery Stars, referral rewards, or ledger events (idempotency keys `economy:xp:${runId}`, `economy:mastery:${runId}`, etc.)
  - Server-only future-data isolation before authorized reveal (public projection schema strict, no hiddenEntities before reveal)

## Hub featured-card fix

- Issue: featured Hub card visually contained “Открыть брифинг” action but clicking did nothing; separate lower “Открыть сценарий” button worked.
- Original fix wired `WidgetCard` `onAction` to the button and added a parent `<article>` key handler with `tabIndex={0}`.
- Corrective fix (this pass): the nested button + parent key handler + parent `tabIndex` caused **duplicate keyboard activation** (button key events bubbled to the article) and a second focus target. `packages/ui-game/src/components.tsx` now keeps the native `<button>` as the single interactive/focusable control and removes the parent `tabIndex`/`onKeyDown`. The `<article>` is a passive card, so non-action widgets are no longer misleading controls. Visual appearance and the shared typed `onAction` adapter are preserved.
- `apps/game-client/src/screens/HubScreen.tsx` wires featured card's `onAction` to same typed `onOpenScenario(featured.scenarioId, featured.version)` flow, no duplicated navigation/API logic.
- Regression tests:
  - `apps/game-client/src/App.test.ts` — “featured Hub card action opens the scenario brief (regression for dead CTA)”.
  - `apps/game-client/src/components/WidgetCard.test.ts` — exact call count of **one** for mouse click, Enter and Space; asserts a single focusable control and that removed parent key handling no longer double-fires.
  - `tests/e2e/browser-smoke.test.ts` verifies keyboard activation (Enter on the featured CTA) against real browser event semantics.

## Real-browser lifecycle smoke test

- `tests/e2e/browser-smoke.test.ts` drives headless system Chrome/Chromium via `puppeteer-core` (no per-run browser download; uses the Chrome preinstalled on GitHub Ubuntu runners).
- Browser resolution is explicit and deterministic: `CHROME_PATH`/`CHROMIUM_PATH` → known Google Chrome → known Chromium → BLOCKED. “Browser unavailable” is never converted into a PASS in CI. `ALLOW_BROWSER_SMOKE_SKIP=1` downgrades to a local UNVERIFIED skip only (never set in CI).
- Isolated test API subprocess (fixture auth) + isolated temporary SQLite database; a static server serves the built client and proxies `/api`. Processes and temp files are cleaned up even on failure; bounded startup/navigation timeouts; deterministic readiness checks (no fixed sleeps).
- Covers: Hub/catalog → featured CTA (keyboard Enter) → brief → start run → workspace → evidence → invalidation → action → immutable seal → POST reveal → Process Score → persisted history readback.
- Fails on uncaught page errors, unexpected console errors, and failed critical API responses; asserts reveal uses POST (never GET), hidden future/outcome data is absent before reveal, Process Score appears only after reveal, and the run persists in the Hub history readback.
- Direct command: `pnpm browser:smoke`. Also runs as part of `pnpm test:e2e` (via `pnpm test:e2e:browser`).

## CI enforcement path (accurate)

The CI workflow file `.github/workflows/ci.yml` **cannot be modified in this environment**: pushing any change under `.github/workflows/` is rejected with `refusing to allow a GitHub App to create or update workflow without workflows permission` (verified by probe on this branch). This document does **not** claim the workflow was updated. Instead, the mandatory gates are enforced through commands the existing, unchanged `ci.yml` already runs (fallback path allowed by the corrective spec), and every direct command remains available:

| Mandatory gate | Enforced by existing CI step | Nested command |
| --- | --- | --- |
| `pnpm validate:migrations` | `Unit tests` (`pnpm test`) | `packages/db/src/migration-validation.test.ts` calls the same `validateMigrations()` used by the script (single source of truth; legacy `infra/migrations/**` files fail the test) |
| `pnpm design-system:typecheck` | `Build` (`pnpm build`) | `pnpm build` runs `pnpm design-system:typecheck` |
| `pnpm design-system:build` | `Build` (`pnpm build`) | `pnpm build` runs `pnpm design-system:build` |
| Real-browser smoke | `API tests` (`pnpm test:e2e`) | `pnpm test:e2e` runs `pnpm test:e2e:browser` after the API e2e suite |

Failure of any nested gate propagates a non-zero exit status; output is not suppressed; there are no recursive pnpm scripts. Direct commands `pnpm validate:migrations`, `pnpm design-system:typecheck`, `pnpm design-system:build`, and `pnpm browser:smoke` remain available.

Follow-up required (not a current claim of completion): once GitHub is reconnected with `workflows` permission, `ci.yml` should be updated to run these four gates as explicit, named steps and to rename the remaining “Client prototype …” step labels to “Client …”.

## Verification gates

- `pnpm install --frozen-lockfile`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test` (with `POSTGRES_TEST_URL` if available, otherwise SQLite + recording executor; also enforces migration validation)
- `pnpm test:e2e` (API e2e + real-browser smoke)
- `pnpm validate:contracts`
- `pnpm validate:content`
- `pnpm validate:locales`
- `pnpm validate:assets`
- `pnpm validate:public-client`
- `pnpm validate:migrations`
- `pnpm client:typecheck`
- `pnpm client:lint`
- `pnpm client:test`
- `pnpm client:build`
- `pnpm design-system:typecheck`
- `pnpm design-system:build`
- `pnpm build` (also enforces design-system typecheck + build)
- `pnpm audit --prod --audit-level high`

Actual executed results are recorded in `docs/developing_status.md` and the corrective completion report. A gate is PASS only when it actually executed successfully against the reported commit.

## Final foundation commit

- Branch: `arena/01a0c66f-gamid` (corrective), targeting `arena/01a0c652-gamid` (PR #3).
- The authoritative future baseline for Backend, Frontend, and Content/Data agents is the **final merged PR #3 head/merge commit** recorded after acceptance, not an older intermediate SHA (`b4f2572…` was an earlier local commit and is no longer authoritative).
- The exact final corrective-branch SHA is reported in the corrective PR description and completion report after committing.

## Known limitations

- No destructive migration; production data preservation requires audit/reconciliation plan for old unscoped purchase keys and unverified Coin Pack credits (inherited blocker PAYMENT-VERIFY remains BLOCKED for production, but foundation is green for parallel development).
- Real PostgreSQL lifecycle test requires `POSTGRES_TEST_URL`; GitHub CI provides it via service `postgres:16-alpine`. Local runs without it PASS SQLite + recording-executor checks and report the real PG lifecycle as UNVERIFIED locally (the test skips only when the URL is absent).
- The real-browser smoke test requires a Chrome/Chromium executable. GitHub CI Ubuntu runners provide one; environments without a browser report it as BLOCKED/UNVERIFIED and never as PASS.
- Human visual, responsive, keyboard/screen-reader QA not performed in this automated pass; automated component + real-browser keyboard tests cover functional regression only.

## References

- `AGENTS.md` — agent contract, canonical invariants, one-agent-one-PR, frozen contracts
- `docs/README.md` — documentation hub
- `game-development-skill/web-games/SKILL.md` — web-games principles
- `.claude/skills/signal-arena/SKILL.md` — Signal Arena overlay
- `docs/system_architecture.md`, `docs/security_architecture.md`, `docs/acceptance_matrix.md`
- `packages/contracts/src/scenario.ts` — executable scenario contract
- `packages/content/src/validate.ts` — source group, t0, future validation
