import { interfaceScreens, panels } from "./interface-shell.js";
import { phaserSceneMap } from "./scene-map.js";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Client prototype root element is missing");
}

root.dataset.typedScreenCount = String(interfaceScreens.length);
root.dataset.typedPanelCount = String(panels.length);
root.dataset.phaserSceneCount = String(phaserSceneMap.length);
root.dataset.prototypeBoundary = "public-shell-only";

window.dispatchEvent(new CustomEvent("signal-arena:typed-model-ready", {
  detail: {
    screenCount: interfaceScreens.length,
    panelCount: panels.length,
    sceneCount: phaserSceneMap.length
  }
}));
