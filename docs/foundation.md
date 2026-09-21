# Foundation Commit — Parallel Development Baseline

Status: REQUIRED
Owner: Foundation Agent
Last reviewed: 2026-09-21

## Role

Foundation Agent — repository hygiene, CI, workspace boundaries, frozen contracts, migration consolidation, minimal client/API scaffolding for parallel work.

## Starting point

- Starting branch: master
- Starting commit (task context): ec17eeecf1b922f2a1470befd9729e329b5e529c
- Actual base in this environment: 477a6d47e5600f572e8ce26fc0eaa4f5c7c7e064 (arena/01a0c652-gamid branch)
- Final foundation commit: to be recorded after green verification (see below)

## Canonical paths

### Frontend

- Canonical client path: `apps/game-client/**`
- Workspace package: `@signal-arena/game-client`
- Legacy path `apps/client-prototype/**` has been moved to `apps/game-client/**` with git history preserved via `git mv`.
- No competing client applications remain.

### Migrations

- Canonical migration source: `packages/db/src/migrations.ts` (SQLite, source of truth for schema intent and ordering)
- Dialect rendering: `packages/db/src/postgres-migrations.ts` (PostgreSQL, explicit dialect rendering of same intent)
- Registry and drift protection: `packages/db/src/migration-registry.ts`
- Validation: `pnpm validate:migrations` checks:
  - Same migration count and identical ordered ids
  - Same tables and indexes in both dialects (allowing TEXT vs TIMESTAMPTZ, JSON vs JSONB differences)
  - Forward-only, deterministic, ordered naming (`0001_...` etc.)
  - Legacy `infra/migrations/**` removed (contained only first migration, now redundant)
- Tests:
  - `packages/db/src/database.test.ts` — SQLite idempotency and foundation schema from empty DB
  - `packages/db/src/migration-registry.test.ts` — drift check, empty DB, repeated application
  - `packages/db/src/postgres-migrations.test.ts` — ordered, locked, transactional, rollback on failure (recording executor)
  - `packages/db/src/postgres-adapter.test.ts` — real PostgreSQL lifecycle when `POSTGRES_TEST_URL` is set (CI provides it)
- Migrations are forward-only, deterministic, transactional where supported, idempotent where expected.
- No destructive migration added.

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
- Typed client adapter updated: `ApiClient.revealRun()` uses POST, `getReveal()` deprecated alias now also POST for compatibility.
- CSRF handling updated: all POST mutations require `x-sa-csrf` matching `sa_csrf` cookie in Telegram auth mode; fixture mode bypass remains dev-only.
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
- Fix: `packages/ui-game/src/components.tsx` now accepts `onAction` prop, button `onClick={onAction}`, article handles Enter/Space for keyboard accessibility.
- `apps/game-client/src/screens/HubScreen.tsx` wires featured card's `onAction` to same typed `onOpenScenario(featured.scenarioId, featured.version)` flow, no duplicated navigation/API logic.
- Regression test: `apps/game-client/src/App.test.ts` — “featured Hub card action opens the scenario brief (regression for dead CTA)” clicks `.widget button` containing “Открыть брифинг” and asserts navigation to `#/scenario_brief` and brief screen content.
- Keyboard accessibility preserved: button is focusable, Enter/Space triggers action.

## Verification gates (to be executed)

- `pnpm install --frozen-lockfile`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test` (with POSTGRES_TEST_URL if available, otherwise SQLite + recording executor)
- `pnpm test:e2e`
- `pnpm validate:contracts`
- `pnpm validate:content`
- `pnpm validate:locales`
- `pnpm validate:assets`
- `pnpm validate:public-client`
- `pnpm validate:migrations` (new)
- `pnpm client:typecheck`
- `pnpm client:lint`
- `pnpm client:test`
- `pnpm client:build`
- `pnpm build`

All must PASS for ACCEPTED status.

## Final foundation commit

After all gates PASS, record:

- Final commit SHA: (to be filled after commit)
- Branch: arena/01a0c652-gamid
- PR: to be created from this branch

This SHA is the base from which Backend, Frontend, and Content/Data agents start parallel work.

## Known limitations

- No destructive migration; production data preservation requires audit/reconciliation plan for old unscoped purchase keys and unverified Coin Pack credits (inherited blocker PAYMENT-VERIFY remains BLOCKED for production, but foundation is green for parallel development).
- PostgreSQL real migration test requires `POSTGRES_TEST_URL`; CI provides it via service postgres:16-alpine. Local runs without it still PASS SQLite and recording-executor checks but skip real PG lifecycle.
- Human visual, responsive, keyboard/screen-reader QA not performed in this automated pass; headless component tests cover functional regression.

## References

- `AGENTS.md` — agent contract, canonical invariants, one-agent-one-PR, frozen contracts
- `docs/README.md` — documentation hub
- `game-development-skill/web-games/SKILL.md` — web-games principles
- `.claude/skills/signal-arena/SKILL.md` — Signal Arena overlay
- `docs/system_architecture.md`, `docs/security_architecture.md`, `docs/acceptance_matrix.md`
- `packages/contracts/src/scenario.ts` — executable scenario contract
- `packages/content/src/validate.ts` — source group, t0, future validation
