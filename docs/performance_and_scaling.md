# Signal Arena Performance and Scaling

## Scaling principles

Start with the smallest reliable system, but preserve boundaries that allow horizontal scaling:

- stateless API instances behind a load balancer;
- authoritative state in PostgreSQL, not process memory;
- Redis for rate limits, short-lived coordination, and queue support;
- workers for provider ingestion, content jobs, analytics, payments, and notifications;
- object storage and CDN for assets and large snapshots;
- repositories and contracts that do not depend on a single process.

SQLite remains useful for local development and fixtures. Production should move to PostgreSQL before multi-instance traffic is enabled.

## Request path budgets

Every external request has:

- maximum body and response size;
- connect, read, and total timeout;
- bounded retries with exponential backoff;
- circuit breaker for unavailable providers;
- cancellation when the client request ends;
- request ID carried through downstream calls.

Do not hold a database transaction while waiting on an external provider.

## Database protection

- use bounded connection pools;
- index scenario/version, run/user/time, idempotency, review status, and audit query paths;
- use pagination with stable cursors for large lists;
- avoid unbounded JSON scans in hot paths;
- keep transactions short;
- use optimistic or explicit state transitions for sealed runs;
- measure slow queries and lock waits;
- partition or archive high-volume analytics and audit data when measurements justify it;
- reserve capacity for migrations and backups.

## Backpressure

When a dependency is slow or unavailable:

1. reject or defer non-critical work;
2. keep player mutations idempotent;
3. enqueue provider and analytics work;
4. cap queue depth and retry count;
5. expose degraded state rather than inventing data;
6. preserve scenario truth and score authority.

Never bypass a failed provider by exposing future data, client-calculated score, or unverified content.

## Caching

Safe to cache:

- immutable public ScenarioPackage projections by scenario/version/content version;
- static client assets;
- approved catalog and public cosmetic metadata with explicit invalidation.

Do not cache as authoritative:

- hidden future;
- user balance;
- entitlements;
- current run state;
- score result;
- admin permissions.

Cache keys include contract/content/data version where relevant. Cache invalidation is explicit on publication or revocation.

## Worker and provider capacity

Provider ingestion is separated from player request latency:

```text
provider schedule
  → adapter
  → normalized snapshot
  → provenance and hash
  → validation
  → storage
  → ScenarioPackage publication
```

Use per-provider rate limits, concurrency caps, retry budgets, dead-letter handling, and freshness checks. A provider outage must not block already published historical scenarios.

## Load test stages

Before production scale claims:

- baseline API latency and error rate;
- concurrent public scenario reads;
- concurrent start/seal idempotency retries;
- reveal authorization and state transition contention;
- database connection exhaustion;
- Redis/queue degradation;
- provider timeout and retry storm;
- deploy and rollback during active runs;
- backup/restore under realistic data volume.

Acceptance uses measured p95/p99, error budget, saturation point, and recovery time. Do not use an invented capacity number before load tests exist.

## Cost and simplicity guardrails

Do not add microservices, sharding, event sourcing, or multi-region writes before a measured bottleneck and an operational owner exist. Keep clear module boundaries inside the monorepo so a later split is possible without duplicating contracts.
