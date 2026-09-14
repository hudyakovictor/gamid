# SIGNAL ARENA

> Telegram Mini App: decision trainer для анализа исторических криптовалютных сценариев.

Signal Arena учит принимать решения до раскрытия будущего рынка. Игрок работает с evidence, строит гипотезу, задаёт инвалидацию, выбирает действие, получает process score и исправляет повторяющиеся ошибки.

Проект запускается без собственного токена и без blockchain-зависимости в core gameplay. Первая монетизация — Telegram Stars, Founder Support Packs, позже rewarded ads и marketplace. Возможный токен и другие блокчейны — только условные будущие этапы.

## Быстрый старт для AI-агента

Перед любой задачей прочитай документы в таком порядке:

```text
1. AGENTS.md
2. developing_status.md
3. CONTRIBUTING.md
4. full_game_spec.md
5. docs/system_architecture_v4.md
```

Затем определи:

```text
роль агента
текущую фазу
scope задачи
затрагиваемые contracts
нужные migrations
acceptance criteria
```

## Текущий статус

```text
Phase: Foundation / pre-vertical-slice
Overall specification readiness: 81/100
Primary platform: Telegram Mini App
Primary payment: Telegram Stars/XTR
Primary chain target: none in MVP; TON is future option
Current priority: contracts → database → API skeleton → content fixtures → vertical slice
```

Не начинать полноценный production-polish клиента, пока не закрыт vertical slice:

```text
auth
→ Arena Hub
→ scenario
→ Decision Workspace
→ decision lock
→ server reveal
→ score breakdown
→ Personal Insight
→ persistence
→ CRM visibility
```

## Главные документы

### Управление разработкой

- [AGENTS.md](AGENTS.md) — роли AI-агентов, границы директорий, contract-first workflow и запрещённые зависимости.
- [CONTRIBUTING.md](CONTRIBUTING.md) — ветки, commits, PR, labels, review comments и merge policy.
- [developing_status.md](developing_status.md) — последовательность фаз, параллельные потоки и чеклисты приёмки.

### Продукт

- [Full Game Specification](full_game_spec.md) — каноничное ТЗ игры, client stack, режимы, scoring, Shop, profiles и tournaments.
- [Academy Plan](academy_plan_99.md) — структура обучения и curriculum.
- [Brand](brand.md) — визуальное направление Signal Arena.
- [Style and Tone](style-tone.txt) — панк-таблоидная криптосатира и правила текстов.
- [Competitors](competitors.md) — конкурентный анализ и позиционирование.

### Монетизация и экономика

- [Monetization](monetization.txt) — Stars, Founder Packs, subscriptions, rewarded ads, anti-pay-to-win и token readiness gates.
- [150 Analysis / Risk Reduction](docs/top_30_risk_reductions.md) — 100 проверок и 30 доработок с максимальным снижением риска.
- [Readiness Score](docs/signal_arena_readiness_score.md) — оценка ТЗ по 15 факторам.

### Архитектура

- [System Architecture](docs/system_architecture_v4.md) — monorepo, applications, packages, APIs, AI, localization, profiles and tournaments.
- [CRM Stack](docs/crm_stack_spec.md) — отдельный стек CRM и Admin API.
- [Multichain Readiness](docs/multichain_readiness_assessment.md) — Base, MiniPay, Solana Mobile, adapters и общий backend.
- [Interactive Motion](docs/interactive_motion_spec.md) — интерактив, анимации, haptics, sound и reduced motion.
- [Monorepo Scaffold](docs/monorepo_scaffold.md) — рекомендуемые директории и правила заглушек.
- [Repository Migration Map](docs/repository_migration_map.md) — соответствие старых и новых документов.

## Архитектурная схема

```text
apps/
  game-client/       Phaser 4 + TypeScript + Vite + rexUI
  api-server/        Fastify + TypeScript + Zod + Drizzle
  admin-crm/         Next.js + React + TypeScript + Tailwind + shadcn/ui
  landing/           Next.js + TypeScript + Tailwind

packages/
  contracts/         общие Zod schemas и DTO
  domain/            чистые бизнес-правила
  db/                Drizzle schema, migrations, repositories
  content/           scenarios, cards, entities, rubrics, fixtures
  adapters/          Telegram, Stars, Ads, AI, future platforms/chains
  analytics/         event taxonomy
  config/            env и feature flags
  ui-game/           игровые UI helpers
  ui-crm/            CRM components
  agent-runtime/     AI tools, jobs and policies

workers/
  payments/
  content/
  localization/
  analytics/
  ai/
```

## Стек клиента

```text
Phaser 4
TypeScript
Vite
rexUI
Custom CandleChart на Phaser Graphics
```

Phaser отвечает за сцены, game loop, tweens, camera, particles и sound. rexUI отвечает за панели, вкладки, списки, слайдеры и чек-листы внутри игровых сцен.

Клиент не является источником истины для score, hidden future, payments, inventory, entitlements и tournament results.

## Стек API

```text
Fastify
TypeScript
Zod
Drizzle ORM
SQLite → PostgreSQL-ready repositories
WebSockets
Pino
Redis-ready queues/rate limits
```

API является источником истины для:

- auth и sessions;
- scenarios и scenario runs;
- decisions и scoring;
- progression;
- catalog/orders/payments;
- inventory/entitlements;
- public profiles;
- tournaments;
- localization;
- AI jobs;
- audit.

## Стек CRM

CRM не использует Phaser или rexUI:

```text
Next.js 15+ App Router
React
TypeScript
Tailwind CSS
shadcn/ui или Radix UI
TanStack Query
TanStack Table
React Hook Form + Zod
Recharts/ECharts
Playwright
Vitest
```

CRM работает только через Admin API. Прямой доступ браузера к базе запрещён.

## Основная навигация игры

```text
Арена | Академия | Магазин | Турниры
```

Профиль открывается через Avatar в Top Bar.

Арена является hub для:

- Continue;
- Daily Fix Mission;
- Rematch;
- Blind Scenario;
- Conflict Scenario;
- Post-Loss Protocol;
- Challenge Friend;
- Personal Insight.

## Монетизация

```text
Free Academy/Arena
→ Stars digital goods
→ Founder Support Packs
→ Premium/Season Pass
→ rewarded ads
→ off-chain marketplace
→ optional future on-chain layer
```

Покупки не могут изменять:

```text
score
historical outcome
mastery
risk rules
tournament ranking
future visibility
```

## Контентный поток

```text
CRM draft
→ API validation
→ schema/fairness validation
→ review
→ localization
→ publish version
→ public API
→ game client
```

Клиент может использовать mock fixtures, но fixtures проходят те же schemas, что и данные из БД.

## Contract-first правило

Любая cross-app feature начинается с `packages/contracts`:

```text
Zod schema
→ request/response examples
→ API route
→ mock fixture
→ client integration
→ CRM integration
→ analytics
→ tests
→ docs
```

Запрещено создавать отдельные несовместимые типы для client, API и CRM.

## Текущая очередность

### P0

- monorepo boundaries;
- AGENTS/CONTRIBUTING/developing status;
- packages/contracts;
- database schema и migrations;
- API skeleton;
- content schemas и fixtures;
- Telegram/dev auth;
- vertical slice;
- minimal CRM;
- structured logs;
- hidden future tests.

### P1

- Phaser production UI;
- Stars payment flow;
- Founder Packs;
- entitlements/inventory;
- public profiles;
- cosmetics;
- basic tournament;
- ru/en localization;
- personal insights.

### P2

- rewarded ads;
- tournament seasons;
- squads;
- creator marketplace;
- Base/MiniPay adapters;
- TON Connect;
- on-chain credentials;
- token readiness review.

## Запуск и проверки

Команды должны быть добавлены по мере создания workspace:

```bash
pnpm install
pnpm dev:client
pnpm dev:api
pnpm dev:crm
pnpm dev:landing
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm validate:contracts
pnpm validate:content
pnpm validate:locales
pnpm build
```

Агент не должен утверждать, что проверка пройдена, если команда не запускалась.

## Definition of Done

```text
[ ] Contract updated and consumed by API/client/CRM.
[ ] Database migration added if data changed.
[ ] API input/output validated.
[ ] Loading/error/empty states exist.
[ ] Analytics events added.
[ ] Feature flag added for risky functionality.
[ ] Payment/refund behavior defined where relevant.
[ ] Audit event added for admin mutation.
[ ] Unit/integration/e2e tests updated.
[ ] Localization keys added.
[ ] Documentation updated.
[ ] No secrets committed.
[ ] Rollback path documented.
```

## Правила для AI-агента

Перед задачей:

```text
Read AGENTS.md
Read developing_status.md
Read CONTRIBUTING.md
Identify role and phase
Inspect existing contracts
Define scope
```

После задачи:

```text
Scope:
Files changed:
Contracts changed:
Database/migrations:
API routes:
Feature flags:
Analytics events:
Tests run:
Risks:
Not implemented:
Rollback plan:
```

## Главный инвариант

```text
Одна игра.
Один backend domain.
Один contracts package.
Разные platform/payment/chain adapters.
Единая CRM.
Единая аналитика.
Игра работает без токена.
```