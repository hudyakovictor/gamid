# Signal Arena Deployment and Environments

## Environment model

```text
local development
  → CI checks
  → preview environment
  → staging
  → production
```

Each environment has separate credentials, database, storage bucket, provider keys, Telegram configuration, logs, and feature flags. Production data must never be copied into local or preview environments.

## Local development

The local stack should be reproducible from a clean checkout:

- `pnpm install --frozen-lockfile`;
- local SQLite for the current foundation;
- Docker Compose for optional PostgreSQL, Redis, and object-storage emulators;
- `.env.example` contains names and safe examples only;
- secrets are supplied through the shell, a local secret manager, or ignored files;
- migrations and seed are explicit commands;
- provider adapters default to fixtures or disabled mode;
- local admin access uses development-only identity and cannot reach production data.

Local SQLite is a development convenience, not the production persistence target.

## Vercel alpha profile

Vercel is the preferred public edge for the first Telegram Mini App alpha when the account and payment terms are valid for the project owner. Vercel hosts the landing page and static client. The authoritative Fastify API, PostgreSQL, workers, and AI jobs remain separate services unless the API is explicitly adapted to stateless Functions.

The free Hobby plan is limited to personal, non-commercial use according to the current Vercel documentation. It may be used for previews and a closed technical alpha without payments, ads, or commercial campaigns. Commercial gameplay, Telegram Stars, paid packs, advertising, and revenue-focused marketing require an eligible paid plan or another compliant provider.

Do not place SQLite, balances, sessions, queues, scenario truth, hidden future, or uploaded files on Vercel's ephemeral runtime. Use external PostgreSQL, object storage, and an asynchronous worker runtime. Vercel Function duration, memory, invocation, region, and cron limits are plan-dependent and must be checked before each release.

The first paid deployment may use:

```text
Vercel Pro
  → landing + static client

Render paid, Cloud Run, or Docker VPS
  → Fastify API
  → Admin API
  → workers

Managed PostgreSQL
  → authoritative data

Redis/queue and object storage
  → only when required
```

See `vercel_alpha_and_platform_strategy.md` for provider comparison, cost controls, migration triggers, and official references.

## Two-surface production topology

### Public web surface

Runs landing and static game client assets behind CDN, TLS, WAF, and a reverse proxy. It has no database credentials, payment secrets, provider credentials, or admin routes.

### Private application surface

Runs the API, workers, and the admin application as separate processes or containers. The API and admin service may share a private host initially, but they must have separate routes, authorization middleware, runtime identities, logs, and deployable units. Admin access is restricted by identity-aware proxy, VPN, or equivalent private access control.

### Private data surface

Contains PostgreSQL, Redis, queue workers, encrypted object storage, backups, and monitoring integrations. It is not publicly routable.

```text
Internet
  → CDN/WAF
      ├── landing + static client
      └── API public ingress
            └── private API service
                  ├── PostgreSQL
                  ├── Redis / queue
                  ├── provider adapters
                  └── workers

Admin identity-aware proxy
  → private admin service
        → Admin API only
```

## Configuration

Configuration is read at startup and validated before the process accepts traffic. Required configuration is explicit per environment:

- environment name;
- public origins and CORS allowlist;
- database URL and pool limits;
- Redis/queue endpoint;
- provider allowlist and timeout policy;
- Telegram and payment configuration;
- logging, metrics, and tracing destinations;
- feature flags and kill switches.

The application fails closed on missing production configuration. It must not silently fall back to local fixtures, in-memory storage, debug auth, or permissive CORS.

## Database and migrations

- migrations are forward-only and reviewed;
- production migrations run as a separate release step with backup/rollback notes;
- application startup does not silently mutate production schema;
- migration lock prevents concurrent runners;
- seed is never run against production unless the command is explicitly production-safe;
- restore drills are performed before accepting a release that changes persistence;
- repositories remain PostgreSQL-ready even while local SQLite is used.

## Release flow

```text
commit
  → CI: typecheck, lint, tests, contracts, content, assets, build, security scan
  → immutable artifact
  → preview
  → staging migration and smoke tests
  → staging E2E and manual gates
  → production migration approval
  → rolling or blue/green deploy
  → health/readiness checks
  → canary observation
  → full rollout or rollback
```

Client and API compatibility is maintained during rolling deploys. Contract changes are additive first; removals require a deprecation window.

## Provider migration and rollback

Every service must be portable through a container or reproducible build, environment schema, migration set, health contract, and exportable data. A migration rehearsal is required before moving from an alpha provider to paid production. The rollback plan must include:

- previous immutable application artifact;
- database backup and restore point;
- DNS or edge rollback;
- feature-flag kill switches;
- provider credential rotation;
- verification of public/hidden projection safety;
- incident record with request and trace IDs.

## Health and shutdown

Every service exposes:

- liveness: process is running;
- readiness: dependencies and migrations are usable;
- version/build metadata without secrets;
- graceful shutdown that stops intake, drains work, and closes DB/queue connections.

Readiness must fail when the service cannot safely serve authoritative requests.

## Operational portability

Deployment must be reproducible from:

- repository commit;
- lockfile;
- migration set;
- environment configuration schema;
- immutable container or build artifact;
- seed/fixture version where applicable.

No production-only manual file edits are allowed. Local-to-server promotion uses the same build and migration process with different validated configuration.
