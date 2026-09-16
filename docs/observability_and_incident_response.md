# Signal Arena Observability and Incident Response

Status: REQUIRED
Scope: logs, metrics, traces, audit, alerts and incidents
Owner: Signal Arena project owner
Last reviewed: 2026-09-16
Supersedes: none
Required evidence: instrumentation, alert delivery, incident drill, retention and redaction checks
Canonical dependencies: `system_architecture.md`, `security_architecture.md`, `deployment_and_environments.md`

## Status

The current foundation does not yet ship production logging. This document defines the contract so logging and alerting can be added without changing API semantics later.

## Structured logs

API, workers, admin service, and migration jobs emit JSON logs with:

```text
timestamp
level
service
environment
buildId
requestId
traceId
route
method
statusCode
durationMs
errorCode
retryable
actorType
```

Optional domain fields use stable IDs only:

```text
scenarioId
scenarioVersion
runId
jobId
provider
migrationId
idempotencyKeyHash
```

Never log raw cookies, access tokens, Telegram initialization data, payment secrets, full decision text, hidden Entity names before reveal, future payloads, or personal data unless an approved incident workflow requires a redacted sample.

## Error model

Every public error has:

- stable machine-readable `errorCode`;
- safe user-facing message;
- request ID for support;
- HTTP status mapped to the error class.

Internal logs retain the cause chain, dependency, retryability, and sanitized stack. Error causes must identify the failing boundary, not only say `unknown error`.

Example:

```json
{
  "errorCode": "scenario_package_not_found",
  "statusCode": 404,
  "retryable": false,
  "requestId": "req_...",
  "scenarioId": "foundation-false-breakout-001"
}
```

## Metrics

Minimum metrics:

- request count, latency, and errors by route/status;
- public scenario cache hit/miss;
- scenario run start/seal/reveal success and conflict counts;
- idempotency replay and conflict counts;
- future-leak and authorization denials;
- DB pool usage, query latency, lock waits, and migration status;
- Redis/queue depth, age, retries, dead letters;
- provider latency, freshness, rate-limit responses, and circuit state;
- score calculation failures and deterministic replay mismatches;
- asset manifest and provenance validation failures.

Metrics labels must be bounded. Never use raw user IDs or arbitrary URLs as metric labels.

## Tracing

Use request ID for support and trace ID for distributed flow. Propagate trace context from edge to API, repository, worker, and provider adapter. Sampling may be reduced for successful high-volume reads but increased for errors, retries, security denials, and state transitions.

## Audit events

Audit events are append-only and separate from debug logs. They are required for:

- admin login and authorization changes;
- scenario publication, revision, and withdrawal;
- run seal/reveal override;
- score recalculation;
- balance, entitlement, refund, and reward mutations;
- feature flag changes;
- emergency access;
- migration and restore operations.

Each event records actor, action, target, reason, request ID, result, and timestamp without storing hidden future payloads unnecessarily.

## Alerts

Page on-call for:

- elevated 5xx or timeout rate;
- readiness failures or crash loops;
- database saturation, lock storms, or failed migrations;
- queue age/dead-letter growth;
- provider circuit open beyond the allowed window;
- duplicate reward/idempotency anomaly;
- future/hidden projection denial spike or confirmed leak;
- score replay mismatch;
- authentication or admin authorization anomaly;
- backup or restore failure.

Non-urgent warnings go to a review channel with runbook links and deduplication.

## Incident workflow

```text
alert
→ triage with request/trace ID
→ classify security, data, availability, fairness, payment, or content
→ contain with feature flag, rate limit, circuit breaker, or rollback
→ preserve evidence and audit trail
→ repair and replay safely
→ verify with regression tests
→ communicate impact
→ post-incident review and documented prevention
```

Security and fairness incidents are handled as priority incidents even when availability is unaffected.

## Retention and access

Logs, traces, metrics, and audit events have explicit retention and access roles. Production observability data is not copied into local development. Sensitive fields are redacted at emission, not only in dashboards.
