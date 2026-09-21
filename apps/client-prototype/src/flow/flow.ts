import type { DecisionTrace, ScenarioPublicProjection, ScenarioRevealProjection, ScoreResult } from "@signal-arena/contracts/src";
import type { RunResponse } from "../api/client";

/**
 * Client flow for the production vertical slice:
 *
 *   bootstrap → hub → scenario brief → workspace → decision lock (seal)
 *   → server reveal → score breakdown → debrief/insight → rematch
 *
 * The reducer is pure: the UI layer performs the API calls and feeds the
 * results back as events. Hidden/future data can only enter the state
 * through `REVEAL_LOADED`, which is only produced after the server seal.
 */

export type FlowPhase =
  | "booting"
  | "hub"
  | "brief"
  | "workspace"
  | "sealing"
  | "sealed"
  | "revealing"
  | "reveal"
  | "error";

export type FlowError = {
  code: string;
  message: string;
};

export type FlowState = {
  phase: FlowPhase;
  userId: string | null;
  scenario: ScenarioPublicProjection | null;
  run: RunResponse | null;
  decision: DecisionTrace | null;
  reveal: ScenarioRevealProjection | null;
  score: ScoreResult | null;
  error: FlowError | null;
  busy: boolean;
};

export type FlowEvent =
  | { type: "BOOT_OK"; userId: string }
  | { type: "SCENARIO_LOADED"; scenario: ScenarioPublicProjection }
  | { type: "RUN_STARTED"; run: RunResponse }
  | { type: "RUN_RESTORED"; run: RunResponse }
  | { type: "SEAL_START"; decision: DecisionTrace }
  | { type: "SEAL_OK"; run: RunResponse }
  | { type: "REVEAL_START" }
  | {
      type: "REVEAL_OK";
      run: RunResponse;
      reveal: ScenarioRevealProjection;
      score: ScoreResult | null;
    }
  | { type: "GO_HUB" }
  | { type: "DISMISS_ERROR" }
  | { type: "FAILED"; code: string; message: string };

export const initialFlowState: FlowState = {
  phase: "booting",
  userId: null,
  scenario: null,
  run: null,
  decision: null,
  reveal: null,
  score: null,
  error: null,
  busy: false
};

function requireScenario(
  state: FlowState
): ScenarioPublicProjection {
  if (!state.scenario) {
    throw new Error("Flow requires a loaded scenario");
  }
  return state.scenario;
}

/**
 * Guard invariant: the client may only render reveal/score data after the
 * run state on the server is sealed or later.
 */
export function assertRevealAllowed(
  state: FlowState,
  event: Extract<FlowEvent, { type: "REVEAL_OK" }>
): void {
  const stateOrder: Record<FlowState["phase"], number> = {
    booting: 0,
    error: 0,
    hub: 1,
    brief: 2,
    workspace: 3,
    sealing: 4,
    sealed: 5,
    revealing: 6,
    reveal: 7
  };
  if (stateOrder[state.phase] < stateOrder.sealed) {
    throw new Error(
      "Reveal data may not be loaded before the decision is sealed"
    );
  }
  if (event.run.state === "started") {
    throw new Error(
      "Reveal data may not be loaded for a run that is still started"
    );
  }
}

export function reduceFlow(state: FlowState, event: FlowEvent): FlowState {
  switch (event.type) {
    case "BOOT_OK":
      if (state.phase !== "booting") {
        return state;
      }
      return { ...initialFlowState, userId: event.userId, phase: "hub" };

    case "SCENARIO_LOADED":
      if (state.phase !== "hub" && state.phase !== "brief") {
        return state;
      }
      return {
        ...state,
        phase: "brief",
        scenario: event.scenario,
        run: null,
        decision: null,
        reveal: null,
        score: null,
        error: null
      };

    case "RUN_STARTED":
      if (state.phase !== "brief" && state.phase !== "workspace") {
        return state;
      }
      if (state.scenario && event.run.scenarioId !== state.scenario.scenarioId) {
        return state;
      }
      return {
        ...state,
        phase: "workspace",
        run: event.run,
        decision: null,
        reveal: null,
        score: null,
        error: null
      };

    case "RUN_RESTORED":
      // Refresh recovery: the server run state is authoritative. The client
      // only remembers where to ask again — it never re-creates data.
      if (state.phase !== "brief" && state.phase !== "workspace") {
        return state;
      }
      if (state.scenario && event.run.scenarioId !== state.scenario.scenarioId) {
        return state;
      }
      return {
        ...state,
        phase: event.run.state === "started" ? "workspace" : "sealed",
        run: event.run,
        decision: event.run.decision ?? null,
        reveal: null,
        score: event.run.score ?? null,
        error: null
      };

    case "SEAL_START":
      if (state.phase !== "workspace" || !state.run) {
        return state;
      }
      return {
        ...state,
        phase: "sealing",
        decision: event.decision,
        busy: true
      };

    case "SEAL_OK":
      if (state.phase !== "sealing") {
        return state;
      }
      return {
        ...state,
        phase: "sealed",
        run: event.run,
        busy: false
      };

    case "REVEAL_START":
      if (state.phase !== "sealed") {
        return state;
      }
      return { ...state, phase: "revealing", busy: true };

    case "REVEAL_OK":
      // Out-of-order reveal events are ignored (idempotent reducer); the
      // hard invariant guard still applies once the flow is eligible.
      if (state.phase !== "sealed" && state.phase !== "revealing") {
        return state;
      }
      assertRevealAllowed(state, event);
      return {
        ...state,
        phase: "reveal",
        run: event.run,
        reveal: event.reveal,
        score: event.score,
        busy: false
      };

    case "GO_HUB":
      return {
        ...initialFlowState,
        userId: state.userId,
        phase: "hub"
      };

    case "DISMISS_ERROR":
      return state.error
        ? { ...state, error: null, phase: state.userId ? "hub" : "booting" }
        : state;

    case "FAILED":
      // A failure never advances the flow past what the server confirmed.
      const previous: FlowPhase =
        state.phase === "sealing" || state.phase === "revealing"
          ? state.phase === "sealing"
            ? "workspace"
            : "sealed"
          : state.userId
            ? "hub"
            : "booting";
      return {
        ...state,
        phase: previous,
        error: { code: event.code, message: event.message },
        busy: false
      };

    default:
      return state;
  }
}

/**
 * Which phase the UI should restore when a persisted run is found.
 * Recovery never fabricates reveal data: it asks the server for the
 * authoritative run state and only renders what the server returns.
 */
export type RecoveryPlan =
  | { action: "none" }
  | { action: "resume-workspace"; runId: string; idempotencyKey: string }
  | { action: "resume-sealed"; runId: string };

export function planRecovery(saved: {
  runId: string;
  idempotencyKey: string;
  phase: "workspace" | "sealed" | "reveal";
} | null): RecoveryPlan {
  if (!saved) {
    return { action: "none" };
  }
  if (saved.phase === "workspace") {
    return { action: "resume-workspace", runId: saved.runId, idempotencyKey: saved.idempotencyKey };
  }
  return { action: "resume-sealed", runId: saved.runId };
}

export { requireScenario };
