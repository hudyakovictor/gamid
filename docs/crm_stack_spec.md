# SIGNAL ARENA — CRM Stack Specification

## 1. Назначение

CRM — отдельное административное приложение для управления backend, контентом, платежами, пользователями, турнирами, локализацией, AI-задачами и операционными процессами.

CRM не является частью Phaser-клиента и не импортирует игровые сцены, rexUI или Telegram Mini App SDK.

## 2. Рекомендуемый стек CRM

### Frontend

- Next.js 15+ с App Router.
- TypeScript.
- React.
- Tailwind CSS.
- shadcn/ui или Radix UI.
- TanStack Query для server state.
- TanStack Table для таблиц.
- React Hook Form + Zod для форм.
- Recharts или ECharts для dashboards.
- Playwright для end-to-end тестов.
- Vitest для unit-тестов.

### Backend access

CRM работает только через отдельный Admin API.

```text
CRM Browser
→ Admin API
→ application services
→ repositories
→ database
```

Прямое подключение браузера к базе запрещено.

## 3. Admin API

```text
GET /api/v1/admin/dashboard
GET /api/v1/admin/users
GET /api/v1/admin/orders
GET /api/v1/admin/refunds
GET /api/v1/admin/catalog
GET /api/v1/admin/entitlements
GET /api/v1/admin/scenarios
GET /api/v1/admin/tournaments
GET /api/v1/admin/locales
GET /api/v1/admin/ai-jobs
GET /api/v1/admin/logs
GET /api/v1/admin/audit
```

Изменения:

```text
POST /api/v1/admin/catalog/:id/publish
POST /api/v1/admin/catalog/:id/archive
POST /api/v1/admin/orders/:id/refund
POST /api/v1/admin/users/:id/restrict
POST /api/v1/admin/users/:id/unrestrict
POST /api/v1/admin/scenarios/:id/review
POST /api/v1/admin/locales/:id/publish
POST /api/v1/admin/ai-jobs/:id/approve
```

Каждый mutation endpoint обязан писать audit event.

## 4. CRM разделы

### Dashboard

- DAU/MAU;
- retention;
- scenario completion;
- payer conversion;
- Stars revenue;
- refunds;
- ad revenue;
- infrastructure health;
- pending AI jobs;
- alerts.

### Users

- поиск;
- профиль;
- identities;
- sessions;
- entitlements;
- purchases;
- flags;
- support history;
- moderation actions;
- private/public profile settings.

### Payments

- orders;
- payment events;
- successful payments;
- refunds;
- chargebacks;
- reconciliation;
- failed fulfillment;
- manual review.

### Catalog

- SKU;
- price in Stars;
- reference USD;
- availability;
- inventory limit;
- Founder Packs;
- cosmetics;
- scenario packs;
- subscriptions;
- feature flags.

### Content

- scenarios;
- source groups;
- cards;
- entities;
- rubrics;
- difficulty;
- point-in-time validation;
- review state;
- version history.

### Tournaments

- seasons;
- rules;
- scenario sets;
- registration;
- submissions;
- leaderboard;
- anti-cheat review;
- rewards.

### Localization

- missing keys;
- translation status;
- AI drafts;
- glossary;
- length warnings;
- reviewer queue;
- publish versions.

### AI operations

- job queue;
- prompts;
- models;
- outputs;
- validation;
- approvals;
- tool calls;
- costs;
- failures.

### Logs and audit

- structured logs;
- errors;
- traces;
- admin actions;
- payment actions;
- content changes;
- feature flag changes;
- AI decisions.

## 5. Roles

```text
OWNER
ADMIN
CONTENT_EDITOR
LOCALIZATION_REVIEWER
SUPPORT_AGENT
FINANCE_OPERATOR
MODERATOR
ANALYST
AI_OPERATOR
```

Принцип минимальных прав:

- SUPPORT_AGENT не меняет цены;
- CONTENT_EDITOR не делает refund;
- LOCALIZATION_REVIEWER не публикует токен-фичи;
- AI_OPERATOR не может самостоятельно выдавать валюту;
- FINANCE_OPERATOR не меняет scoring rubric.

## 6. Dangerous actions

Требуют step-up confirmation и audit:

- refund;
- revoke entitlement;
- ban/restrict;
- изменение цены;
- изменение Founder Pack supply;
- публикация сценария;
- изменение scoring rubric;
- изменение reward rate;
- включение tournament;
- включение on-chain feature;
- включение token roadmap CTA.

Для особо опасных действий использовать двухэтапное подтверждение.

## 7. CRM UI principles

- desktop-first;
- responsive tablet layout;
- dense tables with clear filters;
- command palette;
- keyboard shortcuts;
- saved views;
- bulk actions only with preview;
- destructive actions require explicit confirmation;
- every entity has history tab;
- every AI suggestion displays source, prompt version and approval status.

## 8. CRM data contracts

CRM использует общие Zod schemas из `packages/contracts`.

Нельзя создавать отдельные несовместимые типы для клиента и CRM.

## 9. Deployment

```text
admin.example.com → CRM frontend
api.example.com/admin → Admin API
```

Frontend CRM может быть развернут на Vercel/Cloudflare Pages, API — отдельно на VPS/container platform.

## 10. MVP CRM

Сразу реализовать:

- admin auth;
- dashboard basics;
- users;
- orders/payments/refunds;
- catalog;
- entitlements;
- feature flags;
- logs;
- audit;
- basic scenarios;
- localization queue.

Позже:

- full tournament moderation;
- creator marketplace;
- AI operations center;
- economy simulator;
- advanced cohort analytics;
- multi-platform operations.
