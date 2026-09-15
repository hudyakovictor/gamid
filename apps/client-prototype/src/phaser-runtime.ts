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

export function createSignalArenaGame(parent: HTMLElement | string = "game-root"): Phaser.Game {
  const flow = createScenarioFlow(createDefaultApiClient());
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: "100%",
    height: "100%",
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
      width: "100%",
      height: "100%"
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
