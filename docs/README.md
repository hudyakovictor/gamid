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
13. `asset_provenance_and_workflow.md` — asset selection, provenance, stable IDs, licensing, and release gates.
14. `economy_monetization_referrals_v1.md` — Stars, Pips, sinks, monetization, referrals, ledger, and guardrails.
15. `topbar_currency_ui_spec.md` — Stars and PipGem UI.
16. `referral_and_growth_spec.md` — referral lifecycle and anti-abuse.
17. `economy_and_development_addendum.md` — connected economy and development rules.
18. `acceptance_matrix.md`, `final_20_80_audit.md`, and `crm_stack_spec.md` — acceptance, release, and analytics.
19. `.claude/skills/signal-arena/SKILL.md` — project overlay and routing layer for the archive's general game-development skill.

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

### Economy and growth

```text
economy_monetization_referrals_v1.md
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
- Every non-trivial asset has provenance and a stable assetId.
- Unknown-license assets never enter production.
- Motion communicates purpose, state, hierarchy, and causality; reduced motion preserves meaning.
- No iteration is accepted without tests, manual QA, evidence, and explicit status.
