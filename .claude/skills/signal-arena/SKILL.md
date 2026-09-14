---
name: signal-arena
description: Signal Arena project overlay for routing the general game-development skill to the correct sub-skills and enforcing project-specific learning, scenario, naming, data, motion, and QA invariants.
---

# Signal Arena Project Overlay

This is a project-specific overlay, not a replacement for the general game-development skill. Use the archive's general game-development skill as the orchestrator.

## Routing

- Browser, Phaser, WebGL, PWA, scaling, performance: `web-games`.
- 2D rendering, Canvas, charts, sprites, layout: `2d-games`.
- Core loop, progression, balance, player psychology: `game-design`.
- Visual style, assets, animation, art direction: `game-art`.
- Motion, transitions, interaction timing, celebratory states: `game-art` plus `docs/motion_interaction_system_spec.md`.
- Sound and adaptive audio: `game-audio`.
- Multiplayer and networking: `multiplayer`.

Do not duplicate or replace the archive's general skills.

## Relevant documents

Read only the smallest relevant set through `docs/README.md`:

- `full_game_spec.md`
- `academy_plan_99.md`
- `docs/implementation_plan_iteration_prompts.md`
- `docs/learning_science_evidence_and_curriculum_plan.md`
- `docs/scenario_authoring_schema_99.md`
- `docs/historical_data_api_integration_plan.md`
- `docs/economy_monetization_referrals_v1.md`
- `docs/motion_interaction_system_spec.md` for motion or interaction work

Do not ingest the whole documentation hub at every startup.

## Invariants

- One unified Entity group.
- Canonical Entity names remain exact English in every locale.
- Do not introduce Enemy, Boss, or MasteryBoss as replacement top-level categories.
- Scenario level is an integer from 1 to 99, not an authoring quality score.
- Important curriculum topics appear by approximately Level 40; later levels emphasize interleaving, transfer, delayed rematches, blind practice, specialized theory capsules, and rolling reliability.
- Use Theory Module → Worked Example → Skill Card → Card Header → Recall → Decision → Debrief → Delayed Rematch.
- Scenario data is point-in-time; future data and hidden Entity data stay server-side before seal.
- Client never connects directly to the database or external providers.
- Pips and Stars never change score, outcome, ranking, or risk advantage.
- Motion must communicate purpose, state, hierarchy, or causality; do not add decorative motion without a reason.

## Motion invariants

- Enter: usually `ease-out`.
- Exit: usually `ease-in`.
- In-scene movement/shared-axis: usually `ease-in-out`.
- Frequent input feedback: approximately 100–180 ms.
- State transitions: approximately 200–400 ms.
- Rare celebrations: approximately 500–900 ms and skippable.
- Four-step tasks may auto-advance after valid selection with a visible step indicator, short comprehension pause, undo/back behavior where appropriate, and reduced-motion/accessibility support.
- Decision seal must be visibly irreversible.
- Reveal must prioritize causal explanation over decoration.
- Completion celebrations reward process quality, not lucky outcome.
- `prefers-reduced-motion` must preserve meaning, focus, and state.

## Contract-first workflow

```text
contract
→ mock fixtures
→ visual lab
→ backend/API implementation
→ staging integration
→ whole-system audit
```

Use `ScenarioPackage` and separate public pre-decision, player decision, hidden resolver, and reveal projections.

## Quality gate

A task is not complete after code is written. Run relevant unit, integration, contract, E2E, typecheck, lint, build, visual regression, responsive, accessibility, reduced-motion, future-leak, deterministic replay, economy/idempotency, manual QA, and evidence checks.

Use `PLANNED`, `IN_PROGRESS`, `BLOCKED`, `READY_FOR_REVIEW`, `ACCEPTED`, or `REJECTED`. Never claim `ACCEPTED` with a failed mandatory gate.

Run the periodic integration audit from `docs/implementation_plan_iteration_prompts.md` after every 3–5 merged PRs, before release candidates, and after shared contract, API, database, scoring, economy, localization, visual, or motion changes.
