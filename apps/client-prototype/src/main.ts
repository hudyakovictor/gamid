import { interfaceScreens, panels } from "./interface-shell.js";
import { phaserSceneMap, runtimeSceneKeys } from "./scene-map.js";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Client prototype root element is missing");
}

root.dataset.typedScreenCount = String(interfaceScreens.length);
root.dataset.typedPanelCount = String(panels.length);
root.dataset.phaserSceneCount = String(phaserSceneMap.length);
root.dataset.runtimeSceneCount = String(runtimeSceneKeys.length);
root.dataset.prototypeBoundary = "public-shell-only";
root.innerHTML = `
  <div id="game-root" aria-label="Signal Arena game client"></div>
  <div id="sr-status" class="sr-only" aria-live="polite" aria-atomic="true"></div>
`;

let game: { destroy(removeCanvas?: boolean): void } | undefined;

window.dispatchEvent(new CustomEvent("signal-arena:typed-model-ready", {
  detail: {
    screenCount: interfaceScreens.length,
    panelCount: panels.length,
    sceneCount: phaserSceneMap.length,
    runtimeSceneCount: runtimeSceneKeys.length
  }
}));

void import("./phaser-runtime.js")
  .then(({ createSignalArenaGame }) => {
    game = createSignalArenaGame("game-root");
  })
  .catch((error: unknown) => {
    const status = document.getElementById("sr-status");
    if (status) {
      status.textContent = "Signal Arena could not load the game runtime.";
    }
    console.error("Signal Arena runtime failed to load", error);
  });

const hotModule = (import.meta as ImportMeta & {
  hot?: { dispose(callback: () => void): void };
}).hot;
if (hotModule) {
  hotModule.dispose(() => {
    game?.destroy(true);
  });
}
