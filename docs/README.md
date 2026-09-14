# Signal Arena Documentation Hub

Start here for project documentation. This hub is a human navigation layer; agents should receive only relevant linked documents.

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
3. `style-tone.txt` and `brand.md` — voice and visual identity.
4. `system_architecture.md` — technical architecture and deployment boundaries.
5. `master_prompt_integration.md` — implementation principles.
6. `implementation_plan_iteration_prompts.md` — human-controlled iteration plan, Definition of Done, focused prompts, and periodic audit.
7. `../packages/contracts/src/scenario.ts` — executable ScenarioPackage contract and public projection boundary.
8. `../packages/content/src/validate.ts` — executable Source Group, t0, and future validation.
9. `motion_interaction_system_spec.md` — motion, easing, preloader, screen transitions, auto-advance, celebrations, accessibility, and motion QA.
10. `asset_provenance_and_workflow.md` — asset selection, provenance, stable IDs, licensing, and release gates.
11. `economy_monetization_referrals.md` — Stars, Pips, sinks, monetization, referrals, ledger, and guardrails.
12. `topbar_currency_ui_spec.md` — Stars and PipGem UI.
13. `referral_and_growth_spec.md` — referral lifecycle and anti-abuse.
14. `acceptance_matrix.md`, `security_architecture.md`, `deployment_and_environments.md`, `performance_and_scaling.md`, and `observability_and_incident_response.md` — acceptance, security, operations, and scaling. Local API hardening is implemented; shared production controls remain gated.
15. `vercel_alpha_and_platform_strategy.md` — alpha hosting, commercial transition, provider alternatives, portability, and migration triggers.
16. `ai_agent_operations_architecture.md` — isolated agent roles, data boundaries, approvals, marketing analytics, and AI operations.
17. `roadmap_and_release_control_plane.md` — machine-readable roadmap, gates, blockers, evidence, dependencies, releases, CI, and Admin CRM integration.
18. `../game-development-skill/SKILL.md` and `../.claude/skills/signal-arena/SKILL.md` — archive orchestrator and Signal Arena project overlay.

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
- Level 1–99 is scenario difficulty/progression, not a 99-point authoring score.
- Essential theory is introduced by approximately Level 40 and returns through interleaving, specialization, transfer, and reliability.
- Theory Module → Worked Example → Skill Card → Card Header → Recall → Decision → Debrief → Rematch.
- Pips and Stars never change score, outcome, ranking, or risk advantage.
- Every non-trivial asset has provenance and a stable assetId.
- Unknown-license assets never enter production.
- Motion communicates purpose, state, hierarchy, and causality; reduced motion preserves meaning.
- No iteration is accepted without tests, manual QA, evidence, and explicit status.
