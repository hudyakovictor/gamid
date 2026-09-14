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
7. `academy_plan_99.md` — learning mechanics, curriculum pacing, Cards, Protocols, Entities, measurement, and transfer.
8. `packages/contracts/src/scenario.ts` — executable ScenarioPackage contract and public projection boundary.
9. `packages/content/src/validate.ts` — executable Source Group, t0 and future validation.
10. `docs/motion_interaction_system_spec.md` — motion, easing, preloader, screen transitions, auto-advance, celebrations, accessibility, and motion QA.
11. `docs/asset_provenance_and_workflow.md` — asset selection, provenance, stable IDs, licensing, and release gates.
12. `docs/economy_monetization_referrals_v1.md` — Stars, Pips, sinks, monetization, referrals, ledger, and guardrails.
13. `docs/topbar_currency_ui_spec.md` — Stars and PipGem UI.
14. `docs/referral_and_growth_spec.md` — referral lifecycle and anti-abuse.
15. `docs/acceptance_matrix.md`, `docs/final_20_80_audit.md`, and `docs/crm_stack_spec.md` — acceptance, release, and analytics.
16. `.claude/skills/signal-arena/SKILL.md` — project overlay and routing layer for the archive's general game-development skill.

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
→ packages/contracts/src/scenario.ts
→ packages/content/src/validate.ts
```

### Content and data

```text
full_game_spec.md
→ academy_plan_99.md
→ packages/contracts/src/scenario.ts
→ packages/content/src/validate.ts
→ apps/api-server/src/server.ts
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
