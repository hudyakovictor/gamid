---
name: game-development
description: General game-development orchestrator for routing tasks to platform, rendering, design, art, audio, and multiplayer sub-skills.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# General Game Development Orchestrator

Use this skill to select the smallest relevant archive sub-skill before changing a game project. It is an orchestration layer, not a replacement for the specialist skills.

## Routing

- Browser, Phaser, WebGL, PWA, deployment, and performance: `web-games`.
- 2D rendering, charts, sprites, cameras, and layout: `2d-games`.
- Core loop, progression, balance, accessibility of challenge, and player psychology: `game-design`.
- Visual style, assets, animation, art direction, and motion: `game-art`.
- Sound design, music, adaptive audio, and audio performance: `game-audio`.
- Multiplayer, networking, synchronization, and authoritative sessions: `multiplayer`.
- Mobile-specific input, lifecycle, battery, and store constraints: `mobile-games`.
- 3D rendering and XR tasks: `3d-games` or `vr-ar` as appropriate.
- Desktop and console platform work: `pc-games`.

## Contract-first workflow

```text
project contract
→ documentation hub
→ selected specialist sub-skills
→ relevant canonical documents
→ scope and acceptance gates
→ contracts and fixtures
→ implementation
→ focused tests
→ integration and evidence
```

Before implementation:

1. Read the project's agent contract and documentation hub.
2. Identify the task type and select only relevant sub-skills.
3. Read the relevant canonical, technical, QA, and asset/source documents.
4. List affected files, dependencies, tests, acceptance gates, and provenance requirements.
5. Stop when canonical documents conflict; do not resolve product policy by guesswork.

## Quality principles

- Keep authoritative state on the server for competitive or reveal-sensitive games.
- Treat content, API schemas, assets, and migrations as versioned release inputs.
- Prefer deterministic fixtures and replayable tests for scoring, progression, and state transitions.
- Design responsive, accessible, reduced-motion fallbacks and slow-network behavior from the start.
- Do not call a task accepted without automated tests, manual QA, evidence, and an explicit status.
