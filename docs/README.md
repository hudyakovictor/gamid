# Signal Arena Documentation Hub

Start here for project documentation. This hub is a human navigation layer; agents should receive only relevant linked documents.

## Mandatory startup

Every agent task begins with:

```text
AGENTS.md
→ docs/README.md
→ relevant archive sub-skill
→ relevant Signal Arena documents
→ focused task prompt
```

## Canonical hierarchy

1. `../full_game_spec.md`
2. `../academy_plan_99.md`
3. `../style-tone.txt` and `../brand.md`
4. `system_architecture_v4.md`
5. `master_prompt_integration.md`
6. `implementation_plan_iteration_prompts.md`
7. `learning_science_evidence_and_curriculum_plan.md`
8. `scenario_authoring_and_historical_data_spec.md`
9. `scenario_authoring_schema_99.md`
10. `historical_data_api_integration_plan.md`
11. `traditional_course_gap_analysis.md`
12. `motion_interaction_system_spec.md`
13. `asset_provenance_and_workflow.md`
14. `economy_monetization_referrals_v1.md`
15. `pip_economy_150_simulation.md` and `150_simulation_results.json`
16. `topbar_currency_ui_spec.md`
17. `referral_and_growth_spec.md`
18. `economy_and_development_addendum.md`
19. `acceptance_matrix.md`, `final_20_80_audit.md`, and `crm_stack_spec.md`
20. `.claude/skills/signal-arena/SKILL.md`

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
→ academy_plan_99.md
→ learning_science_evidence_and_curriculum_plan.md
→ traditional_course_gap_analysis.md
```

### Content and data

```text
full_game_spec.md
→ academy_plan_99.md
→ scenario_authoring_and_historical_data_spec.md
→ scenario_authoring_schema_99.md
→ historical_data_api_integration_plan.md
```

### Implementation, assets, and motion

```text
AGENTS.md
→ implementation_plan_iteration_prompts.md
→ .claude/skills/signal-arena/SKILL.md
→ relevant archive sub-skill
→ asset_provenance_and_workflow.md or motion_interaction_system_spec.md
→ acceptance_matrix.md
→ final_20_80_audit.md
```

## Cross-document invariants

- One unified Entity group; no invented Enemy/Boss split.
- Canonical Entity names remain exact English in every locale.
- Stable English IDs are separate from display copy.
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
