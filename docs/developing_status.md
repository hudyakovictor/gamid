# Signal Arena Development Status

Status: BLOCKED
Scope: existing implementation corrective pass and verified local evidence
Owner: Signal Arena project owner
Last reviewed: 2026-09-21
Supersedes: previous status snapshot, including unsupported acceptance/manual-smoke claims
Required evidence: executed gates; automated tests do not imply manual or production acceptance
Canonical dependencies: `roadmap_and_release_control_plane.md`, `acceptance_matrix.md`, `system_architecture.md`, `security_architecture.md`, `economy_monetization_referrals.md`

## Current disposition

The product is **BLOCKED**, not ACCEPTED_LOCAL or PRODUCTION_READY.

This corrective pass is on `arena/01a0c61d-gamid`, based on `ec136b04ca7ac29818ad326756b8042f8a2a1a94` from `arena/01a0c554-gamid`, not main. Evidence below applies to the modified working tree, not a newly committed release. No production acceptance or human manual-smoke PASS is claimed.

### Corrected implementation

- A new client run requires a loaded scenario, not an existing run. A mounted App component test covers catalog → brief → start → decision workspace from empty run storage.
- The Hub API instance is stable across renders. Native browser `fetch` is bound correctly, and the balance client parses the actual `data.balance` response envelope.
- Authenticated client Coin Pack requests cannot credit Coins. The unsafe invoice-ID credit helper was removed. Fabricated/replayed invoice identifiers are rejected without minting Coins.
- All `/api/v1/admin/*` routes require an explicit server-configured content-editor user ID. `CONTENT_EDITOR_USER_IDS` contains internal user IDs, is empty by default, and is never read from client claims. Ordinary authenticated users receive 403.
- A central pre-handler validates CSRF for authenticated mutations in Telegram auth mode, including purchases, refunds, referrals, admin mutations, and the legacy reveal GET (which persists reveal state/rewards). Fixture mode remains a development-only bypass. Production-auth-mode tests exercise missing/invalid tokens and authorized/unauthorized editors.
- Store service/SKU checkout and refunds execute inside a persistence-owned atomic unit of work. SQLite uses `BEGIN IMMEDIATE` and an async queue shared by adapters on the same connection, preventing unrelated adapter calls from joining or observing an in-progress transaction. PostgreSQL uses one transaction-scoped pool client and a transaction-level advisory lock shared by economic units and standalone ledger writes. Nested adapter operations do not commit the outer transaction.
- Balance checks, ledger changes, purchase creation, supply reservation and entitlement/effect grants commit or roll back together. Purchase idempotency keys include the user ID. Entitlement conflicts cannot silently charge for a grant that did not occur.
- Refunds return the existing refunded purchase on replay; concurrent refunds credit/release/revoke once. Immediate Energy purchases are non-refundable through this endpoint, including after consumption. Coin Pack refunds are rejected without a verified platform refund path.
- Referral activation and both reward grants are atomic. Purchase-bonus grants and their state marker are atomic. Monthly-cap reads and grants serialize in the same economic unit. Failed operations roll back activation and can retry; checkout retries also retry the referral purchase hook after a prior hook failure.
- Real PostgreSQL economic tests exposed and corrected a boolean-vs-integer comparison and unquoted camel-case aliases in balance/state queries.

### Open blockers and limitations

| Blocker | Status / required next evidence |
| --- | --- |
| PAYMENT-VERIFY | **BLOCKED.** No trusted Telegram successful-payment/refund update verification and order/charge reconciliation path is implemented. Coin Pack purchases/refunds fail closed; rejecting client invoices is not a substitute for completing platform verification. No real-money payment smoke was performed. |
| REFUND-POLICY | Immediate Energy effects are rejected rather than reversed. Selective refunds of provably unconsumed Energy require consumption provenance and tests; do not claim this capability. |
| TRANSACTION-OPERATIONS | Local adapter tests pass, but production load, multi-process SQLite contention/retry behavior, backup/restore and staging rehearsal remain unverified. PostgreSQL intentionally serializes economic units globally; throughput is not established. Do not bypass the adapter with raw SQL in runtime code. |
| HUMAN-QA | Human visual, responsive, keyboard/screen-reader and accessibility QA were not performed. Headless browser flow evidence is not manual acceptance. |
| PRODUCTION | Shared rate limiting, deployment/payment smoke, operational observability and asset release approval remain open. Existing production startup restrictions remain in place. |

The transactional changes do not repair any pre-existing partial or fraudulent economic records. Deployment against non-fixture data requires an audit/reconciliation plan, including old unscoped purchase keys and unverified Coin Pack credits.

## Verification record — 2026-09-21

Evidence ID: `corrective-2026-09-21-local`
Base commit: `ec136b04ca7ac29818ad326756b8042f8a2a1a94` plus this working-tree patch
Environment: Debian 12 sandbox, Node 22.22.3, pnpm 11.9.0, SQLite, real PostgreSQL 18.4, headless Chromium 153.0.8010.0
Release disposition: **BLOCKED (PAYMENT-VERIFY)**

| Gate | Observed result |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS on final lockfile. Initial attempt failed fetching native-build headers; retried using installed headers with `npm_config_nodedir=/usr/local`. |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS |
| `pnpm test` with `POSTGRES_TEST_URL` | PASS — 86 tests, 0 failures, **0 skipped** |
| `pnpm test:e2e` | PASS — 26 tests, 0 failures, 0 skipped |
| `pnpm client:typecheck` | PASS |
| `pnpm client:lint` | PASS |
| `pnpm client:test` | PASS — 27 tests across 4 files |
| `pnpm client:build` | PASS |
| `pnpm design-system:typecheck` | PASS |
| `pnpm design-system:build` | PASS |
| `pnpm validate:contracts` | PASS |
| `pnpm validate:content` | PASS — 3 fixtures and registry validation |
| `pnpm validate:locales` | PASS |
| `pnpm validate:assets` | PASS — 87 **draft** assets; not release approval |
| `pnpm validate:public-client` | PASS |
| Real PostgreSQL integration | PASS — PostgreSQL 18.4 process, migrations, authoritative lifecycle and economic tests actually executed; not emulation or a skipped test |
| Automated browser smoke | PASS — live Vite client + fixture-auth SQLite API, empty browser context, catalog → brief → start → workspace → select evidence/action and enter invalidation → seal → reveal; no page errors |
| Human manual smoke / visual / responsive / accessibility QA | **NOT PERFORMED** |
| Trusted payment/refund verification | **INCOMPLETE / BLOCKED** |

### Test evidence and reproduction

- `apps/client-prototype/src/App.test.ts`: mounted component regression, real UI controls, mocked API responses, no pre-existing run.
- `tests/e2e/auth.test.ts`: Telegram auth mode, authenticated mutation CSRF, ordinary-user denial and explicit editor authorization.
- `tests/e2e/store.test.ts`: fabricated invoice rejection; test funding comes directly from a fixture ledger grant, never from fabricated payment proof.
- `packages/db/src/economic-transactions.test.ts`: identical SQLite/PostgreSQL scenarios. Injected exceptions occur **after** real mutations. Covers checkout ledger/purchase/grant rollback, limited checkout reservation rollback, concurrent overspend/duplicate checkout, supply exhaustion, refund ledger/revoke/release/state rollback, concurrent/repeated refunds, Energy/Pack refund denial, activation/reward rollback and retry, duplicate and distinct concurrent monthly-cap grants. PostgreSQL uses a temporary isolated schema.
- `packages/db/src/postgres-adapter.test.ts`: real authoritative scenario lifecycle. This inherited test truncates its database tables; use a disposable test database only.

For real PostgreSQL verification, start a disposable PostgreSQL instance and set `POSTGRES_TEST_URL` before `pnpm test`. The local run used port 55432 and a database outside the repository. With no URL, PostgreSQL tests still skip; such a run does **not** satisfy the PostgreSQL gate.

Local command logs were written outside Git to `/tmp/gamid-verification/`, `/tmp/gamid-install-final.log`, `/tmp/transactions.log`, and `/tmp/browser-smoke.log`. The headless browser was driven by Playwright against ports 5173/3000. Standard browser download failed in this environment; an npm-distributed Chromium binary and its runtime libraries were used from `/tmp`. No database, archive, screenshot, generated build output or installed dependency is included in the patch.

## Scope and governance

Documents/skills used: `AGENTS.md`, `docs/README.md`, archive `web-games`, Signal Arena skill overlay, security architecture, economy/referral specifications and acceptance matrix. No product redesign, new catalog content, or visual assets were introduced. No new art/source provenance is needed.

Previous invoice-reconciliation and manual-smoke PASS claims are withdrawn. A client invoice identifier is not payment evidence. Local automated verification does not close platform verification, production readiness or human QA gates. No phase is accepted from documentation alone.
