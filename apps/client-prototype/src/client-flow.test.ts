import assert from "node:assert/strict";
import test from "node:test";

import { starterScenario } from "../../../packages/content/src/fixtures/starter-scenario.js";
import { toPublicScenarioProjection } from "../../../packages/domain/src/scenario.js";
import type { DecisionTrace, ScenarioRevealProjection, ScoreResult } from "../../../packages/contracts/src/index.js";
import {
  ScenarioFlowController,
  type ScenarioApi,
  type ScenarioRunView
} from "./client-flow.js";

const score: ScoreResult = {
  score: 87,
  breakdown: {
    decision_quality: 88,
    protocol_adherence: 90,
    evidence_quality: 84,
    follow_up_decision_quality: 80,
    risk_management: 92,
    invalidation: 86,
    discipline: 95,
    entity_resistance: 82,
    confidence_calibration: 89
  },
  rubricVersion: "score-v1"
};

class FakeScenarioApi implements ScenarioApi {
  public readonly decisions: DecisionTrace[] = [];
  private runNumber = 0;
  private run: ScenarioRunView | undefined;

  public async getScenario(): Promise<ReturnType<typeof toPublicScenarioProjection>> {
    return toPublicScenarioProjection(starterScenario);
  }

  public async createRun(): Promise<{
    run: ScenarioRunView;
    scenario: ReturnType<typeof toPublicScenarioProjection>;
  }> {
    this.runNumber += 1;
    this.run = {
      runId: `run-${this.runNumber}`,
      scenarioId: starterScenario.scenarioId,
      scenarioVersion: starterScenario.version,
      state: "started",
      createdAt: "2026-09-15T12:00:00.000Z",
      sealedAt: null,
      revealedAt: null,
      completedAt: null
    };
    return { run: this.run, scenario: toPublicScenarioProjection(starterScenario) };
  }

  public async sealRun(runId: string, decision: DecisionTrace): Promise<ScenarioRunView> {
    assert.equal(this.run?.runId, runId);
    this.decisions.push(decision);
    this.run = {
      ...this.run,
      state: "sealed",
      sealedAt: "2026-09-15T12:01:00.000Z",
      decision
    };
    return this.run;
  }

  public async revealRun(runId: string): Promise<{
    run: ScenarioRunView;
    reveal: ScenarioRevealProjection;
  }> {
    assert.equal(this.run?.runId, runId);
    this.run = {
      ...this.run,
      state: "revealed",
      revealedAt: "2026-09-15T12:02:00.000Z",
      score
    };
    return {
      run: this.run,
      reveal: {
        scenarioId: starterScenario.scenarioId,
        version: starterScenario.version,
        hiddenEntities: starterScenario.hiddenEntities,
        historicalFutureSegment: starterScenario.historicalFutureSegment,
        historicalOutcome: starterScenario.historicalOutcome,
        evaluationRules: starterScenario.evaluationRules,
        debrief: starterScenario.debrief,
        rematchLogic: starterScenario.rematchLogic
      }
    };
  }
}

test("client flow keeps the public projection clean until the server reveal", async () => {
  const api = new FakeScenarioApi();
  const flow = new ScenarioFlowController(api, starterScenario.scenarioId, starterScenario.version);

  assert.equal((await flow.bootstrap()).stage, "brief");
  assert.equal("hiddenEntities" in (flow.state.scenario ?? {}), false);
  assert.equal((await flow.enterWorkspace()).stage, "workspace");
  flow.toggleEvidence("source_ohlcv_demo");
  flow.chooseAction("wait_for_confirmation");
  flow.setInvalidation("Close below the failed breakout level.");

  assert.deepEqual(flow.buildDecisionTrace(), {
    action: "wait_for_confirmation",
    evidenceSourceIds: ["source_ohlcv_demo"],
    invalidation: "Close below the failed breakout level.",
    confidence: 50
  });
  assert.equal((await flow.seal()).stage, "revealing");
  const debrief = await flow.reveal();
  assert.equal(debrief.stage, "debrief");
  assert.deepEqual(debrief.run?.score, score);
  assert.deepEqual(debrief.reveal?.hiddenEntities, ["fake_breakout_phantom"]);
  assert.equal(api.decisions.length, 1);
});

test("client flow rejects a seal without evidence and invalidation", async () => {
  const api = new FakeScenarioApi();
  const flow = new ScenarioFlowController(api, starterScenario.scenarioId, starterScenario.version);
  await flow.bootstrap();
  await flow.enterWorkspace();
  flow.chooseAction("wait_for_confirmation");

  assert.throws(() => flow.buildDecisionTrace(), /evidence source/);
});
