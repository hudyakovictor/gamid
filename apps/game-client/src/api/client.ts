import {
  ScenarioPackageSummarySchema,
  ScenarioPublicProjectionSchema,
  ScenarioRevealProjectionSchema,
  ScenarioRunStartRequestSchema,
  ScenarioRunSummarySchema,
  UserBalanceSchema,
  DecisionTraceSchema,
  ScoreResultSchema,
  type DecisionTrace,
  type ScenarioMode,
  type ScenarioPublicProjection,
  type ScenarioRevealProjection,
  type ScenarioRunState,
  type ScoreResult,
  type UserBalance
} from "@signal-arena/contracts/src";

/**
 * Typed client for the Signal Arena API v1 boundary.
 *
 * Contract invariants enforced here:
 * - every response is parsed through the versioned contracts before the UI
 *   ever sees it (the public projection schema is strict, so any hidden or
 *   future field leaking from the server fails the parse, not the render);
 * - the client never owns scoring: scores only arrive from the seal/reveal
 *   responses and are re-validated with the score contract.
 */

export type RunResponse = {
  runId: string;
  scenarioId: string;
  scenarioVersion: string;
  state: ScenarioRunState;
  createdAt: string;
  sealedAt: string | null;
  revealedAt: string | null;
  completedAt: string | null;
  decision?: DecisionTrace;
  score?: ScoreResult;
};

export type StartRunResult = {
  run: RunResponse;
  scenario: ScenarioPublicProjection;
};

export type RevealResult = {
  run: RunResponse;
  reveal: ScenarioRevealProjection;
};

export type ScenarioSummary = {
  scenarioId: string;
  version: string;
  mode: ScenarioMode;
  scenarioLevel: number;
  assetClass: string;
  assetId: string;
  marketSegment: string;
  timeframe: string;
  decisionPointT0: string;
};

export type RunSummary = {
  runId: string;
  scenarioId: string;
  scenarioVersion: string;
  state: ScenarioRunState;
  score: number | null;
  createdAt: string;
  sealedAt: string | null;
};

export type ApiErrorCode =
  | "auth_required"
  | "auth_not_configured"
  | "csrf_failed"
  | "rate_limited"
  | "invalid_request"
  | "invalid_decision"
  | "scenario_not_found"
  | "scenario_run_not_found"
  | "scenario_run_conflict"
  | "scenario_run_already_sealed"
  | "scenario_run_not_sealed"
  | "origin_not_allowed"
  | "invalid_response"
  | "network"
  | "unknown";

export class ApiError extends Error {
  public constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiClientOptions = {
  /** Base URL of the API. Defaults to same-origin (dev proxy / deployment). */
  baseUrl?: string;
  /** Injectable fetch for tests. */
  fetchImpl?: typeof fetch;
  /** Reads the CSRF cookie value; state-changing calls send it as x-sa-csrf. */
  csrfCookie?: () => string | undefined;
};

const RUN_RESPONSE_KEYS: ReadonlyArray<keyof RunResponse> = [
  "runId",
  "scenarioId",
  "scenarioVersion",
  "state",
  "createdAt",
  "sealedAt",
  "revealedAt",
  "completedAt",
  "decision",
  "score"
];

function readRunResponse(value: unknown): RunResponse {
  if (typeof value !== "object" || value === null) {
    throw new ApiError("invalid_response", "Run response is not an object", 0);
  }
  const record = value as Record<string, unknown>;
  const run: Record<string, unknown> = {};
  for (const key of RUN_RESPONSE_KEYS) {
    if (key in record) {
      run[key] = record[key];
    }
  }
  return run as unknown as RunResponse;
}

function parseScore(value: unknown): ScoreResult {
  try {
    return ScoreResultSchema.parse(value);
  } catch {
    throw new ApiError("invalid_response", "Score failed contract validation", 0);
  }
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly csrfCookie: () => string | undefined;

  public constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "";
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
    this.csrfCookie = options.csrfCookie ?? (() => undefined);
  }

  private async request<T>(
    path: string,
    init: { method: "GET" | "POST"; body?: unknown }
  ): Promise<T> {
    const headers: Record<string, string> = {
      accept: "application/json"
    };
    if (init.method === "POST") {
      headers["content-type"] = "application/json";
    }
    // All mutating operations (POST) are CSRF protected. Reveal is POST.
    if (init.method === "POST") {
      const csrf = this.csrfCookie();
      if (csrf) {
        headers["x-sa-csrf"] = csrf;
      }
    }

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: init.method,
        headers,
        credentials: "include",
        ...(init.body !== undefined
          ? { body: JSON.stringify(init.body) }
          : {})
      });
    } catch {
      throw new ApiError("network", "The API is unreachable", 0);
    }

    let payload: unknown = null;
    try {
      if (response.status !== 204) {
        payload = await response.json();
      }
    } catch {
      throw new ApiError("invalid_response", "The API returned a non-JSON response", response.status);
    }

    if (!response.ok) {
      const code =
        typeof payload === "object" &&
        payload !== null &&
        typeof (payload as { error?: unknown }).error === "string"
          ? ((payload as { error: string }).error as ApiErrorCode)
          : "unknown";
      throw new ApiError(code, response.statusText || code, response.status);
    }

    return payload as T;
  }

  public async me(): Promise<{ userId: string }> {
    const payload = await this.request<{ data: { userId: string } }>("/api/v1/users/me", {
      method: "GET"
    });
    return payload.data;
  }

  public async listScenarios(): Promise<ScenarioSummary[]> {
    const payload = await this.request<{ data: { scenarios: unknown } }>(
      "/api/v1/scenarios",
      { method: "GET" }
    );
    try {
      return ScenarioPackageSummarySchema.array().parse(payload.data.scenarios);
    } catch {
      throw new ApiError("invalid_response", "Scenario catalog failed contract validation", 0);
    }
  }

  public async getScenario(scenarioId: string, version: string): Promise<ScenarioPublicProjection> {
    const payload = await this.request<{ data: unknown }>(
      `/api/v1/scenarios/${encodeURIComponent(scenarioId)}?version=${encodeURIComponent(version)}`,
      { method: "GET" }
    );
    try {
      return ScenarioPublicProjectionSchema.parse(payload.data);
    } catch {
      throw new ApiError("invalid_response", "Scenario failed contract validation", 0);
    }
  }

  public async startRun(input: {
    scenarioId: string;
    scenarioVersion: string;
    idempotencyKey: string;
  }): Promise<StartRunResult> {
    const body = ScenarioRunStartRequestSchema.parse(input);
    const payload = await this.request<{
      data: { run: unknown; scenario: unknown };
    }>("/api/v1/scenario-runs", { method: "POST", body });
    let scenario: ScenarioPublicProjection;
    try {
      scenario = ScenarioPublicProjectionSchema.parse(payload.data.scenario);
    } catch {
      throw new ApiError("invalid_response", "Scenario failed contract validation", 0);
    }
    return {
      run: readRunResponse(payload.data.run),
      scenario
    };
  }

  public async sealRun(runId: string, decision: DecisionTrace): Promise<RunResponse> {
    const body = DecisionTraceSchema.parse(decision);
    const payload = await this.request<{ data: { run: unknown } }>(
      `/api/v1/scenario-runs/${encodeURIComponent(runId)}/seal`,
      { method: "POST", body }
    );
    return readRunResponse(payload.data.run);
  }

  public async revealRun(runId: string): Promise<RevealResult> {
    const payload = await this.request<{
      data: { run: unknown; reveal: unknown };
    }>(`/api/v1/scenario-runs/${encodeURIComponent(runId)}/reveal`, { method: "POST" });
    const run = readRunResponse(payload.data.run);
    if (run.score !== undefined) {
      run.score = parseScore(run.score);
    }
    let reveal: ScenarioRevealProjection;
    try {
      reveal = ScenarioRevealProjectionSchema.parse(payload.data.reveal);
    } catch {
      throw new ApiError("invalid_response", "Reveal failed contract validation", 0);
    }
    return { run, reveal };
  }

  /** @deprecated Use revealRun (POST) instead. Kept for compatibility, now POST. */
  public async getReveal(runId: string): Promise<RevealResult> {
    return this.revealRun(runId);
  }

  public async listRuns(userId: string): Promise<RunSummary[]> {
    const payload = await this.request<{ data: { runs: unknown } }>(
      `/api/v1/users/${encodeURIComponent(userId)}/scenario-runs`,
      { method: "GET" }
    );
    try {
      return ScenarioRunSummarySchema.array().parse(payload.data.runs);
    } catch {
      throw new ApiError("invalid_response", "Run history failed contract validation", 0);
    }
  }

  public async getBalance(userId: string): Promise<UserBalance> {
    const payload = await this.request<{ data: { balance: unknown } }>(
      `/api/v1/users/${encodeURIComponent(userId)}/balance`,
      { method: "GET" }
    );
    try {
      return UserBalanceSchema.parse(payload.data.balance);
    } catch {
      throw new ApiError("invalid_response", "Balance failed contract validation", 0);
    }
  }

  public async authTelegram(initData: string): Promise<void> {
    await this.request("/api/v1/auth/telegram", {
      method: "POST",
      body: { initData }
    });
  }

  public async logout(): Promise<void> {
    await this.request("/api/v1/auth/logout", { method: "POST" });
  }
}
