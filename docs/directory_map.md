# SIGNAL ARENA — Directory Map

## Root

```text
AGENTS.md                 AI-agent routing and architecture rules
CONTRIBUTING.md           Branches, commits, PRs and review comments
developing_status.md      Current phase and development sequence
README.md                 Main entry point for humans and AI agents
full_game_spec.md         Canonical game/product specification
monetization.txt          Canonical monetization specification
```

## Applications

```text
apps/game-client/         Phaser 4 game client
apps/api-server/          Fastify API and domain orchestration
apps/admin-crm/           Next.js administrative control plane
apps/landing/             Public landing and marketing pages
```

## Shared packages

```text
packages/contracts/       Zod schemas, DTOs and API contracts
packages/domain/          Pure business rules and scoring logic
packages/db/              Drizzle schema, migrations and repositories
packages/content/         Scenario/card/entity schemas and fixtures
packages/adapters/        Telegram, Stars, Ads, AI and future adapters
packages/analytics/       Event taxonomy and telemetry schemas
packages/config/          Environment and feature flags
packages/ui-game/         Shared Phaser/rexUI helpers
packages/ui-crm/          Shared CRM components
packages/agent-runtime/   AI tools, jobs, risk levels and policies
```

## Workers

```text
workers/payments/         Payment reconciliation and fulfillment jobs
workers/content/          Content validation and publishing jobs
workers/localization/     Translation and locale validation jobs
workers/analytics/        Aggregation and cohort jobs
workers/ai/               AI generation, evaluation and approval jobs
```

## Scripts

```text
scripts/validate-contracts/  Check shared DTOs and examples
scripts/validate-content/    Check scenario fairness and schemas
scripts/validate-locales/    Check missing/length/problematic translations
scripts/release-check/       Run release acceptance checks
scripts/smoke-test/          Run API/client/CRM smoke flow
scripts/secret-scan/         Detect leaked secrets
scripts/economy-simulation/  Simulate sources, sinks and rewards
```

## Documentation

```text
docs/architecture/        System design, adapters and deployment
docs/product/             Product decisions and UX
docs/monetization/        Stars, Founder Packs and unit economics
docs/ai/                  Agent policies and evaluation
docs/localization/        Locale workflow and glossary
docs/operations/          Runbooks, backups and incident response
docs/ADR/                Architecture Decision Records
```

## Dependency direction

```text
apps/game-client → contracts, content, analytics, ui-game, adapters
apps/api-server  → contracts, domain, db, content, adapters, analytics
apps/admin-crm   → contracts, ui-crm, analytics
apps/landing     → public contracts and public content
packages/domain  → no React, Phaser or app imports
packages/contracts → no database or UI imports
```

## Forbidden dependencies

```text
client → database
CRM browser → database
landing → private API
Phaser scene → Fastify internals
React CRM → Phaser state
AI job → unapproved payment/score mutation
```
