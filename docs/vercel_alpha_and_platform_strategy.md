# Signal Arena — Vercel Alpha and Platform Strategy

## Status

This is the deployment decision for the first Telegram Mini App alpha and the migration plan toward paid production. It is an architecture contract, not a claim that every environment is already provisioned.

## Decision summary

```text
Vercel
  → public landing
  → static game client
  → optional stateless edge/BFF endpoints

Private application runtime
  → Fastify API
  → Admin API
  → workers
  → provider adapters
  → AI jobs

Private data plane
  → PostgreSQL
  → Redis/queue when needed
  → object storage
  → backups
```

The game domain, contracts, repositories, migrations, identity model, and ScenarioPackage format remain provider-neutral. A platform migration must change deployment configuration and adapters, not scoring or player data semantics.

## Vercel Hobby and Pro

The current official Vercel documentation describes Hobby as a free plan for personal, non-commercial use. It is suitable for local development, previews, and a closed technical alpha without commercial monetization. It must not be treated as the production plan for Stars, ads, paid packs, or commercial marketing.

The current Vercel documentation describes Pro as a paid plan with a monthly team/user charge and usage-based limits. The exact price, included credits, limits, taxes, and payment eligibility must be verified in the account before activation. A non-Russian payment method may work, but the billing identity, address, payment instrument, and legal account owner must be truthful and consistent.

Official references checked on 2026-09-14:

- [Vercel pricing](https://vercel.com/pricing)
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
- [Vercel Pro billing](https://vercel.com/docs/plans/pro-plan/billing)
- [Vercel Functions limits](https://vercel.com/docs/functions/limitations)
- [Vercel Terms of Service](https://vercel.com/legal/terms)

### Current constraints relevant to Signal Arena

- Vercel Functions are request-oriented and must remain stateless between requests.
- Vercel filesystem storage is not authoritative persistence.
- Local SQLite and `better-sqlite3` must not be used as production database storage on Vercel.
- Background ingestion, queue consumers, AI jobs, and long-running provider work run outside the public request path.
- High-frequency ingestion cannot depend on Hobby cron scheduling.
- Function duration, memory, invocations, bandwidth, and region limits are plan-dependent and can change.
- External PostgreSQL, Redis, object storage, and AI providers have separate pricing and availability.

## Alpha deployment profiles

### Profile A — technical alpha with minimal spend

```text
Vercel Hobby
  → landing + static client

Render Free, local tunnel, or temporary test runtime
  → non-critical API fixtures

Local or disposable PostgreSQL
  → test data only

No payments
No ads
No production personal data
No commercial campaign
```

This profile is for internal testers and product validation. Free services may sleep, reset, expire, or have limited logs. No user should be promised data durability.

### Profile B — small commercial alpha

```text
Vercel Pro
  → landing + static client

Render paid, Cloud Run, or small VPS
  → Fastify API
  → Admin API
  → one worker

Managed PostgreSQL
  → authoritative state

Object storage
  → assets and exports

External error monitoring
  → errors and deployment alerts
```

This profile is acceptable for a small user group only after authentication, backups, security headers, server-authoritative scoring, and restore testing pass.

### Profile C — first stable production

```text
Public edge
  → Vercel or Cloudflare CDN/WAF
  → landing + game client

Private application runtime
  → API replicas
  → Admin service
  → provider workers
  → AI workers

Private data plane
  → managed PostgreSQL
  → Redis/queue
  → object storage
  → backup and observability providers
```

The public and private surfaces may be hosted by different vendors. This is the preferred two-surface model.

## Provider alternatives

| Provider | Best use | Advantages | Limitations | Recommendation |
|---|---|---|---|---|
| Vercel | landing and client | excellent static delivery and preview workflow | not a durable database or worker platform; Hobby is non-commercial | keep as public edge |
| Render | first API/backend | direct Fastify/Docker support, services, workers, PostgreSQL and private services | free services sleep; paid usage required for reliable production | preferred first paid backend |
| Cloud Run | container production | runs the existing container, scales per request, supports jobs and schedulers | billing account and cloud configuration required | preferred growth path |
| Railway | early backend experiments | simple deployment and usage-based billing | free allowance is small; cost controls are required | acceptable for prototypes |
| Hetzner Cloud | low-cost Docker/VPS production | predictable VM cost, full control, private networking | founder owns patching, backups, monitoring and security | budget fallback with ops discipline |
| Cloudflare Workers | edge APIs and CDN | useful free edge tier, global delivery, queues and storage products | requires runtime/data-layer adaptation from Fastify/PostgreSQL | use for edge, not first core backend |
| AWS | large-scale production | broadest managed services and compliance options | highest operational and billing complexity | later, when traffic or compliance justifies it |
| Russian cloud provider | payment-compatible fallback | local billing and support may be easier | global latency, provider features and cross-border access require testing | use only with Docker and exportable data |

Provider availability, pricing, taxes, sanctions compliance, and payment acceptance must be checked for the actual account. Never use false billing details, borrowed payment instruments, or location spoofing.

## Deployment portability contract

Every deployable service must be reproducible from:

```text
repository commit
→ lockfile
→ Dockerfile or verified build command
→ environment schema
→ database migrations
→ seed/fixture version
→ health/readiness contract
→ rollback artifact
```

The application must not rely on:

- provider-specific local filesystem state;
- in-memory balances or sessions;
- implicit cron execution;
- a single server process;
- provider-specific database extensions in core domain rules;
- hardcoded public URLs;
- provider credentials in the client bundle.

## Environment progression

```text
local
  → preview
  → technical alpha
  → paid alpha
  → staging
  → canary production
  → full production
```

Each environment has separate:

- database;
- object storage bucket;
- secrets;
- Telegram configuration;
- provider credentials;
- AI keys and budgets;
- logs and observability destinations;
- feature flags.

Production data is never copied into local, preview, or AI-agent environments.

## Migration triggers

Move from Vercel-only or free services when any of these occur:

- commercial monetization is enabled;
- production personal data is stored;
- free service sleep affects player experience;
- p95 latency or cold-start delay violates the product budget;
- API needs a persistent worker or queue;
- database storage or connection limits become visible;
- provider ingestion must run more often than the free schedule allows;
- backup/restore requirements cannot be met;
- usage approaches 70% of a plan limit;
- an external provider outage has no graceful degradation path.

Scale based on measured latency, saturation, queue age, error budget, storage, and recovery time—not on invented user-count promises.

## Cost-control rules

- Set provider spend alerts before enabling paid usage.
- Use separate billing projects for preview, staging, and production.
- Keep AI calls asynchronous and budgeted per job.
- Disable ads, payments, and expensive provider ingestion in technical alpha.
- Use cache/CDN for immutable public ScenarioPackage projections and assets.
- Keep authoritative state in PostgreSQL, not a paid platform's ephemeral filesystem.
- Export database backups and object metadata regularly.
- Test a provider migration before the project depends on a vendor-specific feature.

## Acceptance gates

Before commercial alpha:

- [ ] payment account and terms are verified for the actual legal owner;
- [ ] API is not dependent on SQLite or local filesystem;
- [ ] PostgreSQL migrations and backups pass;
- [ ] authentication and session revocation pass;
- [ ] public/hidden projections pass future-leak tests;
- [ ] server-authoritative score and deterministic replay pass;
- [ ] CSP, CORS, rate limits, timeouts, and security headers pass;
- [ ] admin access is separated and audited;
- [ ] error codes, request IDs, logs, and alerts are available;
- [ ] rollback and restore are tested;
- [ ] usage alerts and spend limits are enabled;
- [ ] assets pass provenance gates.
