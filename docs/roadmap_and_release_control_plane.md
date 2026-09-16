# Signal Arena — Internal Roadmap and Release Control Plane

Status: PLANNED
Scope: roadmap, gates, blockers, evidence and release control
Owner: Signal Arena project owner
Last reviewed: 2026-09-16
Supersedes: none
Required evidence: roadmap domain contract, gate/evidence ingestion, blocker calculation, Admin API and CRM evidence
Canonical dependencies: `developing_status.md`, `acceptance_matrix.md`, `system_architecture.md`, `security_architecture.md`

## Purpose

The internal roadmap is the operational source of truth for moving Signal Arena between development stages. It connects roadmap items, dependencies, acceptance gates, evidence, blockers, releases, CI, agents, and the Admin CRM.

Markdown documents remain human-readable architecture and policy. They must not become a second mutable status database. Runtime status is stored in the roadmap domain and exposed through the Admin API.

## Status model

Roadmap items, gates, releases, and blockers use explicit statuses:

```text
PLANNED
IN_PROGRESS
BLOCKED
READY_FOR_REVIEW
ACCEPTED
REJECTED
DEFERRED
```

Implementation status and roadmap workflow status are separate.

Implementation/document status vocabulary:

```text
REQUIRED
PLANNED
IMPLEMENTED_LOCAL
ACCEPTED_LOCAL
PRODUCTION_READY
BLOCKED
DEPRECATED
```

Roadmap workflow statuses below (`PLANNED`, `IN_PROGRESS`, `READY_FOR_REVIEW`, `ACCEPTED`, `REJECTED`, `DEFERRED`) describe operational transitions and must not be interpreted as production acceptance. A roadmap item is `PRODUCTION_READY` only when all required gates and evidence pass and human approval is recorded.

A status change records:

```text
actor
reason
previousStatus
nextStatus
requestId
traceId
commitSha
createdAt
```

Agents may create drafts, evidence, findings, and proposed transitions. Only an authorized human or an explicitly approved release automation may mark a required gate or stage `ACCEPTED`.

## Roadmap hierarchy

```text
Roadmap
  → Stage
      → Workstream
          → Roadmap Item
              → Acceptance Gate
                  → Evidence
              → Dependency
              → Blocker
              → Release Check
```

### Initial stages

```text
foundation
technical-alpha
commercial-alpha
vertical-slice
production-readiness
multiplatform
scale-and-operations
agent-operations
```

Stage order is data, not a hardcoded UI assumption. A stage can have parallel workstreams, but a later stage cannot be accepted while its required predecessors or release gates remain unresolved.

### Initial workstreams

```text
contracts
identity-and-auth
scenario-content
historical-providers
scoring
client
persistence
security
observability
deployment
admin-crm
economy
payments
referrals
multiplatform
ai-agents
marketing-and-analytics
assets
accessibility
performance
```

## Gate types

```text
CONTRACT
UNIT_TEST
INTEGRATION_TEST
CONTRACT_TEST
E2E
TYPECHECK
LINT
BUILD
MIGRATION
SEED_REPLAY
FUTURE_LEAK
DETERMINISTIC_REPLAY
SCORING_GOLDEN_FIXTURE
SECURITY_SCAN
AUTHORIZATION
PROVENANCE
MANUAL_QA
VISUAL_QA
RESPONSIVE_QA
ACCESSIBILITY_QA
REDUCED_MOTION_QA
PERFORMANCE
LOAD_TEST
BACKUP_RESTORE
OBSERVABILITY
HUMAN_APPROVAL
LEGAL_REVIEW
PAYMENT_RECONCILIATION
```

Each gate defines:

```text
gateId
stageId
workstream
name
type
severity
required
ownerRole
automationCommand or check
acceptanceCriteria
requiredEvidenceTypes
expiresAt, if applicable
status
```

A gate is not accepted because a command ran. The command must produce valid evidence for the correct commit, environment, fixture version, and contract version.

## Blocker model

A blocker is a first-class record, not a comment in a document.

```text
blockerId
severity: P0 | P1 | P2
source: manual | ci | test | security | provenance | dependency | incident | provider
stageId
workstream
roadmapItemId
gateId, if applicable
title
description
reproduction
impact
requiredAction
ownerRole
status
createdAt
resolvedAt
resolutionEvidenceId
```

Blocker status:

```text
OPEN
ACKNOWLEDGED
MITIGATING
READY_TO_VERIFY
RESOLVED
WONT_FIX_WITH_APPROVAL
```

Automatic blocker rules include:

- required gate failed;
- required evidence missing or expired;
- dependency is not accepted;
- typecheck, lint, build, contract, E2E, migration, or replay check failed;
- future/hidden Entity leak detected;
- client-authoritative score, balance, outcome, or entitlement detected;
- authentication or admin authorization check failed;
- asset provenance or license is incomplete;
- backup/restore drill failed;
- security scan reports a release-blocking finding;
- usage, latency, queue, or error budget exceeds the stage threshold;
- a provider or payment smoke test is not verified;
- a human approval is missing.

A blocker can be resolved only after its resolution evidence is attached and the relevant gate is rerun. Closing a blocker does not automatically accept a stage.

## Stage readiness calculation

The backend computes readiness; the UI only displays it.

```text
stageReady =
  all required predecessor stages accepted
  AND all required roadmap items accepted
  AND all required gates accepted
  AND no open P0 blockers
  AND no open P1 blockers for the stage
  AND current evidence is valid
  AND required human approvals exist
```

A stage may be `READY_FOR_REVIEW` when all automated checks pass but the human release review is incomplete. Only after review can it become `ACCEPTED`.

The readiness calculation returns reasons, not only a boolean:

```json
{
  "stageId": "commercial-alpha",
  "ready": false,
  "blockingReasons": [
    {
      "kind": "missing_gate",
      "gateId": "commercial-alpha-backup-restore"
    },
    {
      "kind": "open_blocker",
      "blockerId": "blocker-auth-production"
    }
  ]
}
```

## Evidence model

Evidence is immutable and content-addressed:

```text
evidenceId
type
command
result: PASS | FAIL | NOT_RUN
artifactUri
contentHash
commitSha
environment
contractVersion
fixtureVersion
startedAt
finishedAt
actorType: human | ci | agent | provider
redactionStatus
```

Examples:

```text
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm validate:contracts
pnpm validate:content
future-leak replay
scoring golden fixture run
backup/restore drill
manual admin MFA review
asset provenance review
load test report
```

Evidence must not contain secrets, raw tokens, full payment payloads, hidden future data, or unnecessary personal data. Large artifacts live in private object storage; the database stores metadata and hashes.

## Dependencies

Dependencies are explicit records:

```text
roadmapItemId
requiresItemId
kind: HARD | SOFT | INFORMATIONAL
reason
status
```

Rules:

- `HARD` dependencies block readiness;
- `SOFT` dependencies generate a warning and require an owner decision;
- `INFORMATIONAL` dependencies provide navigation only;
- circular hard dependencies are rejected by validation;
- a dependency points to a stable item ID, not a filename or branch name.

## Admin API contract

The future Admin API exposes read and controlled mutation operations:

```text
GET  /api/v1/admin/roadmap
GET  /api/v1/admin/roadmap/stages
GET  /api/v1/admin/roadmap/stages/:stageId
GET  /api/v1/admin/roadmap/items/:itemId
GET  /api/v1/admin/roadmap/blockers
GET  /api/v1/admin/roadmap/gates/:gateId/evidence
GET  /api/v1/admin/roadmap/dependency-graph
GET  /api/v1/admin/roadmap/releases/:releaseId/readiness

POST /api/v1/admin/roadmap/items/:itemId/status
POST /api/v1/admin/roadmap/blockers/:blockerId/acknowledge
POST /api/v1/admin/roadmap/blockers/:blockerId/resolve
POST /api/v1/admin/roadmap/gates/:gateId/evidence
POST /api/v1/admin/roadmap/releases/:releaseId/review
POST /api/v1/admin/roadmap/stages/:stageId/accept
```

All endpoints require:

- Admin API authentication;
- server-side RBAC;
- request and response contract validation;
- idempotency for mutations;
- reason for status changes and blocker resolution;
- append-only audit event;
- optimistic concurrency or version check;
- generic public errors with internal `errorCode`;
- no direct browser-to-database access.

An agent may submit evidence or a proposed transition through a separate job endpoint, but cannot call stage acceptance directly.

## CRM screens

The Admin CRM should expose:

```text
Roadmap Overview
  → stage readiness
  → current blockers
  → dependency warnings
  → release calendar

Stage Detail
  → workstreams
  → items
  → gate status
  → evidence
  → owners

Blocker Inbox
  → severity
  → age
  → owner
  → reproduction
  → next action
  → verification action

Dependency Graph
  → hard/soft edges
  → critical path
  → circular dependency warnings

Evidence Explorer
  → commit
  → environment
  → command
  → artifact
  → hash
  → expiry

Release Review
  → generated readiness report
  → unresolved blockers
  → approvals
  → rollback plan
  → final decision

Agent Operations
  → proposed work
  → evidence
  → tool calls
  → budget
  → approvals
  → policy denials
```

The dashboard must show why a stage is blocked, not merely display a red badge.

## CI and runtime integration

```text
CI command
  → evidence artifact
  → evidence ingestion
  → gate evaluation
  → blocker creation or update
  → readiness recalculation
  → Admin notification
```

Runtime signals also create findings:

```text
observability alert
  → incident or blocker
  → affected stage/workstream
  → owner assignment
  → mitigation
  → verification evidence
```

Deployment must call the release readiness endpoint and fail closed when a release-blocking gate is missing or a P0/P1 blocker is open.

The roadmap system does not replace incident management. Availability, security, fairness, payment, and data incidents retain their incident workflow and are linked to roadmap remediation items.

## Notifications

Notifications are generated from state changes, not polling alone:

- new P0/P1 blocker;
- blocker owner overdue;
- failed required gate;
- evidence expiring;
- dependency accepted or rejected;
- stage becomes ready for review;
- release readiness changes;
- agent policy denial or budget threshold;
- production incident linked to a stage.

Delivery channels may include CRM inbox, email, Telegram owner notification, and an incident channel. Notification content contains IDs and safe summaries, not secrets or hidden scenario data.

## Implementation sequence

1. Define roadmap, gate, blocker, dependency, evidence, and release contracts in `packages/contracts`.
2. Add database tables and indexes in `packages/db`.
3. Add repositories and readiness calculation in `packages/domain`.
4. Add evidence ingestion for CI commands and validation scripts.
5. Add automatic blocker rules and idempotent upserts.
6. Add Admin API read endpoints.
7. Add controlled mutation endpoints and audit events.
8. Add CRM Roadmap, Blockers, Gates, Evidence, and Release Review screens.
9. Add CI status callbacks and deployment fail-closed check.
10. Link agent proposals and approvals to roadmap items.
11. Add notifications, escalation, and overdue policies.
12. Run a whole-system audit with a real release candidate.

## Acceptance gates

- [ ] roadmap has one canonical owner and stable item IDs;
- [ ] Markdown is not used as a mutable status source;
- [ ] hard dependencies and cycles are validated;
- [ ] required gates are versioned and machine-readable;
- [ ] evidence is immutable, hashed, redacted, and linked to commit/environment;
- [ ] failed checks create idempotent blockers;
- [ ] stage readiness explains every blocking reason;
- [ ] P0/P1 blockers cannot be hidden by UI filters;
- [ ] Admin mutations are authenticated, authorized, idempotent, and audited;
- [ ] agents cannot accept stages or resolve blockers without human verification;
- [ ] deployment fails closed on release-blocking state;
- [ ] backups, restore, future-leak, scoring replay, security and provenance gates are represented;
- [ ] CRM shows the same state as the Admin API;
- [ ] release evidence can be exported for review;
- [ ] roadmap migration has tests and a rollback plan.
