import Phaser from "phaser";

import { createDefaultApiClient } from "./api-client.js";
import { runtimeSceneKeys } from "./scene-map.js";
import { createScenarioFlow } from "./client-flow.js";
import {
  BootScene,
  DebriefScene,
  DecisionWorkspaceScene,
  ErrorScene,
  HistoricalRevealScene,
  RematchScene,
  ScenarioBriefScene
} from "./scenes.js";

export { runtimeSceneKeys };

function getInitialViewport(parent: HTMLElement | string): { width: number; height: number } {
  const element = typeof parent === "string" ? document.getElementById(parent) : parent;
  return {
    width: Math.max(1, element?.clientWidth ?? window.innerWidth),
    height: Math.max(1, element?.clientHeight ?? window.innerHeight)
  };
}

export function createSignalArenaGame(parent: HTMLElement | string = "game-root"): Phaser.Game {
  const flow = createScenarioFlow(createDefaultApiClient());
  const viewport = getInitialViewport(parent);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: viewport.width,
    height: viewport.height,
    backgroundColor: "#07131c",
    callbacks: {
      preBoot: (bootedGame) => {
        bootedGame.registry.set("flow", flow);
      }
    },
    scene: [
      BootScene,
      ScenarioBriefScene,
      DecisionWorkspaceScene,
      HistoricalRevealScene,
      DebriefScene,
      RematchScene,
      ErrorScene
    ],
    dom: {
      createContainer: true
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: viewport.width,
      height: viewport.height
    },
    render: {
      antialias: true,
      roundPixels: true
    },
    title: "Signal Arena",
    version: "client-prototype"
  });

  return game;
}
