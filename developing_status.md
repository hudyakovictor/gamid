# SIGNAL ARENA — Developing Status

## Назначение

Этот файл — главный operational roadmap репозитория. Перед началом разработки клиента он задаёт порядок работ, зависимости, критерии готовности и контрольные точки. Агент не должен начинать полноценную реализацию Phaser-клиента, пока не закрыты обязательные пункты Foundation.

## Главный принцип

```text
Сначала контракты и вертикальный поток.
Потом клиент, CRM и контент параллельно.
После доказанного MVP — Stars, Founder Pack, турниры и реклама.
Токен и другие блокчейны не являются условием запуска.
```

## Каноничная последовательность

```text
0. Product decisions
1. Monorepo and agent rules
2. Contracts
3. Database and migrations
4. API skeleton
5. Content fixtures and validators
6. Auth and sessions
7. Vertical slice
8. CRM control plane
9. Game client production UI
10. Stars and entitlements
11. Public profiles and cosmetics
12. Tournaments
13. Ads
14. Closed alpha
15. Metrics and iteration
16. Future platform adapters
17. Token readiness review
```

## Phase 0 — Product freeze

### Цель

Зафиксировать минимальный продукт, чтобы архитектура не разъезжалась.

### Сделать

- Зафиксировать navigation: `Arena | Academy | Shop | Tournaments`.
- Зафиксировать Top Bar: avatar/profile, level, attempts, soft currency, inbox.
- Зафиксировать core loop: scenario → decision → reveal → score → insight.
- Зафиксировать free loop.
- Зафиксировать Stars catalog.
- Зафиксировать Founder Packs без обещания токена.
- Зафиксировать token roadmap как conditional only.
- Зафиксировать MVP non-goals.

### Acceptance checklist

```text
[ ] Есть одна формулировка продукта.
[ ] Есть список MVP features.
[ ] Есть список non-goals.
[ ] Нет зависимости gameplay от токена.
[ ] Нет pay-to-win effects.
[ ] Есть решение по основной навигации.
```

## Phase 1 — Monorepo and agents

### Сделать

```text
apps/game-client
apps/api-server
apps/admin-crm
apps/landing
packages/contracts
packages/domain
packages/db
packages/content
packages/adapters
packages/analytics
packages/config
packages/agent-runtime
workers/
docs/
```

Добавить в корень:

```text
AGENTS.md
README.md
CONTRIBUTING.md
```

### Acceptance checklist

```text
[ ] Каждый app имеет README.
[ ] AGENTS.md описывает зоны ответственности.
[ ] Client/Backend/CRM/Landing не смешаны.
[ ] Shared packages определены.
[ ] Команды typecheck/lint/test/build описаны.
[ ] Нет production-кода в корневой папке.
```

## Phase 2 — Contract-first foundation

### Сделать

Создать Zod-контракты:

```text
auth
users
profiles
public-profiles
scenarios
scenario-runs
decisions
scores
catalog
orders
payments
entitlements
inventory
tournaments
localization
analytics
admin
```

Определить:

- request/response schemas;
- error envelope;
- enum compatibility rules;
- pagination;
- timestamps UTC;
- idempotency keys;
- API version `/api/v1`.

### Acceptance checklist

```text
[ ] Client импортирует типы из contracts.
[ ] API валидирует вход и выход через те же схемы.
[ ] CRM использует те же DTO.
[ ] Mock fixtures проходят validation.
[ ] Contract tests проходят.
[ ] Изменение schema ломает CI до merge.
```

## Phase 3 — Database foundation

### Сделать

Drizzle schema для:

```text
users
identities
sessions
scenarios
scenario_versions
scenario_runs
decisions
scores
progression
catalog_items
orders
payment_events
entitlements
inventory_items
equipped_items
public_profiles
tournaments
leaderboards
localizations
analytics_events
audit_events
feature_flags
ai_jobs
```

### Acceptance checklist

```text
[ ] Есть initial migration.
[ ] Есть seed development data.
[ ] Есть уникальность payment charge ID.
[ ] Есть transaction boundary для fulfillment.
[ ] Есть foreign keys и индексы.
[ ] Есть backup/restore test.
[ ] Repository interfaces не зависят от SQLite API.
```

## Phase 4 — API skeleton

### Сделать

```text
GET  /api/v1/health
POST /api/v1/auth/telegram
GET  /api/v1/me
GET  /api/v1/scenarios
POST /api/v1/scenario-runs
POST /api/v1/scenario-runs/:id/decision
GET  /api/v1/scenario-runs/:id/result
GET  /api/v1/catalog
POST /api/v1/orders
GET  /api/v1/me/entitlements
GET  /api/v1/me/inventory
GET  /api/v1/public-profiles/:id
```

Добавить:

- Fastify plugins;
- Zod validation;
- error handling;
- request IDs;
- auth middleware;
- rate limiting;
- structured logs.

### Acceptance checklist

```text
[ ] Health/readiness работают.
[ ] Unauthorized requests отклоняются.
[ ] Ошибки имеют единый формат.
[ ] Все mutations пишут audit/analytics event.
[ ] Повторный request безопасен.
[ ] API можно вызвать из mock client.
```

## Phase 5 — Content system

### Сделать

Создать schemas для:

```text
Scenario
SourceGroup
Card
Entity
Protocol
Rubric
Lesson
LocalizationEntry
```

Создать 5–10 сценариев для vertical slice:

- 2 Academy;
- 2 Pre-Entry;
- 1 Wait/No Trade;
- 1 False Breakout;
- 1 Conflict;
- 1 Post-Loss;
- 1 Arena mixed.

Publishing states:

```text
DRAFT
→ VALIDATING
→ IN_REVIEW
→ APPROVED
→ PUBLISHED
→ ARCHIVED
```

### Acceptance checklist

```text
[ ] Все scenarios проходят schema validation.
[ ] Hidden future не попадает в public payload.
[ ] У каждого scenario есть rubric.
[ ] Указан content/data/rubric version.
[ ] Есть допустимые альтернативные планы.
[ ] Есть русская локализация.
[ ] Есть fairness review.
```

## Phase 6 — Auth and identity

### Сделать

- validate Telegram initData on server;
- internal user ID;
- identities table;
- session/JWT rotation;
- logout/revoke;
- rate limits;
- dev auth adapter.

### Acceptance checklist

```text
[ ] Нельзя создать пользователя под чужим initData.
[ ] Replay старого initData отклоняется.
[ ] Client не хранит секреты.
[ ] Dev mode изолирован.
[ ] Session revocation работает.
```

## Phase 7 — Vertical slice before full client

### Реализовать минимально

```text
Telegram/dev auth
→ Arena Hub
→ load scenario
→ PRICE workspace
→ action selection
→ Decision Sheet
→ lock decision
→ server reveal
→ score breakdown
→ Personal Insight
→ save progress
```

Клиент пока может быть визуально простым. Цель — проверить архитектурный поток, а не polish.

### Acceptance checklist

```text
[ ] Один пользователь проходит сценарий от начала до конца.
[ ] Результат сохраняется после reload.
[ ] Hidden future не виден до lock.
[ ] Score приходит с сервера.
[ ] Ошибка сети не списывает решение.
[ ] Повторный submit не создаёт дубль.
[ ] CRM видит run, decision и score.
```

## Phase 8 — Parallel implementation

После vertical slice можно работать тремя потоками.

### Client agent

```text
Phaser scenes
rexUI workspace
animations
sound
shop UI
profiles
leaderboards
localization
```

### Backend agent

```text
scoring
progression
catalog
Stars
refunds
entitlements
public profiles
tournaments
analytics
```

### CRM/Landing agent

```text
scenario editor
catalog editor
payment dashboard
user support
localization queue
landing pages
```

### Правило синхронизации

```text
contract change
→ API implementation
→ mock fixture
→ client/CRM integration
→ tests
```

## Phase 9 — CRM control plane

### MVP CRM

- admin auth;
- users;
- scenarios;
- catalog;
- orders;
- refunds;
- entitlements;
- logs;
- audit;
- localization queue;
- feature flags.

### Acceptance checklist

```text
[ ] CRM не подключается к DB напрямую.
[ ] RBAC работает server-side.
[ ] Опасные действия требуют подтверждения.
[ ] Каждая mutation видна в audit.
[ ] Можно создать и опубликовать scenario.
[ ] Можно создать SKU и supply limit.
[ ] Можно найти payment и entitlement.
```

## Phase 10 — Client production pass

### Сделать

- Arena Hub;
- Academy;
- Shop;
- Tournament placeholder;
- Profile drawer;
- Decision Workspace;
- score reveal;
- reduced motion;
- loading/error/empty states;
- responsive safe areas;
- asset manifest.

### Acceptance checklist

```text
[ ] Первый сценарий понятен без объяснения разработчика.
[ ] Shop доступен, но не мешает free loop.
[ ] Founder Pack показывает полный состав до покупки.
[ ] No Trade не выглядит проигрышем.
[ ] Reduced-motion работает.
[ ] UI не раскрывает future.
[ ] Клиент работает на слабом мобильном устройстве.
```

## Phase 11 — Stars and Founder Packs

### Сделать

- `TelegramStarsProvider`;
- invoice;
- pre-checkout;
- success webhook;
- idempotency;
- entitlement fulfillment;
- refund/revoke;
- restore purchases;
- Founder Pack supply reservation;
- CRM reconciliation.

### Acceptance checklist

```text
[ ] Payment success выдаёт entitlement ровно один раз.
[ ] Повтор webhook безопасен.
[ ] Refund отзывает доступ по правилам.
[ ] Supply Founder Pack не уходит в минус.
[ ] Цена и catalog version сохраняются в order.
[ ] Клиент не может выдать себе item.
[ ] Покупка не меняет score/ranking.
```

## Phase 12 — Public profiles and cosmetics

### Сделать

- public profile opt-in;
- inventory;
- equipment slots;
- avatar frame;
- profile banner;
- Founder badge;
- tournament profile drawer;
- asset manifest and fallback.

### Acceptance checklist

```text
[ ] Косметика видна в public profile.
[ ] Косметика видна в tournament card.
[ ] Косметика не влияет на score.
[ ] Private data не раскрывается.
[ ] У каждого asset есть fallback.
```

## Phase 13 — Tournaments

### Сначала

- tournament schema;
- registration;
- fixed scenario version;
- server score;
- provisional leaderboard;
- finalization;
- cosmetics display.

### Потом

- squads;
- social graph;
- seasons;
- advanced anti-cheat;
- rewards.

### Acceptance checklist

```text
[ ] Все игроки получают одну версию scenario.
[ ] Rubric version зафиксирован.
[ ] Speed не является главным score.
[ ] Duplicate submission невозможен.
[ ] Final leaderboard воспроизводим.
[ ] Reward distribution идемпотентен.
```

## Phase 14 — Ads and analytics

Только после стабильного free loop и Stars:

- rewarded provider;
- server callback;
- caps;
- fraud flags;
- ad-free entitlement;
- revenue analytics.

Не показывать рекламу во время принятия решения.

## Phase 15 — Closed alpha

### Измерить

```text
activation
first scenario completion
D1/D7 retention
Academy→Exam
Exam→Arena
score trust
rematch completion
first purchase intent
refund rate
support issues
```

### Acceptance checklist

```text
[ ] 10–20 тестовых пользователей прошли сценарий.
[ ] Большинство понимает задачу без устной помощи.
[ ] Есть минимум один повторный визит.
[ ] Пользователь может объяснить score.
[ ] Нет критической утечки future.
[ ] Нет двойной выдачи товара.
```

## Phase 16 — Future readiness

Только после MVP:

```text
PlatformAdapter
PaymentProvider
ChainAdapter
WalletProvider
ShareProvider
```

Потенциальные ветки:

```text
BaseAdapter
MiniPayAdapter
StandaloneWebAdapter
SolanaMobileAdapter
```

Писать реализации заранее не нужно. Достаточно контрактов, capability system и общей identity model.

## Phase 17 — Token readiness review

Не запускать token work по календарю. Проверять gates:

```text
D30 retention
real paying users
stable Stars revenue
off-chain marketplace usage
anti-bot/anti-sybil
legal review
economy stress test
smart-contract audit budget
```

Если gates не пройдены, токен откладывается без изменения core game.

## Global release checklist

```text
[ ] contracts pass
[ ] typecheck pass
[ ] lint pass
[ ] unit tests pass
[ ] API integration tests pass
[ ] e2e smoke pass
[ ] migrations pass
[ ] content validation pass
[ ] locale validation pass
[ ] secrets scan pass
[ ] hidden future test pass
[ ] payment idempotency test pass
[ ] refund/revoke test pass
[ ] audit logs visible
[ ] feature flag rollback tested
[ ] backup restore tested
[ ] client error states tested
[ ] reduced-motion tested
[ ] privacy/public profile test pass
```

## Current status template

```text
Current phase:
Owner:
Completed:
In progress:
Blocked:
Next gate:
Risks:
Last validation:
```
