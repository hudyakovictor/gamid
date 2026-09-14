# SIGNAL ARENA — AGENTS.md

## 1. Mission

Signal Arena is a Telegram Mini App educational game built around decision quality, historical scenarios, fair scoring, Stars monetization and future platform adapters.

The product must work without a token or blockchain.

## 2. Repository map

```text
apps/
  game-client/       Phaser 4 + TypeScript + Vite + rexUI
  api-server/        Fastify + TypeScript + Zod + Drizzle
  admin-crm/         Next.js + React + TypeScript + Tailwind + shadcn/ui
  landing/           Next.js + TypeScript + Tailwind

packages/
  contracts/         shared Zod schemas and DTOs
  domain/            pure business rules
  db/                Drizzle schema, migrations, repositories
  content/           content schemas, fixtures and validators
  adapters/          Telegram, Stars, Ads, AI, future platforms/chains
  analytics/         event taxonomy and telemetry contracts
  config/            environment and feature flags
  ui-game/           Phaser/rexUI helpers
  ui-crm/            CRM components
  agent-runtime/     AI tools, jobs and policies

workers/
  payments/
  content/
  localization/
  analytics/
  ai/

docs/
  product/
  architecture/
  monetization/
  ai/
  localization/
  operations/
```

## 3. Agent task routing

### Client agent

Use when the instruction contains:

```text
клиент
игра
Phaser
сцена
UI
rexUI
анимация
график
Decision Workspace
магазин на клиенте
профиль
турнирный экран
```

Allowed scope:

```text
apps/game-client
packages/ui-game
packages/contracts
packages/content/fixtures
packages/analytics
```

Do not edit:

```text
apps/api-server/src/domain rules
apps/admin-crm
packages/db migrations
payment fulfillment logic
scoring authority
```

### Backend agent

Use when the instruction contains:

```text
backend
API
сервер
база
Drizzle
Fastify
auth
Stars
payment
refund
score
entitlement
inventory
турниры
логи
```

Allowed scope:

```text
apps/api-server
packages/domain
packages/db
packages/contracts
packages/adapters
packages/analytics
workers
```

Do not edit client rendering or CRM pages unless the task explicitly requires a contract change.

### CRM agent

Use when the instruction contains:

```text
CRM
админка
администратор
каталог
пользователи
платежи
контент
локализация
AI jobs
feature flags
аудит
```

Allowed scope:

```text
apps/admin-crm
packages/ui-crm
packages/contracts
```

CRM must call Admin API. Never access the database directly from browser code.

### Landing agent

Use when the instruction contains:

```text
лендинг
маркетинговая страница
SEO
roadmap
Founder Pack presentation
public page
```

Allowed scope:

```text
apps/landing
packages/contracts/public
```

Landing cannot access private database tables or admin endpoints.

### Content agent

Use when the instruction contains:

```text
сценарий
карта
сущность
урок
rubric
контент
```

Allowed scope:

```text
packages/content
apps/admin-crm content modules
scripts/validate-scenarios
```

Every published scenario requires schema validation, fairness review and versioning.

### AI/operations agent

Use when the instruction contains:

```text
AI
агент
рутина
логи
аналитика
баланс
перевод
локализация
```

Allowed scope:

```text
packages/agent-runtime
workers/ai
workers/analytics
workers/localization
docs/ai
```

AI agents may propose changes. They may not autonomously modify money, score, rewards, bans, prices, rubrics or token features.

## 4. Non-negotiable architecture rules

1. Client, API, CRM and landing are separate applications.
2. Shared API schemas live in `packages/contracts`.
3. Domain rules live in `packages/domain`, not in Phaser or React.
4. The client never connects directly to the database.
5. CRM never connects directly to the database from browser code.
6. The API is authoritative for score, hidden future, payments, inventory and entitlements.
7. The client never grants itself currency or purchased items.
8. Telegram SDK is accessed only through an adapter.
9. Payment providers are separate from platform adapters.
10. Chain adapters are separate from payment providers.
11. All content is versioned and localized through keys.
12. All dangerous admin actions are audited.
13. All payment fulfillment is idempotent.
14. No token is required for the game to work.
15. No paid item may affect score, outcome, mastery or tournament ranking.

## 5. Contract-first workflow

Before implementing a cross-app feature:

```text
1. Define or update Zod contract in packages/contracts.
2. Add request/response examples.
3. Add API route or command.
4. Add mock fixture.
5. Add server validation.
6. Add client integration.
7. Add CRM integration if the feature is manageable there.
8. Add analytics events.
9. Add tests.
10. Update docs and changelog.
```

A client-only API shape is forbidden.

## 6. Content workflow

```text
CRM draft
→ API validation
→ content schema validation
→ fairness review
→ localization
→ publish version
→ public API
→ game client
```

The client may use fixtures during development, but fixtures must pass the same schemas as database content.

## 7. Feature workflow example

For a new shop item:

```text
contracts/catalog.ts
→ db catalog migration
→ API catalog endpoint
→ CRM catalog form
→ client catalog card
→ order endpoint
→ Stars webhook
→ entitlement ledger
→ inventory
→ equipment/public profile
→ analytics
→ tests
```

For a new scenario:

```text
content schema
→ scenario fixture
→ validator
→ DB seed/migration
→ API scenario endpoint
→ client rendering
→ scoring rubric
→ CRM review screen
→ localization keys
→ analytics events
```

## 8. Required response format for agents

Every agent must report:

```text
Scope:
Files changed:
Contracts changed:
Database/migrations:
API routes:
Feature flags:
Analytics events:
Tests:
Risks:
Not implemented:
```

## 9. Validation commands

Use the repository scripts when available:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm validate:contracts
pnpm validate:content
pnpm validate:locales
pnpm build
```

Do not claim success if a command was not run.

## 10. Definition of done

A feature is not complete until:

- shared contracts compile;
- server validates input and output;
- client handles loading/error/empty states;
- CRM can manage the feature if it is operational content;
- database migration is reversible or documented;
- analytics events exist;
- feature flag exists for risky functionality;
- payment/refund behavior is defined where relevant;
- tests cover happy path and failure path;
- docs are updated;
- no secret is committed.

## 11. Scope discipline

Do not prematurely implement:

```text
multi-chain token
bridges
DAO
creator payouts
AI autonomous economy changes
real-money trading
```

Build the Telegram MVP and shared contracts first.
