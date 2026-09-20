# Signal Arena Documentation Map

Status: REQUIRED
Scope: documentation navigation
Owner: Signal Arena project owner
Last reviewed: 2026-09-16
Supersedes: none
Required evidence: link audit and status audit
Canonical dependencies: `README.md`, `../AGENTS.md`

Start at `README.md`.

## Mandatory project context

- `../AGENTS.md`
- `../.claude/skills/signal-arena/SKILL.md`
- `../game-development-skill/SKILL.md`

## Canonical product and learning

- `full_game_spec.md`
- `academy_plan.md`
- `style-tone.txt` — text voice only
- `brand.md` — visual direction only
- `competitors.md` — `RESEARCH_NON_CANONICAL`

Executable contracts and validation are canonical for implementation boundaries:

- `../packages/contracts/src/scenario.ts`
- `../packages/contracts/src/provider.ts`
- `../packages/content/src/validate.ts`
- `../packages/providers/src/binance.ts`
- `../packages/db/src/ports.ts`
- `../packages/db/src/sqlite-adapter.ts`
- `../packages/db/src/postgres-migrations.ts`
- `../packages/db/src/postgres-adapter.ts`

## Development and QA

- `system_architecture.md`
- `implementation_plan_iteration_prompts.md`
- `acceptance_matrix.md`
- `motion_interaction_system_spec.md`
- `interactive_motion_spec.md`
- `asset_provenance_and_workflow.md`
- `security_architecture.md`
- `deployment_and_environments.md`
- `performance_and_scaling.md`
- `observability_and_incident_response.md`
- `vercel_alpha_and_platform_strategy.md`
- `ai_agent_operations_architecture.md`
- `roadmap_and_release_control_plane.md`
- `crm_stack_spec.md`
- `p0_p1_remediation_plan.md`

## Economy and growth

- `economy_monetization_referrals.md`
- `game_balance_spec.md`
- `catalog_sku_spec.md`
- `topbar_currency_ui_spec.md`
- `monetization.txt` — `DEPRECATED`
- `referral_and_growth_spec.md`
- `multichain_readiness_assessment.md`

## Prototype and interface evidence

- `../apps/client-prototype/package.json`
- `../apps/client-prototype/index.html`
- `../apps/client-prototype/README.md`
- `../apps/client-prototype/interface-shell.html`
- `../apps/client-prototype/src/main.ts`
- `../apps/client-prototype/src/api-client.ts`
- `../apps/client-prototype/src/client-flow.ts`
- `../apps/client-prototype/src/phaser-runtime.ts`
- `../apps/client-prototype/src/scenes.ts`
- `../apps/client-prototype/viewport-qa.json` — planned browser/responsive/accessibility evidence

The canonical root section is Hub and it comes first in primary navigation; `arena_hub` remains its stable screen ID. `Home` and `Lobby` are deprecated aliases. Mission names are destinations, and Skill Hand is a Decision Workspace component.

## Status and navigation

- `developing_status.md`
- `README.md`
- `CONTRIBUTING.md`

Audit and simulation outputs are not listed here. Their resulting decisions belong in active specifications or implementation status, not in stale archive files.

When documents conflict, follow the canonical hierarchy in `README.md`, then update dependent documents and run the integration audit.
