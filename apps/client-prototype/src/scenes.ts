import Phaser from "phaser";

import type { ScenarioFlowController, ClientFlowState } from "./client-flow.js";
import {
  addButton,
  addChartFrame,
  addInvalidationInput,
  addSectionCard,
  addText,
  announce,
  COLORS
} from "./phaser-ui.js";

function flowFor(scene: Phaser.Scene): ScenarioFlowController {
  return scene.registry.get("flow") as ScenarioFlowController;
}

function widthFor(scene: Phaser.Scene): number {
  return Math.max(320, scene.scale.width);
}

function contentLeft(scene: Phaser.Scene, contentWidth = 900): number {
  return Math.max(20, (widthFor(scene) - Math.min(widthFor(scene) - 40, contentWidth)) / 2 + 20);
}

function goToState(scene: Phaser.Scene, state: ClientFlowState): void {
  const target = state.stage === "brief"
    ? "ScenarioBriefScene"
    : state.stage === "workspace"
      ? "DecisionWorkspaceScene"
      : state.stage === "revealing"
        ? "HistoricalRevealScene"
        : state.stage === "debrief"
          ? "DebriefScene"
          : state.stage === "rematch"
            ? "RematchScene"
            : "ErrorScene";
  scene.scene.start(target);
}

function showHeader(scene: Phaser.Scene, eyebrow: string, title: string): void {
  addText(scene, contentLeft(scene), 22, eyebrow, 12, "#19d9ff");
  addText(scene, contentLeft(scene), 48, title, 30);
}

export class BootScene extends Phaser.Scene {
  public constructor() {
    super("BootScene");
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(COLORS.background);
    const centerX = widthFor(this) / 2;
    addText(this, centerX, 260, "SIGNAL ARENA", 38, "#19d9ff").setOrigin(0.5);
    addText(this, centerX, 315, "Loading point-in-time scenario…", 16, COLORS.muted).setOrigin(0.5);
    announce("Signal Arena is loading the scenario.");

    const flow = flowFor(this);
    void flow.bootstrap().then((state) => {
      if (state.stage === "brief") {
        this.scene.start("ScenarioBriefScene");
      } else {
        this.scene.start("ErrorScene");
      }
    });
  }
}

export class ScenarioBriefScene extends Phaser.Scene {
  public constructor() {
    super("ScenarioBriefScene");
  }

  public create(): void {
    const flow = flowFor(this);
    const state = flow.state;
    const scenario = state.scenario;
    if (!scenario) {
      this.scene.start("ErrorScene");
      return;
    }

    showHeader(this, "SCENARIO BRIEF", "Read the setup before acting");
    announce("Scenario brief ready. Review the point-in-time evidence boundary.");
    const left = contentLeft(this);
    const compact = widthFor(this) < 760;
    const cardWidth = compact ? widthFor(this) - 40 : Math.min(widthFor(this) - 40, 430);
    const cardY = 110;
    const firstCardHeight = compact ? 220 : 270;
    addSectionCard(this, left, cardY, cardWidth, firstCardHeight);
    addText(this, left + 20, cardY + 22, `${scenario.assetId} · ${scenario.timeframe}`, 20);
    addText(this, left + 20, cardY + 62, `Decision point: ${scenario.decisionPoint.t0}`, 14, COLORS.muted);
    addText(this, left + 20, cardY + 98, "Available before Seal", 13, "#19d9ff");
    scenario.availableSources.forEach((source, index) => {
      addText(
        this,
        left + 24,
        cardY + 130 + index * 30,
        `${source.sourceGroup} · ${source.sourceId}`,
        14,
        COLORS.text
      );
    });
    addText(this, left + 20, cardY + (compact ? 180 : 220), "Future candles, hidden Entity and score remain server-only.", 12, COLORS.muted);

    const right = compact ? left : left + cardWidth + 24;
    const rightCardWidth = compact ? cardWidth : Math.min(cardWidth, widthFor(this) - right - 20);
    const rightCardY = compact ? 360 : cardY;
    const rightCardHeight = compact ? 250 : 270;
    addSectionCard(this, right, rightCardY, rightCardWidth, rightCardHeight);
    addText(this, right + 20, rightCardY + 22, "Guided loadout", 20);
    addText(this, right + 20, rightCardY + 64, `Cards: ${scenario.availableCards.join(" · ")}`, 13, COLORS.muted);
    addText(this, right + 20, rightCardY + 112, `Protocols: ${scenario.activeProtocols.join(" · ")}`, 13, COLORS.muted);
    addText(this, right + 20, rightCardY + 170, `Allowed: ${scenario.allowedActions.join(" · ")}`, 13, COLORS.muted);

    addButton(
      this,
      widthFor(this) / 2,
      compact ? 680 : 460,
      Math.min(320, widthFor(this) - 40),
      52,
      "Enter decision workspace",
      () => {
        void flow.enterWorkspace().then((next) => goToState(this, next));
      },
      true
    );
    addText(this, widthFor(this) / 2, compact ? 645 : 520, "No future leak · Seal is irreversible", 13, COLORS.muted).setOrigin(0.5);
  }
}

export class DecisionWorkspaceScene extends Phaser.Scene {
  public constructor() {
    super("DecisionWorkspaceScene");
  }

  public create(): void {
    const flow = flowFor(this);
    const state = flow.state;
    const scenario = state.scenario;
    if (!scenario || !state.run) {
      this.scene.start("ErrorScene");
      return;
    }

    showHeader(this, "DECISION WORKSPACE · STEP 1 / 4", "Evidence → risk → decision");
    announce("Decision workspace ready. Select evidence and a decision action.");
    const left = contentLeft(this);
    const compact = widthFor(this) < 600;
    const cardWidth = Math.min(widthFor(this) - 40, 900);
    addChartFrame(this, left, 100, cardWidth, compact ? 170 : 190);

    const evidenceY = compact ? 295 : 315;
    addText(this, left, evidenceY, "Evidence tray", 17);
    const sourceWidth = Math.min(180, Math.max(120, (cardWidth - 12) / Math.max(1, scenario.availableSources.length)));
    scenario.availableSources.forEach((source, index) => {
      const selected = state.selectedEvidenceSourceIds.includes(source.sourceId);
      addButton(
        this,
        left + sourceWidth / 2 + index * (sourceWidth + 8),
        evidenceY + 45,
        sourceWidth,
        44,
        `${selected ? "✓ " : ""}${source.sourceGroup}`,
        () => {
          flow.toggleEvidence(source.sourceId);
          this.scene.restart();
        },
        selected
      );
    });

    const actionColumns = compact ? 2 : Math.min(4, scenario.allowedActions.length);
    const actionY = evidenceY + 95;
    addText(this, left, actionY - 45, "Decision action", 17);
    const actions = scenario.allowedActions;
    const actionWidth = Math.min(150, Math.max(108, (cardWidth - (actionColumns - 1) * 8) / actionColumns));
    actions.slice(0, 4).forEach((action, index) => {
      const selected = state.action === action;
      const column = index % actionColumns;
      const row = Math.floor(index / actionColumns);
      addButton(
        this,
        left + actionWidth / 2 + column * (actionWidth + 8),
        actionY + row * 50,
        actionWidth,
        42,
        `${selected ? "✓ " : ""}${action.replaceAll("_", " ").toUpperCase()}`,
        () => {
          flow.chooseAction(action);
          this.scene.restart();
        },
        selected
      );
    });

    const actionRows = Math.ceil(Math.min(4, actions.length) / actionColumns);
    const invalidationLabelY = actionY + actionRows * 50 + 4;
    addText(this, left, invalidationLabelY, "Invalidation", 17);
    addInvalidationInput(this, left, invalidationLabelY + 40, Math.min(cardWidth, 560), state.invalidation, (value) => {
      flow.setInvalidation(value);
    });
    const confidenceY = invalidationLabelY + 92;
    addText(this, left, confidenceY, `Confidence: ${state.confidence}%`, 15, COLORS.muted);
    addButton(this, left + 270, confidenceY, 42, 34, "−", () => {
      flow.setConfidence(state.confidence - 5);
      this.scene.restart();
    });
    addButton(this, left + 322, confidenceY, 42, 34, "+", () => {
      flow.setConfidence(state.confidence + 5);
      this.scene.restart();
    });

    const sealY = confidenceY + 90;
    addButton(this, widthFor(this) / 2, sealY, Math.min(320, widthFor(this) - 40), 52, "Seal decision", () => {
      try {
        void flow.seal().then((next) => goToState(this, next));
      } catch (error) {
        flow.fail(error);
        this.scene.start("ErrorScene");
      }
    }, true);
    addText(this, widthFor(this) / 2, sealY + 55, "After Seal, controls freeze and the server resolves the scenario.", 12, COLORS.muted).setOrigin(0.5);
  }
}

export class HistoricalRevealScene extends Phaser.Scene {
  public constructor() {
    super("HistoricalRevealScene");
  }

  public create(): void {
    const flow = flowFor(this);
    const state = flow.state;
    if (!state.run) {
      this.scene.start("ErrorScene");
      return;
    }

    showHeader(this, "HISTORICAL REVEAL", "The sealed result is now explainable");
    addText(this, widthFor(this) / 2, 118, "Resolving server-side history…", 18, COLORS.muted).setOrigin(0.5);
    announce("The decision is sealed. Resolving the historical reveal.");
    void flow.reveal().then((next) => {
      if (next.stage === "debrief" && next.reveal && next.run) {
        this.renderReveal(next);
      } else {
        this.scene.start("ErrorScene");
      }
    });
  }

  private renderReveal(state: ClientFlowState): void {
    if (!state.reveal || !state.run) {
      this.scene.start("ErrorScene");
      return;
    }
    this.children.removeAll(true);
    showHeader(this, "HISTORICAL REVEAL", "The sealed result is now explainable");
    announce("Historical future, hidden Entity and process score are revealed.");
    const left = contentLeft(this);
    const width = Math.min(widthFor(this) - 40, 900);
    addSectionCard(this, left, 105, width, 160);
    addText(this, left + 20, 128, "Future segment", 19);
    addText(this, left + 20, 170, `${state.reveal.historicalFutureSegment.from} → ${state.reveal.historicalFutureSegment.to}`, 14, COLORS.muted);
    addText(this, left + 20, 210, state.reveal.historicalOutcome.summary, 15);

    addSectionCard(this, left, 290, width, 150);
    addText(this, left + 20, 314, "Entity reveal", 19);
    addText(this, left + 20, 356, state.reveal.hiddenEntities.join(" · "), 16, "#ffd54a");
    addText(this, left + 20, 392, "Delivered only after the server accepted Seal.", 13, COLORS.muted);

    addButton(this, widthFor(this) / 2, 520, Math.min(320, widthFor(this) - 40), 52, "Continue to debrief", () => {
      this.scene.start("DebriefScene");
    }, true);
  }
}

export class DebriefScene extends Phaser.Scene {
  public constructor() {
    super("DebriefScene");
  }

  public create(): void {
    const flow = flowFor(this);
    const state = flow.state;
    const score = state.run?.score;
    if (!score || !state.reveal) {
      this.scene.start("ErrorScene");
      return;
    }

    showHeader(this, "DEBRIEF", "Process quality before outcome");
    announce(`Decision quality score ${score.score} out of 100. Review the process dimensions.`);
    const left = contentLeft(this);
    const width = Math.min(widthFor(this) - 40, 900);
    addSectionCard(this, left, 105, width, 150);
    addText(this, left + 24, 130, `Decision Quality · ${score.score} / 100`, 25, "#53f2b2");
    addText(this, left + 24, 180, "The score is server-authoritative and does not use Pips, Stars or a lucky outcome.", 14, COLORS.muted);

    const entries = Object.entries(score.breakdown);
    entries.forEach(([dimension, value], index) => {
      const y = 285 + index * 37;
      addText(this, left, y, dimension.replaceAll("_", " "), 14);
      addText(this, left + width - 45, y, String(value), 14, value >= 80 ? "#53f2b2" : "#ffd54a").setOrigin(1, 0);
      const bar = this.add.rectangle(left, y + 24, Math.max(20, width - 20) * (value / 100), 5, value >= 80 ? COLORS.green : COLORS.gold, 1);
      bar.setOrigin(0, 0);
    });

    addButton(this, widthFor(this) / 2, 660, Math.min(320, widthFor(this) - 40), 52, "Open delayed rematch", () => {
      flow.openRematch();
      this.scene.start("RematchScene");
    }, true);
  }
}

export class RematchScene extends Phaser.Scene {
  public constructor() {
    super("RematchScene");
  }

  public create(): void {
    const flow = flowFor(this);
    const state = flow.state;
    const scenario = state.scenario;
    const rematchLogic = state.reveal?.rematchLogic;
    if (!scenario || !rematchLogic) {
      this.scene.start("ErrorScene");
      return;
    }

    showHeader(this, "REMATCH", "Return the skill after a delay");
    announce("A delayed rematch is available for the target skill.");
    const left = contentLeft(this);
    const width = Math.min(widthFor(this) - 40, 700);
    addSectionCard(this, left, 120, width, 230);
    addText(this, left + 24, 148, rematchLogic.targetSkillId, 24);
    addText(this, left + 24, 200, "Constraints", 15, "#19d9ff");
    rematchLogic.scenarioConstraints.forEach((constraint, index) => {
      addText(this, left + 28, 235 + index * 30, `• ${constraint}`, 15, COLORS.muted);
    });
    addButton(this, widthFor(this) / 2, 450, Math.min(320, widthFor(this) - 40), 52, "Start rematch", () => {
      void flow.beginRematch().then((next) => goToState(this, next));
    }, true);
  }
}

export class ErrorScene extends Phaser.Scene {
  public constructor() {
    super("ErrorScene");
  }

  public create(): void {
    const flow = flowFor(this);
    const message = flow.state.errorMessage ?? "The client could not load the scenario.";
    showHeader(this, "RECOVERY", "The scenario is not ready");
    addText(this, contentLeft(this), 130, message, 17, "#ff6f91");
    addText(this, contentLeft(this), 190, "No authoritative state was fabricated in the client.", 14, COLORS.muted);
    addButton(this, widthFor(this) / 2, 300, 260, 50, "Retry", () => {
      void flow.bootstrap().then((next) => goToState(this, next));
    }, true);
  }
}
