# Signal Arena client interface shell

This is a framework-neutral, interactive UI shell prototype up to the panel boundary.

## Implemented shell

- fixed `100dvh` viewport with no page scroll;
- compact one-row top bar without logo;
- XP and Profile left, Pips/Stars/utilities right;
- responsive mobile menu;
- contextual route screens;
- Academy and Mission rails with Previous/Next and counters;
- Skill Hand rail;
- fixed Decision Workspace chart frame;
- persistent Decision Dock;
- modal desktop panels and mobile bottom sheets;
- backdrop click, Escape and explicit close affordance;
- internal panel scroll container;
- reduced-motion media query;
- typed panel/screen/rail model for Phaser handoff.

## Explicit boundary

Panel internals are intentionally not implemented. The prototype does not contain:

- database, auth or persistence;
- real historical providers;
- production candle renderer;
- server scoring;
- real Pips ledger;
- purchases or entitlements;
- Phaser runtime.

The shell is ready to use as a visual and interaction reference for the next Phaser implementation stage.
