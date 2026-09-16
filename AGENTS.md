# Signal Arena Agent Contract

This file is mandatory project context for every coding, content, design, asset, QA, and documentation task in this repository.

## Required startup order

Before changing files:

1. Read this `AGENTS.md`.
2. Read `docs/README.md`.
3. Identify the task type.
4. Select the relevant archive game-development sub-skill.
5. Read only the relevant Signal Arena documents.
6. List scope, files, dependencies, tests, asset/source requirements, and acceptance gates.
7. Stop and ask for clarification if canonical documents conflict.

Do not ingest every document for every task. Use the smallest relevant context, but never skip this contract or the documentation hub.

## Archive skill routing

The repository uses the general archive `game-development` skill as orchestrator:

- Browser, Phaser, WebGL, PWA, performance: `web-games`.
- 2D rendering, charts, sprites, layout: `2d-games`.
- Core loop, progression, balance, player psychology: `game-design`.
- Visual style, assets, animation, art direction: `game-art`.
- Motion, transitions, interaction timing: `game-art` + `docs/motion_interaction_system_spec.md`.
- Audio: `game-audio`.
- Multiplayer: `multiplayer`.

Project overlay: `.claude/skills/signal-arena/SKILL.md`.

## Canonical invariants

- The product has one unified `Entity` group.
- Canonical Entity names remain exact English in every locale.
- Do not translate, transliterate, or invent Entity names.
- Do not introduce Enemy, Boss, or MasteryBoss as replacement top-level categories.
- Scenario `level` is an integer from 1 to 99 and is not a publication quality score.
- Important curriculum topics appear by approximately Level 40; later levels emphasize interleaving, transfer, delayed rematches, specialized theory, and rolling reliability.
- Content ladder: Theory Module → Worked Example → Skill Card → Card Header → Recall → Decision → Debrief → Delayed Rematch.
- Scenario data is point-in-time; future data and hidden Entity data remain server-side before seal.
- Client never connects directly to database or external providers.
- Coins, XP, Energy, and Mastery Stars never change score, outcome, ranking, or risk advantage. Telegram Stars are a payment rail only.
- No feature is accepted without tests, checklist, evidence, and explicit status.

## Document dependency blocks

Every task prompt must contain:

```md
## Task context

Read:
- relevant canonical document
- relevant technical document
- relevant QA document

Relevant invariants:
- ...

Acceptance gates:
- ...
```

Never silently implement a shared concept from memory when a canonical document exists.

## Asset and source requirements

Every non-trivial asset or external source must have provenance before acceptance. Use `docs/asset_provenance_and_workflow.md`.

Approved origins:

- `original` — created specifically for Signal Arena;
- `generated` — generated for the project and reviewed;
- `licensed` — external asset with verified license;
- `public_domain` — verified public-domain asset;
- `placeholder` — temporary development-only asset.

Unknown-license assets are prohibited in production. Core brand assets, Coin icon, Entity portraits, unique UI effects, and canonical icons should normally be original or generated for Signal Arena.

Use stable `assetId` references, not fragile filenames. Do not put gameplay logic behind an unregistered asset.

## Mandatory completion report

Every task must report:

- task scope;
- relevant documents and skills used;
- changed files;
- assets/sources added and provenance;
- tests run and exact results;
- manual QA;
- visual/responsive/accessibility QA where applicable;
- known limitations;
- evidence;
- final status: `ACCEPTED`, `BLOCKED`, or `REJECTED`.

A failed mandatory gate must not be described as complete.
