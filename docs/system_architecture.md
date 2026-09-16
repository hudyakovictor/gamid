# SIGNAL ARENA — System Architecture

Status: REQUIRED
Scope: target technical architecture and deployment boundaries
Owner: Signal Arena project owner
Last reviewed: 2026-09-16
Supersedes: none
Required evidence: architecture review, security review, deployment rehearsal, observability and recovery evidence
Canonical dependencies: `security_architecture.md`, `deployment_and_environments.md`, `observability_and_incident_response.md`, `../packages/contracts/src/scenario.ts`

This document defines the required target architecture. It does not confirm that every control is implemented. Actual status is recorded only in `developing_status.md` and gate/evidence records.

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
  providers/
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

## 2. Runtime topology

Signal Arena uses two application surfaces with a private data plane:

```text
Public web surface
  landing + static game client
  CDN/WAF/TLS
  no database or secret credentials

Private application surface
  API service
  workers
  separate admin service with private access policy

Private data plane
  PostgreSQL
  Redis and queues
  object storage
  backups and observability
```

The public web surface can be deployed independently from the private application surface. The API and admin service may share a host in an early environment, but they remain separate processes, origins, runtime identities, authorization policies, and deployable units. The database is never publicly routable.

## 3. Environment portability

Local development uses SQLite and fixtures for fast feedback. Staging and production use PostgreSQL-ready repositories, private configuration, migrations, backups, and the same immutable application artifact. Environment-specific values are injected at runtime; production data and secrets never enter local or preview environments.

The API is stateless between requests. Scenario truth, run state, score, balances, entitlements, and audit events live in authoritative stores. Redis and workers provide coordination and asynchronous work, not a second source of truth. The first Telegram alpha may use Vercel for the public edge, but Vercel is not the authoritative database or worker runtime; see `vercel_alpha_and_platform_strategy.md`.

## 4. Security and observability boundaries

Production system must validate every request and response through shared contracts, enforce authentication and authorization, apply timeouts and shared rate limits, and emit structured logs with request/trace IDs. The client never calls databases or external providers. Admin mutations require separate access control and append-only audit events. Current implementation status is recorded in `developing_status.md`. See `security_architecture.md`, `deployment_and_environments.md`, `performance_and_scaling.md`, and `observability_and_incident_response.md`.

## 5. Game client stack

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

## 6. CRM stack

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

## 7. API server stack

- Fastify.
- TypeScript.
- Zod.
- Drizzle ORM.
- SQLite для локальной разработки и раннего MVP.
- `PersistencePort` repository boundary with `SqlitePersistenceAdapter` and `PostgresPersistenceAdapter` implementations.
- Explicit `DB_DRIVER` selection; no silent SQLite fallback when PostgreSQL is configured.
- `/health` liveness and `/ready` dependency/schema readiness endpoints; graceful pool/database shutdown.
- WebSockets для presence/realtime.
- Redis-ready abstraction для rate limits, queues and jobs.
- Pino structured logging.
- OpenTelemetry-ready tracing.

## 8. Landing stack

- Next.js.
- TypeScript.
- Tailwind CSS.
- Static generation where possible.
- Direct links to Telegram Mini App.
- No direct database access.

## 9. Domain boundaries

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
roadmap
release-control
blockers
evidence
```

Each module contains domain types, commands, queries, schemas, repositories, services, handlers and tests. The target architecture requires roadmap, gate, blocker, evidence, dependency and release-control records to become authoritative operational data exposed to Admin CRM through Admin API. Current implementation status is recorded separately in `developing_status.md` and gate/evidence records. See `roadmap_and_release_control_plane.md`.

## 10. Public profiles and cosmetics

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
price_coins
price_usd_reference
optional_direct_stars_price
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

## 11. Store

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
→ Coins spend authorization
→ ledger mutation
→ entitlement
→ inventory
→ equip
→ public profile/tournament render

Coin Pack acquisition uses the Telegram Stars confirmation flow. Direct Stars entitlement is an exceptional, separately approved path only.
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

## 12. Tournaments

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

## 13. Localization

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

## 14. AI integration

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

Agent jobs are isolated, asynchronous, typed, budgeted, and deny-by-default. They receive fixtures, redacted snapshots, or approved aggregates rather than unrestricted database access. See `ai_agent_operations_architecture.md` for agent roles, data classes, tool permissions, approval gates, and marketing guardrails.

### High-risk actions requiring approval

- score changes;
- reward changes;
- refunds;
- bans;
- price changes;
- scenario publication;
- token/on-chain activation.

## 15. Observability

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

## 16. Feature flags

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

## 17. MVP and deferred work

### Implement now

- monorepo directories;
- Phaser 4 + TypeScript + Vite + rexUI client;
- Fastify API;
- Drizzle schema;
- Telegram auth;
- Telegram Stars Coin Pack orders and server-authoritative entitlements;
- store shell;
- Founder Pack feature flag;
- cosmetics item model;
- public profile schema;
- tournament database schema;
- typed contracts;
- localization keys;
- production structured logs and audit controls (required; current status is tracked separately).

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

## 18. Deployment

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
