Signal Arena Agent Contract
This file is mandatory project context for every coding, content, design, asset, QA, integration, and documentation task in this repository.

1. Required startup order
Before changing files:

Read this AGENTS.md.
Read docs/README.md.
Declare the task role: foundation, backend, frontend, content-data, integration, review, design, or documentation.
Read the task prompt and identify the exact acceptance criteria.
Select the relevant archive game-development sub-skill.
Read only the relevant Signal Arena documents.
List scope, owned files, forbidden files, dependencies, tests, source requirements, and acceptance gates.
Record the starting commit SHA and branch name in the completion report.
Stop and ask for clarification if canonical documents or frozen contracts conflict.
Do not ingest every document for every task. Use the smallest relevant context, but never skip this contract or the documentation hub.

2. Autonomous execution policy
Work autonomously through all tasks that can be completed without a human.

When a task requires manual QA, visual approval, external credentials, owner input, or another unavailable dependency:

Complete every safe and automatically verifiable part.
Run all available mandatory checks.
Record the exact blocking condition and required human action.
Mark the task NEEDS_QA or BLOCKED; never mark it complete.
Commit the task atomically.
Continue with the next independent task.
Stop only when no independent task can progress safely.
Autonomy does not authorize broadening scope, changing product rules, weakening tests, bypassing security controls, or modifying another agent's owned area.

3. One-agent, one-PR rule
An Arena agent normally receives one implementation attempt and creates one PR.

Therefore:

keep commits atomic and grouped by task;
do not mix unrelated work in one commit;
do not include cleanup outside the approved scope unless it is required for correctness;
do not assume the same agent will be available for follow-up fixes;
leave exact evidence and known limitations for the next review or integration agent;
never merge another candidate's implementation into your branch unless the task explicitly assigns integration work.
A large diff is not evidence of quality. Prefer the smallest complete implementation that satisfies the acceptance gates.

4. Parallel development model
Parallel implementation may begin only from a green foundation commit with:

a clean install from the lockfile;
passing typecheck, lint, unit tests, required E2E tests, validators, and builds;
stable package boundaries;
frozen shared contracts for the batch;
one canonical migration source;
a canonical integration fixture;
no committed node_modules, build output, local databases, OS metadata, or nested archives.
All parallel agents must start from the same recorded base commit unless the task explicitly says otherwise.

Role ownership
Foundation Agent
Primary ownership:

repository hygiene;
CI and required checks;
workspace/package boundaries;
frozen contracts and shared fixtures;
migration source consolidation;
minimal client/API/content scaffolding required for parallel work.
The Foundation Agent must not implement unrelated product features.

Backend Agent
Primary ownership:

apps/api-server/**;
packages/db/**;
packages/domain/**;
packages/providers/**;
canonical migration implementation under the path selected by the foundation task.
Read-only unless explicitly authorized:

apps/game-client/**;
packages/ui-game/**;
versioned scenario content.
Frontend Agent
Primary ownership:

apps/game-client/**;
packages/ui-game/**.
The frontend must work against a typed adapter boundary and canonical mock fixture. It must never import database, provider, or API-server internals.

Content/Data Agent
Primary ownership:

packages/content/**;
versioned scenario and snapshot directories;
content validators and dry-run import tooling explicitly assigned by the task.
The Content/Data Agent creates reproducible, reviewable source artifacts. It must not write directly to production databases, change scoring policy, or modify frontend/backend implementation.

Integration Agent
The final Integration Agent starts only after the assigned backend, frontend, and content/data PRs have finished and their selected versions have been applied to the integration base or current main.

The Integration Agent receives:

the updated commit containing all selected PRs;
the PR numbers or candidate labels;
review findings for each PR;
known inherited defects;
the mandatory end-to-end flow.
The Integration Agent may:

fix cross-component incompatibilities;
correct known, bounded defects in the merged work;
update adapters and wiring;
add integration and E2E tests;
fix configuration required for the combined build.
The Integration Agent must not:

silently redesign working subsystems;
weaken schemas, validators, authentication, future-data isolation, or tests;
delete failing tests to obtain a green result;
hide errors with any, ignore directives, empty catches, or skipped checks;
claim READY before the full combined gate actually passes.
Required integration flow:

versioned content fixture
→ content validation
→ clean database migration
→ dry-run and real test import
→ backend public scenario API
→ frontend rendering
→ scenario run start
→ immutable seal
→ process scoring
→ reveal
→ persisted replay/readback
If selected component PRs are temporarily merged while broken, the Integration Agent may repair them in a subsequent PR only when there is no secret exposure, authorization bypass, destructive migration, unrecoverable data corruption, malicious code, or public future-data leak. Such critical PRs must be rejected instead of merged.

Review Agent
A Review Agent is read-only unless explicitly assigned a repair task. It reports inherited defects separately from defects introduced by the candidate.

Use these labels:

INHERITED — existed in the recorded base;
INTRODUCED — added by the candidate;
FIXED — inherited defect corrected by the candidate;
REGRESSION — previously working behavior is broken;
UNVERIFIED — cannot be confirmed with available evidence.
5. Frozen contracts and dependency boundaries
packages/contracts is the shared source of truth for batch work.

During a parallel batch, backend, frontend, and content/data agents treat shared contracts as frozen. If a contract is invalid, do not silently change it. Report:

CONTRACT_CHANGE_REQUIRED
Reason:
Exact proposed change:
Compatibility impact:
Migration or fixture impact:
Tests requiring updates:
A contract change must be approved or assigned as a separate integration/foundation task.

Allowed dependency direction:

contracts ← content
contracts ← domain
contracts ← providers
contracts ← db
contracts ← api-server
contracts ← game-client
ui-game   ← game-client
Forbidden examples:

frontend importing apps/api-server/src/**;
frontend importing packages/db/**;
content importing frontend implementation;
API routes importing private frontend files;
client connecting directly to a database or external market-data provider.
Use public package exports. Do not bypass package boundaries with deep relative imports.

6. Canonical invariants
The product has one unified Entity group.
Canonical Entity names remain exact English in every locale.
Do not translate, transliterate, or invent Entity names.
Do not introduce Enemy, Boss, or MasteryBoss as replacement top-level categories.
Scenario level is an integer from 1 to 99 and is not a publication quality score.
Important curriculum topics appear by approximately Level 40; later levels emphasize interleaving, transfer, delayed rematches, specialized theory, and rolling reliability.
Content ladder: Theory Module → Worked Example → Skill Card → Card Header → Recall → Decision → Debrief → Delayed Rematch.
Scenario data is point-in-time; future data and hidden Entity data remain server-side before seal.
The public client must never receive hidden future/outcome data before an authorized reveal.
Client never connects directly to database or external providers.
Coins, XP, Energy, and Mastery Stars never change score, outcome, ranking, or risk advantage. Telegram Stars are a payment rail only.
No feature is accepted without tests, checklist, evidence, and explicit status.
7. Historical content and data requirements
Historical scenarios must use a reproducible pipeline:

source query/reference
→ immutable normalized snapshot
→ point-in-time public segment
→ separately stored hidden future segment
→ deterministic content hashes
→ versioned ScenarioPackage
→ validation
→ reviewStatus=draft
→ dry-run import
→ human/content approval
Every scenario must record, where applicable:

provider and source reference;
asset/symbol and interval;
decision time t0;
observed, published, and available timestamps;
timezone;
content and data versions;
deterministic hashes;
provenance and licensing status;
learning objective and scoring rationale.
The Content/Data Agent must verify:

no source unavailable at t0 appears in the public segment;
hidden future begins strictly after t0;
timestamp ordering is valid;
hashes are real and reproducible, not descriptive placeholders;
duplicate snapshots/scenarios are detected;
public data does not reveal the expected action or outcome;
source terms permit the intended project use.
Do not insert generated content directly into production tables. Store versioned artifacts first and import them through validated tooling.

8. API, persistence, and migration requirements
Mutating operations must not use HTTP GET.
Every protected resource must be scoped to the authenticated user or authorized role.
Idempotency constraints must include the correct owner and operation scope.
Production secrets must never appear in source, fixtures, logs, client bundles, query strings, or evidence.
Do not expose raw internal exception messages to clients.
Production logging must be structured and redact tokens, cookies, Telegram init data, personal data, decisions, hidden future data, and payment payloads.
Production rate limiting must use an approved shared store.
Migrations are forward-only, deterministic, transactional where supported, and tested from an empty database.
Maintain one canonical migration source. Generated copies must be reproducible and checked for drift.
Destructive migrations require an explicit compatibility, backup, and rollback plan.
9. Testing and evidence rules
A check is PASS only when it was actually executed against the reported commit and completed successfully.

Never:

claim a command passed without its real output;
convert infrastructure failure into a code pass;
delete, skip, or weaken a test merely to make CI green;
update expected values without explaining the behavior change;
use archived cross-platform node_modules as release evidence;
treat documentation statements as executable evidence.
Required gates depend on scope, but the combined release/integration gate normally includes:

pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm validate:contracts
pnpm validate:content
pnpm validate:locales
pnpm validate:assets
pnpm validate:public-client
pnpm client:typecheck
pnpm client:lint
pnpm client:test
pnpm client:build
pnpm build
Add database migration/seed replay, provider, security, browser, accessibility, and staging checks when relevant.

For each command report:

exact command;
exit status;
passed/failed/skipped count where applicable;
relevant environment;
concise failure reason.
If a command cannot run, report UNVERIFIED or BLOCKED, not PASS.

10. Repository hygiene
Never commit unless explicitly required as a reviewed fixture:

node_modules/;
dist/, build caches, coverage output;
.DS_Store, __MACOSX, AppleDouble ._* files;
local SQLite/database files;
logs, temporary files, screenshots from ad-hoc testing;
nested ZIP archives;
.env files or secrets;
generated assets without provenance.
The repository must include an appropriate .gitignore. A clean checkout must be sufficient to install, validate, test, and build.

11. Archive skill routing
The repository uses the general archive game-development skill as orchestrator:

Browser, Phaser, WebGL, PWA, performance: web-games.
2D rendering, charts, sprites, layout: 2d-games.
Core loop, progression, balance, player psychology: game-design.
Visual style, assets, animation, art direction: game-art.
Motion, transitions, interaction timing: game-art + docs/motion_interaction_system_spec.md.
Audio: game-audio.
Multiplayer: multiplayer.
Project overlay: .claude/skills/signal-arena/SKILL.md.

12. Document dependency block
Every task prompt must contain:

## Task context

Role:
Starting commit:
Owned paths:
Read-only/forbidden paths:

Read:
- relevant canonical document
- relevant technical document
- relevant QA document

Relevant invariants:
- ...

Acceptance gates:
- ...
Never silently implement a shared concept from memory when a canonical document exists.

13. Asset and source requirements
Every non-trivial asset or external source must have provenance before acceptance. Use docs/asset_provenance_and_workflow.md.

Approved origins:

original — created specifically for Signal Arena;
generated — generated for the project and reviewed;
licensed — external asset with verified license;
public_domain — verified public-domain asset;
placeholder — temporary development-only asset.
Unknown-license assets are prohibited in production. Core brand assets, Coin icon, Entity portraits, unique UI effects, and canonical icons should normally be original or generated for Signal Arena.

Use stable assetId references, not fragile filenames. Do not put gameplay logic behind an unregistered asset.

14. Mandatory completion report
Every task must report:

## Completion report

Role:
Starting commit:
Final commit:
Branch/PR:

Scope completed:
- ...

Documents and skills used:
- ...

Changed files:
- ...

Contracts changed:
- none | CONTRACT_CHANGE_REQUIRED | approved changes

Migrations/data changes:
- ...

Assets/sources and provenance:
- ...

Commands executed:
- command — PASS/FAIL/BLOCKED — exact summary

Automated QA:
- ...

Manual/visual/responsive/accessibility QA:
- ...

Inherited defects:
- ...

Introduced defects or regressions:
- ...

Known limitations and required follow-up:
- ...

Evidence:
- ...

Final status: ACCEPTED | NEEDS_QA | BLOCKED | REJECTED
A failed or unexecuted mandatory gate must not be described as complete. ACCEPTED is allowed only when every task acceptance gate passes for the reported commit.
