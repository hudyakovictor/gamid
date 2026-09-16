# Signal Arena Documentation Hub

Start here for project documentation. This hub is a human navigation layer; agents should receive only relevant linked documents.

Status: REQUIRED
Scope: documentation governance
Owner: Signal Arena project owner
Last reviewed: 2026-09-16
Supersedes: none
Required evidence: link audit, contradiction audit, status/evidence cross-check
Canonical dependencies: `../AGENTS.md`, executable contracts, current `developing_status.md`

## Documentation policy

Audit outputs and simulation outputs are internal decision inputs. They are not canonical product specifications. Only resulting product decisions belong in active documents.

Every agent task begins with:

```text
AGENTS.md
→ docs/README.md
→ relevant archive sub-skill
→ relevant Signal Arena documents
→ focused task prompt
```

## Canonical hierarchy

1. `full_game_spec.md` — product, game loop, Cards, unified Entities, Academy/Exam/Arena, scoring, Decision Trace, and core UX.
2. `academy_plan.md` — curriculum, learning outcomes, Source Groups, Cards, Protocols, Entities, progression, and mastery.
3. `style-tone.txt` — player-facing text voice only; `brand.md` — visual direction only.
4. `system_architecture.md` — required target architecture and deployment boundaries.
5. `master_prompt_integration.md` — implementation principles and agent routing.
6. `implementation_plan_iteration_prompts.md` — human-controlled iteration plan, Definition of Done, focused prompts, and periodic audit.
7. `../packages/contracts/src/scenario.ts` — executable ScenarioPackage and scoring contract.
8. `../packages/content/src/validate.ts` — executable Source Group, t0, and future validation.
9. `motion_interaction_system_spec.md` and `interactive_motion_spec.md` — unified motion and interaction requirements.
10. `asset_provenance_and_workflow.md` — asset selection, provenance, stable IDs, licensing, and release gates.
11. `economy_monetization_referrals.md` — canonical economy, Coin-first payments, referrals, ledger, and guardrails.
12. `game_balance_spec.md` — progression numbers, formulas, caps and balance hypotheses.
13. `catalog_sku_spec.md` — canonical SKU and entitlement composition.
14. `topbar_currency_ui_spec.md` — Top Bar layout and currency display only.
15. `referral_and_growth_spec.md` — referral lifecycle and anti-abuse details.
16. `acceptance_matrix.md`, `security_architecture.md`, `deployment_and_environments.md`, `performance_and_scaling.md`, and `observability_and_incident_response.md` — acceptance, security, operations, and scaling. Local API hardening is implemented; shared production controls remain gated.
17. `vercel_alpha_and_platform_strategy.md` — alpha hosting, commercial transition, provider alternatives, portability, and migration triggers.
18. `ai_agent_operations_architecture.md` — isolated agent roles, data boundaries, approvals, marketing analytics, and AI operations.
19. `roadmap_and_release_control_plane.md` — roadmap, gates, blockers, evidence, dependencies, releases, CI, and Admin CRM integration.
20. `competitors.md` — `RESEARCH_NON_CANONICAL`; market research only.
21. `monetization.txt` — `DEPRECATED`; superseded by `economy_monetization_referrals.md`, `game_balance_spec.md`, and `catalog_sku_spec.md`.
22. `../game-development-skill/SKILL.md` and `../.claude/skills/signal-arena/SKILL.md` — archive orchestrator and Signal Arena project overlay.

## Skill routing

```text
game-development
├── web-games
├── 2d-games
├── game-design
├── game-art
├── game-audio
└── multiplayer
```

The Signal Arena overlay routes tasks to archive skills and adds project invariants. It does not replace or duplicate them.

## Status and precedence

Security, privacy, legal and data-integrity invariants take precedence over all other documents. Executable contracts define implementation boundaries. `developing_status.md` plus gate/evidence records define actual implementation status. Product and learning rules come from `full_game_spec.md` and `academy_plan.md`; specialized canonical rules come from the economy, balance, SKU, UI, motion and asset documents. Roadmap and implementation plans define sequence, not current acceptance. Research, audits and deprecated documents are non-canonical inputs.

## Recommended paths

### Product and learning

```text
full_game_spec.md
→ academy_plan.md
→ ../packages/contracts/src/scenario.ts
→ ../packages/content/src/validate.ts
```

### Content and data

```text
full_game_spec.md
→ academy_plan.md
→ ../packages/contracts/src/scenario.ts
→ ../packages/content/src/validate.ts
→ ../apps/api-server/src/server.ts
```

### Implementation, assets, and motion

```text
../AGENTS.md
→ implementation_plan_iteration_prompts.md
→ ../.claude/skills/signal-arena/SKILL.md
→ ../game-development-skill/<sub-skill>
→ asset_provenance_and_workflow.md or motion_interaction_system_spec.md
→ acceptance_matrix.md
→ security_architecture.md
→ deployment_and_environments.md
→ performance_and_scaling.md
→ observability_and_incident_response.md
→ vercel_alpha_and_platform_strategy.md
→ ai_agent_operations_architecture.md
→ roadmap_and_release_control_plane.md
```

### Economy and growth

```text
economy_monetization_referrals.md
→ game_balance_spec.md
→ catalog_sku_spec.md
→ topbar_currency_ui_spec.md
→ referral_and_growth_spec.md
```

## Cross-document invariants

- One unified Entity group; no invented Enemy/Boss split.
- Canonical Entity names remain exact English in every locale.
- Stable English IDs are separate from display copy.
- Cards and Protocols are ScenarioPackage fields and may be used across historical modes.
- Academy uses Guided Loadout, Exam Curated Loadout, Arena Base/Personal Loadout.
- Source Groups are exactly PRICE, CONTEXT, FLOW, EVENT and PROJECT; beginner scenarios stay minimal.
- Scenario data is point-in-time and future-safe.
- Public and hidden projections are separate.
- `Scenario Level` is an integer 1–99 for scenario difficulty/progression; `Account Level` is separate player progression, not a 99-point authoring score.
- Essential theory is introduced by approximately Level 40 and returns through interleaving, specialization, transfer, and reliability.
- Theory Module → Worked Example → Skill Card → Card Header → Recall → Decision → Debrief → Rematch.
- Telegram Stars/XTR → Coin Pack → Coins → Signal Arena goods and services; direct Stars entitlements are exceptional only.
- Coins, XP, Energy, and Mastery Stars never change score, outcome, ranking, or risk advantage.
- Top-level scoring dimensions are defined by `packages/contracts/src/scenario.ts`; Academy labels are mapped submetrics or telemetry.
- Academy display numbers are 00–14; stable IDs, not display numbers, are used by CMS, analytics, progression and rematch.
- Arena Hub is the canonical name for the root screen; Home and Lobby are deprecated aliases.
- Every non-trivial asset has provenance and a stable assetId.
- Unknown-license assets never enter production.
- Motion uses one MotionContract and canonical duration tokens; reduced motion preserves meaning.
- No iteration is accepted without tests, manual QA, evidence, and explicit status.
