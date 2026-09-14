# Signal Arena Documentation Hub

Start here for project documentation. This hub is a human navigation layer; agents should receive only relevant linked documents.

## Canonical hierarchy

1. `../full_game_spec.md` — product, game loop, Cards, unified Entities, Academy/Exam/Arena, scoring, Decision Trace, and core UX.
2. `../academy_plan_99.md` — curriculum, learning outcomes, Source Groups, Cards, Protocols, Entities, progression, and mastery.
3. `../style-tone.txt` and `../brand.md` — voice and visual identity.
4. `system_architecture_v4.md` — technical architecture.
5. `master_prompt_integration.md` — implementation principles.
6. `implementation_plan_iteration_prompts.md` — human-controlled iteration plan, Definition of Done, focused prompts, and periodic audit.
7. `learning_science_evidence_and_curriculum_plan.md` — learning mechanics, compression ladder, curriculum pacing, measurement, and claim boundaries.
8. `scenario_authoring_and_historical_data_spec.md` — historical source and scenario workflow.
9. `scenario_authoring_schema_99.md` — ScenarioPackage, Level 1–99, complexity, content layers, and publication checks.
10. `historical_data_api_integration_plan.md` — provider adapters, snapshots, provenance, caching, and API gates.
11. `traditional_course_gap_analysis.md` — traditional-course gaps translated into Signal Arena mechanics and measurements.
12. `motion_interaction_system_spec.md` — motion, easing, preloader, screen transitions, auto-advance, celebrations, accessibility, and motion QA.
13. `economy_monetization_referrals_v1.md` — Stars, Pips, sinks, monetization, referrals, ledger, and guardrails.
14. `pip_economy_150_simulation.md` and `150_simulation_results.json` — initial economy baseline.
15. `topbar_currency_ui_spec.md` — Stars and PipGem UI.
16. `referral_and_growth_spec.md` — referral lifecycle and anti-abuse.
17. `economy_and_development_addendum.md` — additional economy simulation and cross-layer development gates.
18. `acceptance_matrix.md` and `final_20_80_audit.md` — acceptance and release checks.
19. `crm_stack_spec.md` — analytics and CRM.
20. `.claude/skills/signal-arena/SKILL.md` — project overlay and routing layer for the archive's general game-development skill.

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

For motion work use `game-art` plus `motion_interaction_system_spec.md`. The overlay does not replace archive skills.

## Recommended paths

### Product and learning

```text
full_game_spec.md
→ academy_plan_99.md
→ learning_science_evidence_and_curriculum_plan.md
→ traditional_course_gap_analysis.md
```

### Content and historical data

```text
full_game_spec.md
→ academy_plan_99.md
→ scenario_authoring_and_historical_data_spec.md
→ scenario_authoring_schema_99.md
→ historical_data_api_integration_plan.md
```

### Implementation and motion

```text
system_architecture_v4.md
→ master_prompt_integration.md
→ implementation_plan_iteration_prompts.md
→ .claude/skills/signal-arena/SKILL.md
→ relevant archive sub-skill
→ motion_interaction_system_spec.md when applicable
→ acceptance_matrix.md
→ final_20_80_audit.md
```

### Economy and growth

```text
economy_monetization_referrals_v1.md
→ pip_economy_150_simulation.md
→ topbar_currency_ui_spec.md
→ referral_and_growth_spec.md
→ economy_and_development_addendum.md
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
- Motion communicates purpose, state, hierarchy, and causality; reduced motion preserves meaning.
- No iteration is accepted without tests, manual QA, evidence, and explicit status.
