import { z } from "zod";

import {
  DecisionTraceSchema,
  ScenarioPublicProjectionSchema,
  ScenarioRevealProjectionSchema,
  ScenarioRunStateSchema,
  ScoreResultSchema,
  type DecisionTrace,
  type ScenarioPublicProjection
} from "../../../packages/contracts/src/index.js";
import type { ScenarioApi, ScenarioRunView } from "./client-flow.js";

const RunResponseSchema = z.object({
  runId: z.string().min(1),
  scenarioId: z.string().min(1),
  scenarioVersion: z.string().min(1),
  state: ScenarioRunStateSchema,
  createdAt: z.string().min(1),
  sealedAt: z.string().nullable(),
  revealedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  decision: z.unknown().optional(),
  score: z.unknown().optional()
}).passthrough();

const FetchResponseSchema = z.object({
  data: z.unknown()
}).strict();

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

type ApiClientOptions = {
  baseUrl?: string;
  fetcher?: FetchLike;
};

function parseRun(value: unknown): ScenarioRunView {
  const run = RunResponseSchema.parse(value);
  const decision = run.decision === undefined
    ? {}
    : { decision: DecisionTraceSchema.parse(run.decision) };
  const score = run.score === undefined
    ? {}
    : { score: ScoreResultSchema.parse(run.score) };

  return {
    runId: run.runId,
    scenarioId: run.scenarioId,
    scenarioVersion: run.scenarioVersion,
    state: run.state,
    createdAt: run.createdAt,
    sealedAt: run.sealedAt,
    revealedAt: run.revealedAt,
    completedAt: run.completedAt,
    ...decision,
    ...score
  };
}

function readData(value: unknown): unknown {
  return FetchResponseSchema.parse(value).data;
}

async function readResponse(response: Response): Promise<unknown> {
  const payload: unknown = await response.json();
  if (!response.ok) {
    const message = z.object({ error: z.string().optional(), message: z.string().optional() })
      .passthrough()
      .safeParse(payload);
    throw new Error(
      message.success
        ? (message.data.message ?? message.data.error ?? `API request failed: ${response.status}`)
        : `API request failed: ${response.status}`
    );
  }
  return payload;
}

export class SignalArenaApiClient implements ScenarioApi {
  private readonly baseUrl: string;
  private readonly fetcher: FetchLike;

  public constructor(options: ApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "").replace(/\/$/, "");
    this.fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  }

  private requestUrl(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  public async getScenario(
    scenarioId: string,
    version: string
  ): Promise<ScenarioPublicProjection> {
    const response = await this.fetcher(
      this.requestUrl(`/api/v1/scenarios/${encodeURIComponent(scenarioId)}?version=${encodeURIComponent(version)}`),
      { headers: { accept: "application/json" } }
    );
    const data = readData(await readResponse(response));
    return ScenarioPublicProjectionSchema.parse(data);
  }

  public async createRun(input: {
    scenarioId: string;
    scenarioVersion: string;
    idempotencyKey: string;
  }): Promise<{ run: ScenarioRunView; scenario: ScenarioPublicProjection }> {
    const response = await this.fetcher(this.requestUrl("/api/v1/scenario-runs"), {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(input)
    });
    const data = z.object({ run: z.unknown(), scenario: z.unknown() }).strict()
      .parse(readData(await readResponse(response)));
    return {
      run: parseRun(data.run),
      scenario: ScenarioPublicProjectionSchema.parse(data.scenario)
    };
  }

  public async sealRun(runId: string, decision: DecisionTrace): Promise<ScenarioRunView> {
    const response = await this.fetcher(
      this.requestUrl(`/api/v1/scenario-runs/${encodeURIComponent(runId)}/seal`),
      {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(decision)
      }
    );
    const data = z.object({ run: z.unknown() }).strict()
      .parse(readData(await readResponse(response)));
    return parseRun(data.run);
  }

  public async revealRun(runId: string): Promise<{
    run: ScenarioRunView;
    reveal: ReturnType<typeof ScenarioRevealProjectionSchema.parse>;
  }> {
    const response = await this.fetcher(
      this.requestUrl(`/api/v1/scenario-runs/${encodeURIComponent(runId)}/reveal`),
      { headers: { accept: "application/json" } }
    );
    const data = z.object({ run: z.unknown(), reveal: z.unknown() }).strict()
      .parse(readData(await readResponse(response)));
    return {
      run: parseRun(data.run),
      reveal: ScenarioRevealProjectionSchema.parse(data.reveal)
    };
  }
}

export function createDefaultApiClient(): SignalArenaApiClient {
  const configuredEnv = (import.meta as ImportMeta & {
    env?: { VITE_API_BASE_URL?: string };
  }).env;
  return new SignalArenaApiClient({
    ...(configuredEnv?.VITE_API_BASE_URL
      ? { baseUrl: configuredEnv.VITE_API_BASE_URL }
      : {})
  });
}
