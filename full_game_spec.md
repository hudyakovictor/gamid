# SIGNAL ARENA — Full Game Design Specification v3.0

## 0. Product contract

Signal Arena — вертикальная Telegram Mini App для тренировки качества рыночных решений на исторических криптовалютных сценариях.

```text
Telegram Mini App
→ free learning loop
→ Academy / Exam / Arena / Rematch
→ tournaments and public profiles
→ optional Telegram Stars digital goods after gameplay value
→ optional future platform adapters
```

Игра работает без токена, кошелька и marketplace. Токен, on-chain features и другие платформы не входят в MVP, checkout, scoring или progression.

## 1. Stack

### Game client

- Phaser 4 — сцены, game loop, tweens, camera, particles, sound.
- TypeScript.
- Vite.
- rexUI — panels, tabs, lists, sliders, checklists inside Phaser scenes.
- Custom CandleChart on Phaser Graphics.
- Telegram SDK only through `TelegramAdapter`.

### Backend

- Fastify.
- TypeScript.
- Zod.
- Drizzle ORM.
- SQLite for early MVP.
- Repository interfaces ready for PostgreSQL.
- WebSockets for presence/realtime.
- Pino structured logs.
- Redis-ready queue/rate-limit abstraction.

### CRM

CRM is a separate application and does not use Phaser or rexUI.

- Next.js 15+ App Router.
- React.
- TypeScript.
- Tailwind CSS.
- shadcn/ui or Radix UI.
- TanStack Query.
- TanStack Table.
- React Hook Form + Zod.
- Recharts/ECharts.
- Playwright.
- Vitest.

CRM works only through Admin API.

## 2. Product boundaries

### Included

- Academy;
- controlled practice;
- Exam;
- Arena hub;
- rematch;
- Daily Fix Mission;
- scenarios;
- cards;
- entities;
- scoring;
- Decision Trace;
- progression;
- public profiles;
- cosmetics;
- Shop;
- Stars payments;
- Founder Support Packs;
- tournament schema and staged tournaments;
- localization;
- CRM control plane;
- AI low-risk jobs.

### Not included in MVP

- token contract;
- token sale;
- airdrop;
- NFT;
- on-chain ownership;
- real-money trading;
- gambling;
- DAO;
- bridges;
- multi-chain economy;
- creator payouts;
- marketplace;
- wallet or on-chain identity;
- play-to-earn;
- sale of correct answers;
- AI autonomous financial actions.

## 3. Primary navigation

```text
Арена | Академия | Магазин | Турниры
```

### Top Bar

```text
Avatar → Profile drawer
Verified Decision Level
Energy/attempts
Soft currency
Inbox
```

Profile, collection, insights and settings are accessed through avatar and result cards rather than occupying a permanent bottom tab.

### Arena as hub

Arena contains:

- Continue;
- Daily Fix Mission;
- Quick Arena Run;
- Rematch;
- Blind Scenario;
- Conflict Scenario;
- Post-Loss Protocol;
- Challenge Friend;
- last Personal Insight;
- upcoming Tournament card.

A separate `Trials` section is not required. These are modes inside Arena.

### Shop as primary section

Shop is visible from the first release because monetization and cosmetics require early backend validation.

```text
Featured
Founder Support
Practice Packs
Cosmetics
Premium
```

### Tournaments

Tournaments have a separate navigation slot because they are a core social/competitive promise. The feature may be displayed as staged/coming soon while the full engine is being implemented.

## 4. Core game loop

```text
historical situation
→ evidence groups
→ skill cards
→ hypothesis
→ plan
→ action and confidence
→ decision lock
→ historical future reveal
→ plan consequence
→ quality score
→ insight
→ rematch/progression
```

## 5. Scenario system

```text
scenarioId
version
scenarioLevel
mode
assetClass
assetId
marketSegment
timeframe
decisionPoint.t0
availableSourceGroups
availableSources
availableCards
activeProtocols
hiddenEntities
allowedActions
historicalFutureSegment
historicalOutcome
evaluationRules
contentVersion
dataVersion
futureHash
debrief
rematchLogic
locale
reviewStatus
```

Canonical Source Groups:

```text
PRICE
CONTEXT
FLOW
EVENT
PROJECT
```

Beginner scenarios use the minimum sufficient evidence and normally no more than three Source Groups. The complete ScenarioPackage is server-side; the client receives only a public projection before Seal.

Before decision, do not reveal future, exact date, recognizable identifiers, entity name or unique searchable metadata.

## 6. Modes

### Academy

Theory → worked example → controlled practice → debrief → Exam.

### Exam

Topic known, exact threat hidden.

### Arena

Mixed topics, hidden entities, multiple valid plans.

### Rematch

Delayed transfer in another asset, regime or timeframe.

### Tournament

Same scenario version, same data, same rubric and server-authoritative scoring.

Cards and Protocols are part of ScenarioPackage and may be used in Academy, Exam, Arena, Collection, Rematch, Series, Tournament and other historical scenarios. Loadout policy is mode-specific:

```text
Academy → Guided Loadout
Exam → Curated Loadout
Arena → Base / Personal Loadout
```

Canonical decisions:

```text
Long
Short
Wait
No Trade
```

Additional in-position actions may include `Hold Plan`, `Reduce Risk`, `Close Position`, `Move Protection`, `Wait for Confirmation`, `Do Not Average` and `Invalidate Idea`.

## 7. Cards and entities

Cards reveal, structure or protect decisions. They do not reveal answers, change outcome or grant score for clicks.

Entities are hidden causes of bad decisions, not combat monsters.

## 8. Score

Disclosed score dimensions:

```text
Decision Quality
Protocol Adherence
Evidence Quality
Follow-up Decision Quality
Risk Management
Invalidation
Discipline
Entity Resistance
Confidence Calibration
```

Quality score is in the range `0–100`. The detailed rubric may use contextual sub-rules, but PnL and direction guessing are never sufficient scoring criteria.

Invariants:

- Good process + bad market outcome can score high.
- Bad process + lucky outcome can score low.
- No Trade can score high.
- Purchases never change score, outcome, mastery or ranking.

## 9. Store and backend-first cosmetics

Cosmetics have value because they are visible in public profiles and tournaments.

### Item types

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

### Item fields

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

### Purchase flow

```text
catalog
→ preview
→ Stars order
→ Telegram payment confirmation
→ entitlement
→ inventory
→ equip
→ public profile/tournament rendering
```

The client never grants itself an item.

## 10. Stars monetization

Digital goods are purchased using Telegram Stars/XTR.

```text
create order
→ sendInvoice(XTR)
→ pre_checkout_query
→ successful_payment
→ idempotent fulfillment
→ entitlement
→ receipt
→ refund/revoke
```

Orders and entitlements are server-authoritative.

## 11. Founder Support Packs

Founder packs are limited digital bundles that support infrastructure and development.

```text
Supporter
  badge + profile cosmetic

Founder
  Supporter + scenario pack + fixed premium period

Founding Arena
  Founder + season access + premium cosmetic bundle
```

They never promise tokens, allocation, income, liquidity or investment rights.

## 12. Public profiles

Users may opt into a public profile visible from tournament leaderboards.

Public fields:

```text
display_name
avatar
verified_decision_level
frame
banner
founder_badge
premium_theme
selected_achievements
season_stats
```

Private fields remain hidden: payment history, weaknesses, Decision Trace, personal AI insights and Telegram identity. Wallets and on-chain identities are outside the MVP.

## 13. Tournament backend

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

Flow:

```text
registration
→ rules
→ scenario assignment
→ decision submission
→ server score
→ anti-cheat review
→ final leaderboard
→ entitlement rewards
```

Cosmetics are visible in profile cards but never affect ranking.

## 14. Localization

All UI and content uses versioned keys:

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

No hardcoded UI text in Phaser scenes, CRM components or API handlers.

Initial locales:

```text
ru-RU
→ en-US
→ uk-UA
→ es-ES
→ tr-TR
→ pt-BR
→ id-ID
```

AI translation is draft-only until validation and human review.

## 15. AI backend integration

AI can assist with:

- scenario drafts;
- localization drafts;
- debrief drafts;
- personal insight drafts;
- support triage;
- log analysis;
- CRM summaries;
- content quality checks;
- economy simulations.

AI may not autonomously change payments, score, rewards, prices, bans, rubrics or token flags.

Configuration:

```text
AI_PROVIDER=openai|anthropic|google|local
AI_API_KEY=secret
AI_MODEL_DEFAULT=...
AI_MODEL_FAST=...
AI_EMBEDDING_MODEL=...
AI_FEATURE_INSIGHTS=true
AI_FEATURE_TRANSLATION=true
```

## 16. CRM control plane

CRM controls:

- users;
- profiles;
- payments;
- refunds;
- catalog;
- entitlements;
- cosmetics;
- scenarios;
- rubrics;
- tournaments;
- localization;
- AI jobs;
- logs;
- moderation;
- feature flags;
- audit.

CRM uses separate Admin API, RBAC, audit logs and step-up confirmation for dangerous actions.

## 17. Feature flags

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

## 18. Architecture roadmap

### Implement now

- monorepo boundaries;
- Phaser client stack;
- Fastify API;
- CRM stack;
- contracts package;
- users/identities;
- catalog/orders/entitlements;
- Stars provider;
- Founder Pack flag;
- cosmetics model;
- public profile model;
- tournament schema;
- localization keys;
- audit and structured logs;
- CRM shell.

### Document but defer

- full tournament engine;
- squads;
- social graph;
- creator marketplace;
- Base/MiniPay adapters;
- TON Connect;
- on-chain ownership;
- token contract;
- AI autonomous actions;
- bridges.

## 19. Definition of Done

```text
[ ] Core game works without token.
[ ] Free loop works if payment service is unavailable.
[ ] Stars payment is idempotent.
[ ] Refund/revoke is supported.
[ ] Purchases create entitlements, not client mutations.
[ ] Cosmetics render in public profiles and tournament cards.
[ ] Public profile privacy works.
[ ] Tournament scoring is server-authoritative.
[ ] AI jobs are auditable and permissioned.
[ ] Localization has fallback and versioning.
[ ] CRM actions are RBAC-protected and audited.
[ ] Feature flags can rollback risky features.
[ ] Future platform integration requires adapters only.
```