# Interface shell boundary

The client prototype is intentionally implemented up to, but not inside, the panel boundary.

## Screens

```text
Preload → Home → Academy/Mission → Scenario Brief → Decision Workspace → Reveal → Debrief → Rematch
Profile · Collection · Store
```

## Interaction shell

- one-row compact top bar without logo;
- fixed application viewport;
- internal scroll only for screen content and panel body;
- backdrop, Escape, mobile Back and explicit close are the intended dismiss routes;
- desktop modal, tablet overlay and mobile bottom-sheet presentations;
- Academy, Mission and Skill Hand rails have explicit previous/next controls and counters;
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
