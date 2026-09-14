# Signal Arena Security Architecture

## Purpose

This document defines the security baseline for the public web surface, game API, admin control plane, data stores, workers, and release process. It is an implementation contract, not a claim that every control is already deployed.

## Trust boundaries

```text
Player browser / Telegram WebView
  → public web edge: landing and static game client only
  → private application edge: API and admin services
  → private data plane: PostgreSQL, Redis, object storage, queues
  → external providers through allowlisted backend adapters
```

The client never connects directly to a database, Redis, queue, or external provider. The client is not authoritative for score, hidden future, outcome, Pips, Stars, inventory, entitlements, ranking, or admin permissions.

## Deployment boundary

The product uses two logical application surfaces:

1. **Public web surface** — landing and static game assets. It contains no secrets and has no database credentials.
2. **Private application surface** — API, workers, and a separately deployed admin application/service. The admin surface uses a separate origin and access policy even if it initially shares a host or cluster with the API.

The database and queues remain private. A public reverse proxy must never route arbitrary paths to the admin service.

## Browser and XSS controls

Required before production:

- strict Content Security Policy with nonces or hashes for scripts;
- `frame-ancestors` restriction and clickjacking protection;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Permissions-Policy` limited to required capabilities;
- HTTPS everywhere with HSTS after verified rollout;
- no untrusted HTML injection; render user/content copy as text by default;
- sanitize only when rich text is explicitly required, using an allowlist;
- Trusted Types where browser support and framework integration allow it;
- dependency and secret scanning in CI;
- no secrets in client bundles, source maps, localStorage, or query strings.

CSP violations should be reported to observability without collecting sensitive page data.

## Identity and sessions

Foundation requirements now implemented locally: Telegram identity verification, replay rejection, hashed HttpOnly sessions, logout/revocation, cookie-mutation CSRF checks, bounded request body, exact CORS allowlist, baseline security headers, request IDs, and an in-memory rate-limit fallback for development only.

Production requirements still open:

- verify Telegram identity data server-side;
- reject expired and replayed initialization data;
- rotate and revoke sessions;
- use short-lived access sessions and server-side revocation state;
- prefer `HttpOnly`, `Secure`, `SameSite` cookies for browser sessions;
- use CSRF protection for cookie-authenticated mutations;
- never treat a client-provided user ID as identity;
- require step-up authentication and MFA/identity-aware proxy for admin actions.

The current foundation user is a development fixture only and must not be exposed as production authentication.

## API security

Every endpoint must have:

- Zod request and response validation;
- explicit authentication and authorization policy;
- bounded body, query, pagination, and upload sizes;
- shared Redis-compatible rate limits by identity and IP with trusted proxy configuration; the current in-memory fallback is not accepted for production or multi-instance traffic;
- request timeout and downstream timeout;
- CSRF protection for cookie-authenticated mutations;
- exact CORS allowlist, never wildcard credentials; the API rejects undeclared Origins;
- generic public error responses with internal error codes in logs;
- parameterized database access through repositories;
- idempotency for retryable mutations;
- audit events for security-sensitive mutations.

Do not log tokens, cookies, Telegram initialization data, passwords, payment payloads, full decisions, or hidden future data.

## Admin security

Admin UI and Admin API are separate from player routes:

- separate origin and service account;
- default-deny RBAC;
- least privilege roles for content, support, finance, and operations;
- MFA or identity-aware private access;
- confirmation and reason for destructive actions;
- immutable audit event for every mutation;
- no direct browser-to-database access;
- no admin secrets in the public game bundle;
- emergency access is time-bounded and audited.

## External providers and SSRF

Provider adapters use an allowlist of hosts and protocols. User-controlled URLs are never fetched directly. Adapters enforce:

- HTTPS;
- DNS/IP validation against private-network access;
- connect, read, and total timeouts;
- response size limits;
- schema validation;
- content hash and provenance recording;
- retries with exponential backoff and a circuit breaker.

## Data protection

- PostgreSQL and Redis are private-network services in production;
- encryption in transit and at rest is required where the provider supports it;
- production secrets come from a secret manager, not repository files;
- backups are encrypted and restore-tested;
- retention and deletion rules are defined for identity, decisions, audit, and analytics data;
- public profiles are opt-in and exclude private weaknesses, raw decisions, and hidden scenario data.

## Release gates

A release is blocked by:

- failing dependency or secret scan;
- missing CSP/security headers;
- unauthenticated admin mutation;
- client-authoritative score, balance, or outcome;
- future/hidden Entity leak;
- unbounded endpoint or provider request;
- missing audit event for a sensitive mutation;
- untested rollback or restore path.
