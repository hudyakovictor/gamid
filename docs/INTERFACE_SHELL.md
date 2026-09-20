# Interface shell boundary

Status: IMPLEMENTED_LOCAL
Scope: client prototype shell and route boundary
Owner: Signal Arena project owner
Last reviewed: 2026-09-16
Supersedes: Home/Lobby and standalone Mission route terminology
Required evidence: browser route tests, responsive screenshots, accessibility and reduced-motion QA
Canonical dependencies: `full_game_spec.md`, `interactive_motion_spec.md`, `motion_interaction_system_spec.md`

The client prototype is intentionally implemented up to, but not inside, the panel boundary.

## Screens

```text
Preload → Hub → Academy / Arena / Mission target → Scenario Brief → Decision Workspace → Historical Reveal → Score → Debrief → Rematch
Profile · Collection · Shop · Tournaments

Stable screen IDs:

```text
arena_hub
academy
arena
shop
tournaments
profile
collection
scenario_brief
decision_workspace
historical_reveal
score
debrief
rematch
notifications
settings
```

`Hub` is the first primary section; `arena_hub` remains its stable screen ID for compatibility. `Mission` is a destination (`daily_fix`, `post_loss_protocol`, `academy_mission`, or `season_mission`), not a root screen. `Skill Hand` is a Decision Workspace component.
```

## Interaction shell

- one-row compact top bar without logo;
- fixed application viewport;
- internal scroll only for screen content and panel body;
- backdrop, Escape, mobile Back and explicit close are the intended dismiss routes;
- desktop modal, tablet overlay and mobile bottom-sheet presentations;
- Academy rails have explicit previous/next controls and counters; Mission destinations use their owning screen; Skill Hand is contained inside Decision Workspace;
- Decision Dock remains visible in the workspace;
- `prefers-reduced-motion` is supported.

## Panel interiors intentionally deferred

```text
PRICE · CONTEXT · FLOW · EVENT · PROJECT
Skill Hand · Decision Sheet
Market Fact · Plan Consequence · Decision Quality
Notifications · Settings · Attachments
```

## Out of scope

Database, auth, persistence, historical providers, production scoring, real economy ledger, purchases and Phaser runtime are not part of this prototype.
