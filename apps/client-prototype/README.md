# Signal Arena client interface shell

This is a Vite-packaged, framework-neutral, interactive UI shell prototype up to the panel boundary. It is a typed workspace package, not the production Phaser client.

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

## Package commands

From the repository root:

```text
pnpm client:typecheck
pnpm client:lint
pnpm client:test
pnpm client:build
```

`index.html` is the Vite preview entry and `vite.config.ts` defines the package build/server boundary. `interface-shell.html` remains a standalone visual reference fixture. The typed model in `src/` is imported by `src/main.ts` at preview bootstrap and supplies the screen, panel and Phaser handoff registries.

Viewport and interaction acceptance inputs are listed in `viewport-qa.json`. Its status remains `planned` until browser screenshots, accessibility evidence and reduced-motion evidence are attached.

## Server-authoritative boundary

The prototype contains only the public ScenarioPackage projection and player-entered decision state. Historical future data, hidden Entities, outcomes, evaluation rules and process scores are never fixture data or client calculations. The production client must request them from the API only after a server-accepted Seal and render the returned reveal/score projection.
