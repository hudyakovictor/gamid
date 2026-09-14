# Signal Arena — 150-Pass GitHub Gap Audit

Date: 2026-09-14
Repository: hudyakovictor/ssarena
Branch: master

## Scope

This audit performed 150 additional gap-analysis passes across:

- repository and process;
- architecture and contracts;
- client and UX;
- scenario content and historical data;
- learning and progression;
- economy, monetization, and growth;
- QA, security, and accessibility;
- assets, motion, and performance.

Inputs included repository structure, recent commits, open issues, documentation inventory, and the current project contracts. An absence finding means an item was not visible in the inspected repository inventory; it is not proof that the item cannot exist in another branch, submodule, or repository.

## Executive status

```text
BLOCKED for implementation acceptance
```

The documentation and project contract are substantially more complete, but the inspected repository still appears primarily documentation-oriented. A real implementation scaffold, executable CI, API contracts, migrations, scenario pipeline, and test harness were not visible in the inspected inventory.

## P0 findings

### F-001 — Implementation tree is not visible

**Evidence:** the inspected root is dominated by Markdown files, archives, images, and documentation. No client/server/package manifests were visible in the root inventory.

**Impact:** agents cannot safely build, run, test, or integrate the product from the current repository state.

**Required action:** explicitly decide whether `ssarena` is documentation-only or the implementation repository. If it is the implementation repository, create the scaffold:

```text
package.json
src/
client/
server/
data/
tests/
migrations/
.github/workflows/
```

If implementation lives elsewhere, update `docs/repository_migration_map.md` and the Documentation Hub with the authoritative repository.

### F-002 — Executable CI gates are not visible

**Evidence:** no `.github/workflows` or test/build artifacts were visible in the inspected inventory.

**Impact:** `ACCEPTED` cannot be independently verified.

**Required action:** add CI for install, typecheck, lint, unit, integration, E2E, build, secret scanning, dependency audit, accessibility, and artifact reports.

## P1 findings

### F-003 — Canonical document versioning is not formalized

Recent commits add substantial document packages while legacy documents remain present. Without ownership and supersession metadata, contradictory versions can emerge.

**Action:** add document metadata:

```text
status
owner
version
last_reviewed
supersedes
superseded_by
```

Add a link and invariant checker.

### F-004 — AGENTS contract is not visibly enforced by automation

`AGENTS.md` is a project convention, but no preflight or CI check was visible to prove required project files and invariants are present.

**Action:** add a preflight command that validates required files, document links, canonical Entity names, and task report format.

### F-005 — No machine-readable API contract was visible

The documentation describes request/response behavior, but no versioned OpenAPI or JSON Schema artifact appeared in the inspected docs inventory.

**Impact:** client and backend can drift.

**Action:** add `contracts/openapi.yaml` or versioned JSON Schemas, generated TypeScript types, and contract tests.

### F-006 — Database migrations and seed are not visible

Migrations, repository interfaces, and seed are specified conceptually, but no executable migration directory appeared in the inspected inventory.

**Action:** add schema, migrations, seed fixtures, rollback tests, duplicate mutation tests, and a documented local DB command.

### F-007 — Visual lab is specified but not visible as executable code

The visual system and motion specifications exist, but no fixture-driven visual lab, screenshot matrix, or visual regression harness appeared.

**Action:** implement visual lab with fixtures for normal, loading, error, locked, sealed, resolving, result, and insufficient-currency states across desktop, mobile portrait, and mobile landscape.

### F-008 — ScenarioPackage pipeline is not visible as executable code

Scenario authoring is extensively documented, but schema files, validators, importers, public projections, hidden projections, and replay fixtures were not visible in the inspected inventory.

**Action:** implement versioned schema, validator, importer, rollback, public/hidden projection, and deterministic reveal tests.

### F-009 — Historical provider adapters are not visible

The provider plan exists, but no provider interface, Binance adapter, snapshot storage, provenance registry, or recorded fixtures appeared.

**Action:** implement API-01 through API-03: provider interfaces, free MVP market-data adapter, immutable snapshots, hashes, replay, and source provenance.

### F-010 — Learning compression ladder is not connected to executable content

Theory Module, Worked Example, Skill Card, Card Header, Recall, Debrief, and Rematch are documented, but no content registry linking those IDs to scenarios was visible.

**Action:** create a learning content schema and validator linking curriculum, Cards, Protocols, Entities, scenarios, debrief templates, and delayed rematches.

### F-011 — Economy simulation is not executable ledger validation

Pip simulation documents exist, but no ledger implementation, reconciliation output, or earn/spend integration tests were visible.

**Action:** implement server-authoritative ledger, idempotency, caps, sinks, reconciliation, and economy test fixtures.

### F-012 — Asset provenance policy has no visible registry or validator

The workflow exists, but no `assets/registry.json`, license validator, or release check appeared.

**Action:** add registry, stable asset IDs, provenance validation, placeholder blocking, and unknown-license release failure.

### F-013 — Security and secret scanning workflow is not visible

**Action:** add secret scanning, dependency audit, environment validation, log redaction tests, and provider-key protection.

### F-014 — Accessibility harness is not visible

**Action:** add automated axe/Playwright checks, keyboard/focus tests, screen-reader labels, reduced-motion tests, and manual accessibility matrix.

### F-015 — Performance budget enforcement is not visible

**Action:** add mobile performance smoke, Lighthouse or equivalent checks, asset size budgets, chart/render budget, and celebration-effect limits.

## What is already covered conceptually

The repository already contains strong specifications for:

- unified English Entity naming;
- learning-science architecture;
- historical point-in-time scenarios;
- economy and referral guardrails;
- motion and interaction behavior;
- asset provenance policy;
- iteration Definition of Done;
- periodic integration audit.

The gap is mainly executable implementation, automation, and evidence—not another layer of planning prose.

## Audit limitation

This is a repository-inventory audit. It did not execute the application because an executable implementation tree and runtime commands were not visible in the inspected repository metadata.
