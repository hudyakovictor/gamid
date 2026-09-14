# Signal Arena interface shell

## Purpose

This is a detailed client interface prototype up to the panel boundary. It defines screen composition, navigation, panel affordances, states and responsive presentation without implementing the internal content of the panels.

## Screens

```text
Preload
Main Menu
Academy
Mission Select
Scenario Brief
Decision Workspace
Historical Reveal
Score / Debrief
Profile
Collection
Store
```

## Panel boundary

Panels are shells only. Their implementation is intentionally deferred:

```text
PRICE
CONTEXT
FLOW
EVENT
PROJECT
Skill Hand
Decision Sheet
Market Fact
Plan Consequence
Decision Quality
The Helper
Pause Menu
```

Each panel supports these states:

```text
closed
opening
open
expanded
collapsed
loading
empty
locked
error
completed
```

## Responsive presentation

- Desktop: side or modal panel.
- Tablet: overlay panel.
- Mobile: bottom sheet, with full-screen fallback for Pause Menu.
- Safe-area padding and no required horizontal scrolling.
- Keyboard focus-visible styles.
- Reduced-motion media query.

## Explicitly not implemented

- Internal source analysis.
- Real candle renderer.
- Production scoring.
- Historical providers.
- Database, auth or persistence.
- Real purchases or ledger.
- Phaser runtime.

The shell is a visual and interaction reference for the next Phaser implementation stage.
