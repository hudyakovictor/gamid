# SIGNAL ARENA — System Architecture v4

## 1. Monorepo structure

```text
apps/
  game-client/
  landing/
  api-server/
  admin-crm/

packages/
  domain/
  contracts/
  db/
  content/
  adapters/
  analytics/
  config/
  ui-game/
  ui-crm/
  agent-runtime/

workers/
  payments/
  content/
  localization/
  analytics/
  ai/

infra/
  docker/
  migrations/
  monitoring/
  backups/

scripts/
  validate-scenarios/
  validate-locales/
  economy-simulation/
  release-check/
```

Client, API, CRM and landing are отдельными приложениями. Общие типы и бизнес-контракты находятся в `packages/`, а не копируются между приложениями.

## 2. Game client stack

### Core

- Phaser 4 — игровые сцены, game loop, tweens, camera, particles, sound.
- TypeScript — типизация игрового ядра.
- Vite — сборка, dev server и production bundle.
- rexUI — панели, вкладки, списки, слайдеры и чек-листы внутри Phaser-сцен.
- Custom CandleChart на Phaser Graphics — график остаётся частью игрового кадра.

### Client responsibilities

- render game state;
- collect user input;
- play animations and sound;
- display catalog, profiles and public cosmetics;
- call API through typed contracts;
- cache safe non-authoritative data;
- send analytics events.

### Client must not own

- final score;
- hidden future;
- payment fulfillment;
- entitlement granting;
- currency balance authority;
- tournament final result;
- admin permissions.

### Game client structure

```text
apps/game-client/src/
  app/
  scenes/
  ui/
  workspace/
  chart/
  cards/
  entities/
  tournaments/
  profile/
  shop/
  animation/
  audio/
  platform/
  api/
  state/
  analytics/
  localization/
```

Telegram SDK используется только через `platform/TelegramAdapter`.

## 3. CRM stack

CRM не использует Phaser и rexUI.

- Next.js 15+ App Router.
- React.
- TypeScript.
- Tailwind CSS.
- shadcn/ui или Radix UI.
- TanStack Query.
- TanStack Table.
- React Hook Form + Zod.
- Recharts или ECharts.
- Playwright.
- Vitest.

Подробнее: `crm_stack_spec.md`.

## 4. API server stack

- Fastify.
- TypeScript.
- Zod.
- Drizzle ORM.
- SQLite для раннего MVP.
- PostgreSQL-ready repository interfaces.
- WebSockets для presence/realtime.
- Redis-ready abstraction для rate limits, queues and jobs.
- Pino structured logging.
- OpenTelemetry-ready tracing.

## 5. Landing stack

- Next.js.
- TypeScript.
- Tailwind CSS.
- Static generation where possible.
- Direct links to Telegram Mini App.
- No direct database access.

## 6. Domain boundaries

```text
identity
users
profiles
public-profiles
scenarios
scenario-runs
decisions
scoring
progression
skills
cards
entities
insights
catalog
orders
payments
refunds
entitlements
inventory
ads
referrals
tournaments
leaderboards
localization
experiments
notifications
moderation
ai-jobs
admin
audit
```

Each module contains domain types, commands, queries, schemas, repositories, services, handlers and tests.

## 7. Public profiles and cosmetics

Cosmetics require backend support from the beginning because they become valuable when visible in tournament leaderboards and public profiles.

### Items

```text
avatar_frame
profile_banner
profile_theme
profile_badge
nameplate
card_skin
decision_seal
victory_stamp
tournament_emote
seasonal_effect
founder_mark
```

### Item model

```text
item_id
sku
item_type
rarity
asset_manifest_id
preview_asset_url
price_xtr
price_usd_reference
supply_limit
availability_start
availability_end
is_tradeable
is_publicly_visible
required_feature_flag
localization_key
status
```

### Entitlement and equipment

```text
entitlements
inventory_items
equipped_items
```

Equipment changes presentation only. It cannot affect score, ranking, risk, evidence, scenario or mastery.

## 8. Store

Store is a primary navigation destination in MVP.

```text
Featured
Founder Support
Practice Packs
Cosmetics
Premium
```

Backend-first flow:

```text
catalog
→ preview
→ order
→ Telegram Stars confirmation
→ entitlement
→ inventory
→ equip
→ public profile/tournament render
```

Endpoints:

```text
GET /api/v1/catalog
GET /api/v1/catalog/:sku
POST /api/v1/orders
GET /api/v1/me/inventory
PUT /api/v1/me/equipment/:slot
POST /api/v1/payments/telegram-stars/webhook
POST /api/v1/orders/:id/refund
```

## 9. Tournaments

Tournament backend is designed early, but the full UI and matchmaking can be feature-flagged.

```text
tournaments
tournament_seasons
tournament_rules
tournament_scenarios
tournament_entries
tournament_runs
tournament_submissions
tournament_leaderboards
tournament_rewards
tournament_audit
```

Leaderboard profile click opens public profile drawer with equipped cosmetics and selected achievements.

## 10. Localization

All UI and content are key-based.

```text
translation_key
locale
value
status
context
max_length
content_version
updated_by
reviewed_by
```

No hardcoded UI text inside Phaser scenes, CRM components or API error handlers.

Initial locale order:

```text
ru-RU
→ en-US
→ uk-UA
→ es-ES
→ tr-TR
→ pt-BR
→ id-ID
```

AI translation is draft-only until reviewed.

## 11. AI integration

### AI provider

```ts
interface AIProvider {
  generate(input: AIGenerateInput): Promise<AIGenerateResult>;
  embed(input: AIEmbedInput): Promise<AIEmbedResult>;
  moderate(input: AIModerationInput): Promise<AIModerationResult>;
}
```

### Configuration

```text
AI_PROVIDER=openai|anthropic|google|local
AI_API_KEY=secret
AI_MODEL_DEFAULT=...
AI_MODEL_FAST=...
AI_EMBEDDING_MODEL=...
AI_FEATURE_INSIGHTS=true
AI_FEATURE_TRANSLATION=true
```

### Low-risk jobs

- translations drafts;
- content summaries;
- CRM summaries;
- log clustering;
- support classification;
- insight drafts.

### High-risk actions requiring approval

- score changes;
- reward changes;
- refunds;
- bans;
- price changes;
- scenario publication;
- token/on-chain activation.

## 12. Observability

Structured logs:

```text
timestamp
level
service
environment
request_id
trace_id
user_id_hash
route
event_name
error_code
latency_ms
metadata
```

Core events:

```text
scenario.started
source.opened
card.applied
decision.submitted
score.completed
catalog.viewed
order.created
payment.confirmed
entitlement.granted
refund.received
tournament.joined
tournament.submitted
profile.viewed
item.equipped
ai.job.created
ai.job.approved
```

## 13. Feature flags

```text
FEATURE_SHOP
FEATURE_FOUNDER_PACK
FEATURE_PREMIUM
FEATURE_ADS_REWARDED
FEATURE_TOURNAMENTS
FEATURE_PUBLIC_PROFILES
FEATURE_AI_INSIGHTS
FEATURE_AI_TRANSLATION
FEATURE_TON_CONNECT
FEATURE_TOKEN_ROADMAP_BANNER
```

## 14. MVP and deferred work

### Implement now

- monorepo directories;
- Phaser 4 + TypeScript + Vite + rexUI client;
- Fastify API;
- Drizzle schema;
- Telegram auth;
- Stars orders and entitlements;
- store shell;
- Founder Pack feature flag;
- cosmetics item model;
- public profile schema;
- tournament database schema;
- typed contracts;
- localization keys;
- structured logs and audit.

### Document now, implement later

- full tournament engine;
- public social graph;
- squads;
- creator marketplace;
- Base/MiniPay adapters;
- TON Connect;
- on-chain ownership;
- token contract;
- AI auto-balance;
- AI auto-ban;
- multi-chain bridges.

## 15. Deployment

Early:

```text
landing service
api service
admin service
static assets
single database
worker process
```

Later:

```text
landing.example.com
app.example.com
api.example.com
admin.example.com
worker.internal.example.com
```

The deployment may start on a single VPS, but application boundaries remain separate from day one.
