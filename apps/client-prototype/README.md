# Signal Arena client interface shell

This is a Vite-packaged Phaser 4.2.1 client prototype with an executable historical-scenario vertical slice. It is a foundation runtime, not the production-approved client.

## Implemented runtime

- fixed `100dvh` viewport with no page scroll;
- compact one-row top bar without logo;
- XP and Profile left, Energy/Mastery/Coins/utilities right;
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
- typed panel/screen/rail model;
- Phaser 4 boot and scene runtime;
- API client with shared ScenarioPackage/public/reveal/score contract validation;
- executable flow: bootstrap → scenario brief → evidence → decision → seal → server reveal → debrief → delayed rematch;
- server-authoritative state boundary: hidden/future data is absent until the reveal response;
- procedural chart frame only, with no production asset dependency.

## Explicit boundary

This is an executable foundation slice, not a production release. It does not yet contain:

- Telegram Mini App platform adapter and production auth UX;
- real historical provider ingestion in the client flow;
- production candle renderer and chart semantics;
- browser E2E, visual viewport evidence or full accessibility behavior;
- real Coins ledger;
- purchases or entitlements;
- production asset/audio approval;
- complete scoring governance beyond the server foundation service.

The shell is ready to use as a visual and interaction reference for the next Phaser implementation stage.

## Package commands

From the repository root:

```text
pnpm client:typecheck
pnpm client:lint
pnpm client:test
pnpm client:build
```

For a local API-connected preview, run the API and client separately:

```text
AUTH_MODE=fixture pnpm dev:api
pnpm --filter @signal-arena/client-prototype dev
```

Vite proxies `/api` to `http://127.0.0.1:3000` by default. A deployed public client sets `VITE_API_BASE_URL` to the private API ingress; the client never receives database or provider credentials.

`index.html` is the Vite/Phaser entry and `vite.config.ts` defines the package build and local `/api` proxy to the Fastify server. `interface-shell.html` remains a standalone visual reference fixture. The typed model in `src/` supplies the screen, panel, scene registry, API client and flow state machine. Phaser is lazy-loaded so the initial bootstrap stays small; the runtime chunk is intentionally large and should be revisited before production mobile release.

Viewport and interaction acceptance inputs are listed in `viewport-qa.json`. Its status remains `planned` until browser screenshots, accessibility evidence and reduced-motion evidence are attached.

## Server-authoritative boundary

The client contains only the public ScenarioPackage projection and player-entered decision state before Seal. Historical future data, hidden Entities, outcomes, evaluation rules and process scores are never bundled as client fixtures or calculated in Phaser. The client requests reveal/score only after a server-accepted Seal and renders the returned server projection.
