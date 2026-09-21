import { describe, expect, it } from "vitest";

import {
  ScenarioPackageSchema,
  type DecisionTrace
} from "@signal-arena/contracts/src";

import { starterScenarioFixture } from "./fixtures";
import {
  assertRevealAllowed,
  initialFlowState,
  planRecovery,
  reduceFlow,
  type FlowState
} from "./flow";

const scenario = ScenarioPackageSchema.parse(starterScenarioFixture);
const reveal = {
  scenarioId: scenario.scenarioId,
  version: scenario.version,
  hiddenEntities: scenario.hiddenEntities,
  historicalFutureSegment: scenario.historicalFutureSegment,
  historicalOutcome: scenario.historicalOutcome,
  evaluationRules: scenario.evaluationRules,
  debrief: scenario.debrief,
  rematchLogic: scenario.rematchLogic
};

function stateAt(
  phase: FlowState["phase"],
  overrides: Partial<FlowState> = {}
): FlowState {
  const base = reduceFlow(
    reduceFlow(initialFlowState, { type: "BOOT_OK", userId: "user-1" }),
    { type: "SCENARIO_LOADED", scenario }
  );
  if (phase === "booting") {
    return initialFlowState;
  }
  if (phase === "hub") {
    return { ...base, scenario: null };
  }
  if (phase === "brief") {
    return base;
  }
  if (phase === "workspace") {
    return reduceFlow(base, {
      type: "RUN_STARTED",
      run: makeRun("started")
    });
  }
  const workspace = reduceFlow(base, {
    type: "RUN_STARTED",
    run: makeRun("started")
  });
  const sealing = reduceFlow(workspace, {
    type: "SEAL_START",
    decision: makeDecision()
  });
  if (phase === "sealing") {
    return sealing;
  }
  const sealed = reduceFlow(sealing, {
    type: "SEAL_OK",
    run: makeRun("sealed")
  });
  if (phase === "sealed") {
    return sealed;
  }
  if (phase === "revealing") {
    return reduceFlow(sealed, { type: "REVEAL_START" });
  }
  if (phase === "reveal") {
    return reduceFlow(sealed, {
      type: "REVEAL_OK",
      run: makeRun("revealed"),
      reveal,
      score: {
        score: 87,
        rubricVersion: "score-v1",
        breakdown: {
          decision_quality: 88,
          protocol_adherence: 90,
          evidence_quality: 100,
          follow_up_decision_quality: 86,
          risk_management: 90,
          invalidation: 76,
          discipline: 94,
          entity_resistance: 90,
          confidence_calibration: 80
        }
      }
    });
  }
  return { ...base, phase, ...overrides };
}

function makeRun(state: "started" | "sealed" | "revealed") {
  return {
    runId: "run-1",
    scenarioId: scenario.scenarioId,
    scenarioVersion: scenario.version,
    state,
    createdAt: "2026-09-21T10:00:00.000Z",
    sealedAt: state === "started" ? null : "2026-09-21T10:05:00.000Z",
    revealedAt: state === "revealed" ? "2026-09-21T10:06:00.000Z" : null,
    completedAt: null
  } as const;
}

function makeDecision(): DecisionTrace {
  return {
    action: "wait_for_confirmation",
    evidenceSourceIds: ["source_ohlcv_demo", "source_volume_demo"],
    invalidation: "Close below the failed breakout level.",
    confidence: 72
  };
}

describe("flow reducer", () => {
  it("boots into the hub and loads a scenario brief", () => {
    const booted = reduceFlow(initialFlowState, {
      type: "BOOT_OK",
      userId: "user-1"
    });
    expect(booted.phase).toBe("hub");

    const briefed = reduceFlow(booted, {
      type: "SCENARIO_LOADED",
      scenario
    });
    expect(briefed.phase).toBe("brief");
    expect(briefed.scenario?.scenarioId).toBe(scenario.scenarioId);
  });

  it("runs the full vertical slice in order", () => {
    let state = stateAt("brief");
    state = reduceFlow(state, { type: "RUN_STARTED", run: makeRun("started") });
    expect(state.phase).toBe("workspace");
    expect(state.run?.state).toBe("started");

    state = reduceFlow(state, { type: "SEAL_START", decision: makeDecision() });
    expect(state.phase).toBe("sealing");
    expect(state.busy).toBe(true);

    state = reduceFlow(state, { type: "SEAL_OK", run: makeRun("sealed") });
    expect(state.phase).toBe("sealed");
    expect(state.busy).toBe(false);

    state = reduceFlow(state, { type: "REVEAL_START" });
    expect(state.phase).toBe("revealing");

    state = reduceFlow(state, {
      type: "REVEAL_OK",
      run: makeRun("revealed"),
      reveal,
      score: null
    });
    expect(state.phase).toBe("reveal");
    expect(state.reveal?.historicalOutcome.outcomeId).toBe(
      "false-breakout-reversal"
    );
  });

  it("never exposes reveal data before seal", () => {
    const brief = stateAt("brief");
    const event = {
      type: "REVEAL_OK",
      run: makeRun("revealed"),
      reveal,
      score: null
    } as const;
    expect(() => assertRevealAllowed(brief, event)).toThrow();

    const workspace = stateAt("workspace");
    expect(() =>
      assertRevealAllowed(workspace, {
        ...event,
        run: makeRun("started")
      })
    ).toThrow();

    const sealed = stateAt("sealed");
    expect(() => assertRevealAllowed(sealed, event)).not.toThrow();
  });

  it("rejects reveal data for a run that is still started", () => {
    const sealed = stateAt("sealed");
    expect(() =>
      assertRevealAllowed(sealed, {
        type: "REVEAL_OK",
        run: makeRun("started"),
        reveal,
        score: null
      })
    ).toThrow();
  });

  it("rolls sealing failures back to the workspace without data loss", () => {
    const sealing = stateAt("sealing");
    const failed = reduceFlow(sealing, {
      type: "FAILED",
      code: "invalid_decision",
      message: "Decision evidence source is unavailable"
    });
    expect(failed.phase).toBe("workspace");
    expect(failed.error?.code).toBe("invalid_decision");
    expect(failed.run?.runId).toBe("run-1");
  });

  it("rolls reveal failures back to sealed and can retry", () => {
    const revealing = stateAt("revealing");
    const failed = reduceFlow(revealing, {
      type: "FAILED",
      code: "network",
      message: "The API is unreachable"
    });
    expect(failed.phase).toBe("sealed");

    const retried = reduceFlow(failed, { type: "REVEAL_START" });
    expect(retried.phase).toBe("revealing");
  });

  it("ignores out-of-order events instead of corrupting state", () => {
    const hub = stateAt("hub");
    const unchanged = reduceFlow(hub, {
      type: "REVEAL_OK",
      run: makeRun("revealed"),
      reveal,
      score: null
    });
    expect(unchanged).toBe(hub);

    const brief = stateAt("brief");
    const skipped = reduceFlow(brief, {
      type: "SEAL_OK",
      run: makeRun("sealed")
    });
    expect(skipped.phase).toBe("brief");
  });

  it("ignores a run started for a different scenario", () => {
    const brief = stateAt("brief");
    const other = { ...makeRun("started"), scenarioId: "other-scenario" };
    const skipped = reduceFlow(brief, { type: "RUN_STARTED", run: other });
    expect(skipped.phase).toBe("brief");
  });

  it("returns to the hub and clears run state", () => {
    const revealed = stateAt("reveal");
    const hub = reduceFlow(revealed, { type: "GO_HUB" });
    expect(hub.phase).toBe("hub");
    expect(hub.run).toBeNull();
    expect(hub.reveal).toBeNull();
    expect(hub.score).toBeNull();
    expect(hub.userId).toBe("user-1");
  });

  it("plans recovery from persisted runs without revealing anything", () => {
    expect(planRecovery(null)).toEqual({ action: "none" });
    expect(
      planRecovery({
        runId: "run-1",
        idempotencyKey: "k1",
        phase: "workspace"
      })
    ).toEqual({
      action: "resume-workspace",
      runId: "run-1",
      idempotencyKey: "k1"
    });
    expect(
      planRecovery({ runId: "run-2", idempotencyKey: "k2", phase: "sealed" })
    ).toEqual({ action: "resume-sealed", runId: "run-2" });
    expect(
      planRecovery({ runId: "run-3", idempotencyKey: "k3", phase: "reveal" })
    ).toEqual({ action: "resume-sealed", runId: "run-3" });
  });
});
