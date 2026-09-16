# Signal Arena — AI Agent Operations Architecture

Status: PLANNED
Scope: isolated agent roles, data boundaries, approvals and AI operations
Owner: Signal Arena project owner
Last reviewed: 2026-09-16
Supersedes: none
Required evidence: agent manifest, policy checks, approval, audit, idempotency and rollback evidence
Canonical dependencies: `system_architecture.md`, `security_architecture.md`, `crm_stack_spec.md`, `roadmap_and_release_control_plane.md`

## Status

This document defines the planned AI-assisted operating model for a solo founder or a very small team. It does not authorize autonomous production changes. Agents are bounded workers that produce drafts, evidence, tests, analyses, and proposals; humans remain accountable for high-impact decisions.

## Goals

The agent system should:

- remove repetitive work without weakening product judgment;
- keep each agent inside a narrow domain;
- prevent access to secrets and unrelated data;
- make every proposal reproducible and reviewable;
- preserve canonical Entity, ScenarioPackage, scoring, economy, and security rules;
- support Telegram first and later platform adapters without duplicating operations;
- give one founder an understandable virtual IT department.

## Non-negotiable boundary

No agent may autonomously:

- publish a scenario or reveal hidden future data;
- change scoring dimensions, rubrics, ranking, or risk rules;
- grant Coins, entitlements, refunds, or payment status;
- change authentication, authorization, secrets, or security policy;
- ban users or delete personal data;
- deploy directly to production;
- change database schema in production;
- spend marketing budget or publish financial/product claims;
- activate wallet, chain, token, or payment features;
- bypass a human approval gate.

## Target topology

```text
Founder / reviewer
  → CRM approval queue
  → Agent orchestrator
  → isolated job sandbox
  → typed tools with allowlist
  → proposal + evidence + hashes
  → validation and policy checks
  → human approval
  → domain service or deployment pipeline
```

Agents never receive unrestricted database credentials. They work from immutable task snapshots, read-only views, fixtures, or approved APIs. Production mutations happen through domain services that enforce the same contracts used by the game API.

## Agent registry

| Agent | Primary scope | Default data | Allowed output | Human gate |
|---|---|---|---|---|
| Content Agent | Theory Modules, Worked Examples, Cards, Protocol copy | canonical docs, approved source snapshots, fixtures | draft content and links | content editor publishes |
| Scenario Research Agent | historical sources and provenance | provider snapshots and source registry | normalized source proposal | researcher validates point-in-time truth |
| Scenario QA Agent | schema, t0, future-leak, hidden Entity checks | ScenarioPackage fixtures | validation report and failing cases | content editor resolves failures |
| Balance Agent | scoring, progression, economy and difficulty simulations | synthetic fixtures and anonymized aggregates | simulation report and change proposal | game designer approves |
| Analytics Agent | funnels, retention, transfer, calibration, errors | aggregated metrics | dashboard notes and hypotheses | founder approves experiments |
| Marketing Agent | acquisition, activation, conversion and experiment design | aggregate campaign/funnel data | copy drafts, experiment proposals, budget hypotheses | founder approves claims and spend |
| Localization Agent | translations and terminology consistency | locale files and glossary | draft translations | human reviewer publishes |
| QA/Security Agent | tests, dependency scans, threat-model checks | source tree, fixtures, scan output | test patches and findings | developer/security reviewer merges |
| Release Agent | CI, deployment and rollback evidence | build metadata and non-secret telemetry | release checklist and rollback proposal | founder approves release |
| Support Agent | support classification and reply drafts | redacted tickets and public help docs | draft response and routing | human sends sensitive replies |
| Observability Agent | error clustering and incident summaries | redacted logs, traces and metrics | incident hypothesis and runbook link | operator declares/ closes incident |
| Platform Agent | Telegram/Base/other adapter planning | public contracts and capability matrices | adapter proposal and compatibility report | architect approves platform launch |

Agent names describe responsibilities, not new product entities. They do not become player-facing categories.

## Agent manifest

Every agent is registered with a versioned manifest:

```text
agentId
ownerRole
purpose
allowedTools
deniedTools
allowedDataClasses
networkAllowlist
modelProvider
modelId
promptVersion
policyVersion
maxTokensPerJob
costBudgetPerPeriod
rateLimit
timeout
outputSchema
requiredApprover
retentionPolicy
```

A job is rejected if the manifest, tool, data class, or approval policy is missing. Agent identity is separate from a human user identity and has its own audit trail.

## Data classification

```text
PUBLIC
  published docs, public assets, public scenario projection

INTERNAL
  source registry metadata, aggregate analytics, test fixtures

SENSITIVE
  user support data, private analytics, payment metadata, moderation records

SECRET
  API keys, cookies, tokens, signing keys, database credentials

HIDDEN_SCENARIO
  future segment, hidden Entity, evaluation rules before reveal
```

Default agent access:

- PUBLIC: allowed when relevant;
- INTERNAL: read-only and task-scoped;
- SENSITIVE: redacted, aggregated, or explicitly approved;
- SECRET: never passed to model context;
- HIDDEN_SCENARIO: unavailable to marketing, support, localization, and general-purpose agents; only restricted content/validation jobs may access it in a sealed sandbox.

Agent logs store hashes and stable IDs, not raw secrets, full decisions, hidden future, or unnecessary personal data.

## Human-only actions

The founder or an explicitly authorized human must perform:

- production deployment and rollback;
- secrets and domains;
- identity and session policy;
- database migrations and restore;
- scenario publication and historical truth approval;
- scoring/rubric/economy changes;
- refunds, bans, reward corrections and data deletion;
- payment and platform activation;
- marketing budget and public claims;
- model/provider policy changes;
- approval of agent manifests and tool permissions.

For a solo founder, two-person approval can be replaced by step-up authentication, a mandatory reason, delayed execution, automatic rollback window, and an immutable audit event. High-risk actions must never become one-click autonomous operations.

## Operating workflows

### Content workflow

```text
brief
→ Content Agent draft
→ canonical terminology check
→ Entity/Card/Protocol validation
→ human content review
→ Scenario QA Agent
→ point-in-time review
→ human publication
```

The Content Agent must preserve exact English canonical Entity names and may not invent Enemy/Boss categories.

### Scenario workflow

```text
provider snapshot
→ Research Agent normalization
→ provenance/hash record
→ validator
→ hidden/public projection test
→ human historical review
→ import
→ staged publication
```

No agent may send future data to the client or publish a scenario whose source availability at t0 is unverified.

### Balance workflow

```text
hypothesis
→ Balance Agent simulation
→ golden fixture comparison
→ fairness and calibration checks
→ human game-design review
→ staged release
→ monitored rollback window
```

The Balance Agent cannot optimize for lucky PnL, compulsive sessions, pay-to-win, or score manipulation. Coins, XP, Energy, and Mastery Stars remain non-authoritative for score, outcome, ranking, risk, and matchmaking.

### Marketing workflow

The Marketing Agent may analyze aggregate:

```text
acquisition source
activation
first scenario completion
rematch usage
D1/D7/D30 retention
transfer and delayed retention
confidence calibration
conversion
refund rate
support complaints
cost per activated user
```

It may propose:

- landing copy variants;
- onboarding experiments;
- content sequencing hypotheses;
- channel comparisons;
- non-deceptive conversion improvements;
- budget scenarios.

It may not:

- use private weaknesses for targeting;
- claim guaranteed profit or professional status;
- sell correct answers or score advantages;
- launch paid campaigns without approval;
- change score, risk, progression, or outcomes to improve conversion;
- create dark patterns or pressure loops;
- publish claims without evidence and legal review where required.

Every experiment has an experiment ID, hypothesis, primary metric, guardrails, duration, sample rule, owner, and rollback rule.

### Platform expansion workflow

```text
platform demand evidence
→ Platform Agent capability report
→ identity/payment/security review
→ adapter implementation
→ compatibility tests
→ human launch decision
```

Base, MiniPay, Solana, and other platforms use the same `User`, `Identity`, profile, scenario, scoring, and analytics domains. Platform adapters change authentication, capabilities, sharing, payment, and wallet proof—not the game truth.

## Runtime isolation

Development stages:

```text
local agent jobs
  → fixtures and redacted exports only

staging agent jobs
  → staging database and synthetic or approved data

production proposals
  → read-only telemetry and approved aggregates

production mutations
  → domain service + human approval + audit event
```

Each job has:

- timeout;
- retry limit;
- token/cost budget;
- network allowlist;
- output size limit;
- idempotency key;
- trace ID;
- prompt/model/policy versions;
- cancellation path;
- dead-letter handling.

AI jobs run asynchronously. They do not block scenario start, seal, reveal, score, payments, or authentication.

## Observability and audit

Record for every job:

```text
jobId
agentId
requestId
traceId
inputSnapshotHash
promptVersion
policyVersion
modelProvider
modelId
toolCalls
outputHash
validationResult
approvalActor
costEstimate
actualUsage
status
```

Do not record raw secrets, full payment payloads, hidden future, or unredacted personal data. Agent failures, policy denials, tool calls, approvals, and production mutations are separately auditable.

Required alerts:

- budget threshold exceeded;
- repeated policy denial;
- tool/network allowlist violation;
- unexpected data-class access;
- prompt injection indicator;
- output schema failure;
- score/content regression;
- duplicate mutation or idempotency conflict;
- agent error spike;
- provider outage.

## Implementation sequence

1. Define `agent-runtime` contracts and manifests.
2. Add data-class labels and redaction utilities.
3. Add read-only task snapshots and fixture exports.
4. Add job queue abstraction with local synchronous adapter.
5. Add proposal and approval records.
6. Add Content, Scenario QA, Balance and Analytics agents.
7. Add CRM approval views and audit events.
8. Add Marketing, Localization, Support and Release agents.
9. Add model/provider routing and cost budgets.
10. Add security evaluation, prompt-injection tests and incident runbooks.
11. Enable only low-risk jobs in production.
12. Review every new mutation capability explicitly.

## Acceptance gates

- [ ] every agent has a manifest and owner;
- [ ] tools are deny-by-default;
- [ ] production secrets never enter model context;
- [ ] hidden future is inaccessible to general agents;
- [ ] agent jobs are idempotent and cancellable;
- [ ] outputs use typed schemas;
- [ ] human approvals are required for high-impact actions;
- [ ] every tool call and approval is auditable;
- [ ] marketing uses aggregate data and experiment guardrails;
- [ ] agent budget and rate limits are enforced;
- [ ] prompt injection and data-exfiltration tests pass;
- [ ] rollback exists for every enabled mutation;
- [ ] no agent can change score, outcome, ranking, risk, or Coins/XP/Energy/Mastery advantage.
