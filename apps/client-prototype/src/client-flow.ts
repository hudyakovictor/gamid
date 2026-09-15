import type {
  DecisionTrace,
  ScenarioPublicProjection,
  ScenarioRevealProjection,
  ScoreResult
} from "../../../packages/contracts/src/index.js";

export type ScenarioRunView = {
  runId: string;
  scenarioId: string;
  scenarioVersion: string;
  state: "started" | "sealed" | "revealed" | "completed";
  createdAt: string;
  sealedAt: string | null;
  revealedAt: string | null;
  completedAt: string | null;
  decision?: DecisionTrace;
  score?: ScoreResult;
};

export type ScenarioApi = {
  getScenario(scenarioId: string, version: string): Promise<ScenarioPublicProjection>;
  createRun(input: {
    scenarioId: string;
    scenarioVersion: string;
    idempotencyKey: string;
  }): Promise<{ run: ScenarioRunView; scenario: ScenarioPublicProjection }>;
  sealRun(runId: string, decision: DecisionTrace): Promise<ScenarioRunView>;
  revealRun(runId: string): Promise<{
    run: ScenarioRunView;
    reveal: ScenarioRevealProjection;
  }>;
};

export type FlowStage =
  | "boot"
  | "brief"
  | "workspace"
  | "sealing"
  | "revealing"
  | "debrief"
  | "rematch"
  | "error";

export type ClientFlowState = {
  stage: FlowStage;
  scenario: ScenarioPublicProjection | null;
  run: ScenarioRunView | null;
  reveal: ScenarioRevealProjection | null;
  selectedEvidenceSourceIds: string[];
  action: DecisionTrace["action"] | null;
  invalidation: string;
  confidence: number;
  errorMessage: string | null;
};

const INITIAL_STATE: ClientFlowState = {
  stage: "boot",
  scenario: null,
  run: null,
  reveal: null,
  selectedEvidenceSourceIds: [],
  action: null,
  invalidation: "",
  confidence: 50,
  errorMessage: null
};

function createIdempotencyKey(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${uuid ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The scenario service is unavailable.";
}

export class ScenarioFlowController {
  private currentState: ClientFlowState = { ...INITIAL_STATE };

  public constructor(
    private readonly api: ScenarioApi,
    private readonly scenarioId: string,
    private readonly scenarioVersion: string
  ) {}

  public get state(): ClientFlowState {
    return {
      ...this.currentState,
      selectedEvidenceSourceIds: [...this.currentState.selectedEvidenceSourceIds]
    };
  }

  public async bootstrap(): Promise<ClientFlowState> {
    this.currentState = { ...INITIAL_STATE, stage: "boot" };
    try {
      const scenario = await this.api.getScenario(this.scenarioId, this.scenarioVersion);
      this.currentState = {
        ...this.currentState,
        stage: "brief",
        scenario,
        errorMessage: null
      };
    } catch (error) {
      this.fail(error);
    }
    return this.state;
  }

  public async enterWorkspace(): Promise<ClientFlowState> {
    if (this.currentState.stage !== "brief" || !this.currentState.scenario) {
      throw new Error("Scenario brief is not ready");
    }

    try {
      const result = await this.api.createRun({
        scenarioId: this.currentState.scenario.scenarioId,
        scenarioVersion: this.currentState.scenario.version,
        idempotencyKey: createIdempotencyKey("scenario-run")
      });
      this.currentState = {
        ...this.currentState,
        stage: "workspace",
        run: result.run,
        scenario: result.scenario,
        errorMessage: null
      };
    } catch (error) {
      this.fail(error);
    }
    return this.state;
  }

  public toggleEvidence(sourceId: string): ClientFlowState {
    if (this.currentState.stage !== "workspace" || !this.currentState.scenario) {
      return this.state;
    }
    const available = this.currentState.scenario.availableSources.some(
      (source) => source.sourceId === sourceId
    );
    if (!available) {
      return this.state;
    }
    const selected = this.currentState.selectedEvidenceSourceIds;
    this.currentState = {
      ...this.currentState,
      selectedEvidenceSourceIds: selected.includes(sourceId)
        ? selected.filter((id) => id !== sourceId)
        : [...selected, sourceId]
    };
    return this.state;
  }

  public chooseAction(action: DecisionTrace["action"]): ClientFlowState {
    if (
      this.currentState.stage === "workspace"
      && this.currentState.scenario?.allowedActions.includes(action)
    ) {
      this.currentState = { ...this.currentState, action };
    }
    return this.state;
  }

  public setInvalidation(invalidation: string): ClientFlowState {
    if (this.currentState.stage === "workspace") {
      this.currentState = { ...this.currentState, invalidation };
    }
    return this.state;
  }

  public setConfidence(confidence: number): ClientFlowState {
    if (this.currentState.stage === "workspace") {
      this.currentState = {
        ...this.currentState,
        confidence: Math.max(0, Math.min(100, Math.round(confidence)))
      };
    }
    return this.state;
  }

  public buildDecisionTrace(): DecisionTrace {
    if (!this.currentState.run || this.currentState.run.state !== "started") {
      throw new Error("Scenario run is not open");
    }
    if (!this.currentState.action) {
      throw new Error("Choose a decision action before sealing");
    }
    if (this.currentState.selectedEvidenceSourceIds.length === 0) {
      throw new Error("Select at least one available evidence source");
    }
    if (!this.currentState.invalidation.trim()) {
      throw new Error("Define an invalidation before sealing");
    }

    return {
      action: this.currentState.action,
      evidenceSourceIds: [...this.currentState.selectedEvidenceSourceIds],
      invalidation: this.currentState.invalidation.trim(),
      confidence: this.currentState.confidence
    };
  }

  public async seal(): Promise<ClientFlowState> {
    const decision = this.buildDecisionTrace();
    const openRun = this.currentState.run;
    if (!openRun) {
      throw new Error("Scenario run is not open");
    }

    this.currentState = { ...this.currentState, stage: "sealing", errorMessage: null };
    try {
      const run = await this.api.sealRun(openRun.runId, decision);
      this.currentState = { ...this.currentState, stage: "revealing", run };
    } catch (error) {
      this.fail(error);
    }
    return this.state;
  }

  public async reveal(): Promise<ClientFlowState> {
    const sealedRun = this.currentState.run;
    if (!sealedRun || sealedRun.state === "started") {
      throw new Error("Scenario must be sealed before reveal");
    }

    this.currentState = { ...this.currentState, stage: "revealing", errorMessage: null };
    try {
      const result = await this.api.revealRun(sealedRun.runId);
      this.currentState = {
        ...this.currentState,
        stage: "debrief",
        run: result.run,
        reveal: result.reveal
      };
    } catch (error) {
      this.fail(error);
    }
    return this.state;
  }

  public openRematch(): ClientFlowState {
    if (this.currentState.stage === "debrief") {
      this.currentState = { ...this.currentState, stage: "rematch" };
    }
    return this.state;
  }

  public async beginRematch(): Promise<ClientFlowState> {
    if (this.currentState.stage !== "rematch" || !this.currentState.scenario) {
      throw new Error("Rematch is not available");
    }
    try {
      const result = await this.api.createRun({
        scenarioId: this.currentState.scenario.scenarioId,
        scenarioVersion: this.currentState.scenario.version,
        idempotencyKey: createIdempotencyKey("delayed-rematch")
      });
      this.currentState = {
        ...INITIAL_STATE,
        stage: "workspace",
        scenario: result.scenario,
        run: result.run
      };
    } catch (error) {
      this.fail(error);
    }
    return this.state;
  }

  public fail(error: unknown): ClientFlowState {
    this.currentState = {
      ...this.currentState,
      stage: "error",
      errorMessage: asErrorMessage(error)
    };
    return this.state;
  }
}

export function createScenarioFlow(api: ScenarioApi): ScenarioFlowController {
  return new ScenarioFlowController(api, "foundation-false-breakout-001", "1.0.0");
}
