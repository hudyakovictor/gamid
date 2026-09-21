import { describe, expect, it } from "vitest";

import { ApiClient, ApiError } from "./client";
import { starterScenarioFixture } from "../flow/fixtures";

const publicProjection = {
  scenarioId: starterScenarioFixture.scenarioId,
  version: starterScenarioFixture.version,
  scenarioLevel: starterScenarioFixture.scenarioLevel,
  mode: starterScenarioFixture.mode,
  assetClass: starterScenarioFixture.assetClass,
  assetId: starterScenarioFixture.assetId,
  marketSegment: starterScenarioFixture.marketSegment,
  timeframe: starterScenarioFixture.timeframe,
  decisionPoint: starterScenarioFixture.decisionPoint,
  availableSourceGroups: starterScenarioFixture.availableSourceGroups,
  availableSources: starterScenarioFixture.availableSources,
  availableCards: starterScenarioFixture.availableCards,
  activeProtocols: starterScenarioFixture.activeProtocols,
  allowedActions: starterScenarioFixture.allowedActions,
  contentVersion: starterScenarioFixture.contentVersion,
  dataVersion: starterScenarioFixture.dataVersion,
  futureHash: starterScenarioFixture.futureHash,
  locale: starterScenarioFixture.locale,
  reviewStatus: starterScenarioFixture.reviewStatus
};

const run = {
  runId: "run-1",
  scenarioId: starterScenarioFixture.scenarioId,
  scenarioVersion: starterScenarioFixture.version,
  state: "started",
  createdAt: "2026-09-21T10:00:00.000Z",
  sealedAt: null,
  revealedAt: null,
  completedAt: null
};

type RecordedRequest = {
  url: string;
  method?: string;
  headers: Record<string, string>;
  body?: unknown;
};

function makeFetch(
  handler: (request: RecordedRequest) => { status?: number; body?: unknown }
) {
  const requests: RecordedRequest[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request: RecordedRequest = {
      url: String(input),
      method: init?.method,
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: init?.body ? JSON.parse(String(init.body)) : undefined
    };
    requests.push(request);
    const result = handler(request);
    return new Response(JSON.stringify(result.body ?? null), {
      status: result.status ?? 200,
      headers: { "content-type": "application/json" }
    });
  }) as typeof fetch;
  return { fetchImpl, requests };
}

describe("ApiClient", () => {
  it("parses the scenario through the public projection contract", async () => {
    const { fetchImpl } = makeFetch(() => ({ body: { data: publicProjection } }));
    const client = new ApiClient({ fetchImpl });
    const scenario = await client.getScenario(
      starterScenarioFixture.scenarioId,
      starterScenarioFixture.version
    );
    expect(scenario.scenarioId).toBe("foundation-false-breakout-001");
    expect("hiddenEntities" in scenario).toBe(false);
  });

  it("rejects scenario responses that leak hidden fields", async () => {
    const { fetchImpl } = makeFetch(() => ({
      body: { data: { ...publicProjection, hiddenEntities: ["fake_breakout_phantom"] } }
    }));
    const client = new ApiClient({ fetchImpl });
    await expect(
      client.getScenario("foundation-false-breakout-001", "1.0.0")
    ).rejects.toThrow(ApiError);
  });

  it("starts a run and returns both the run and the scenario", async () => {
    const { fetchImpl, requests } = makeFetch(() => ({
      status: 201,
      body: { data: { run, scenario: publicProjection } }
    }));
    const client = new ApiClient({ fetchImpl });
    const result = await client.startRun({
      scenarioId: starterScenarioFixture.scenarioId,
      scenarioVersion: starterScenarioFixture.version,
      idempotencyKey: "run:test-1"
    });
    expect(result.run.runId).toBe("run-1");
    expect(result.scenario.scenarioId).toBe("foundation-false-breakout-001");
    expect(requests[0]?.body).toEqual({
      scenarioId: starterScenarioFixture.scenarioId,
      scenarioVersion: starterScenarioFixture.version,
      idempotencyKey: "run:test-1"
    });
  });

  it("sends the CSRF cookie as a header only on state-changing calls", async () => {
    const { fetchImpl, requests } = makeFetch(() => ({
      body: { data: { run, scenario: publicProjection } }
    }));
    const client = new ApiClient({ fetchImpl, csrfCookie: () => "csrf-token-1" });
    await client.startRun({
      scenarioId: "s",
      scenarioVersion: "1",
      idempotencyKey: "k"
    });
    expect(requests[0]?.headers["x-sa-csrf"]).toBe("csrf-token-1");

    const me = makeFetch(() => ({ body: { data: { userId: "u1" } } }));
    const meClient = new ApiClient({ fetchImpl: me.fetchImpl, csrfCookie: () => "csrf-token-1" });
    await meClient.me();
    expect(me.requests[0]?.headers["x-sa-csrf"]).toBeUndefined();
  });

  it("maps seal conflicts to typed errors", async () => {
    const { fetchImpl } = makeFetch(() => ({
      status: 409,
      body: { error: "scenario_run_already_sealed", message: "already sealed" }
    }));
    const client = new ApiClient({ fetchImpl });
    const error = await client
      .sealRun("run-1", {
        action: "wait",
        evidenceSourceIds: ["source_ohlcv_demo"],
        invalidation: "x",
        confidence: 50
      })
      .then(
        () => {
          throw new Error("expected failure");
        },
        (caught: unknown) => caught
      );
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("scenario_run_already_sealed");
    expect((error as ApiError).status).toBe(409);
  });

  it("validates reveal responses through the reveal projection and score contracts", async () => {
    const sealedRun = {
      ...run,
      state: "revealed",
      revealedAt: "2026-09-21T10:06:00.000Z",
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
    };
    const { fetchImpl } = makeFetch(() => ({
      body: {
        data: {
          run: sealedRun,
          reveal: {
            scenarioId: starterScenarioFixture.scenarioId,
            version: starterScenarioFixture.version,
            hiddenEntities: starterScenarioFixture.hiddenEntities,
            historicalFutureSegment: starterScenarioFixture.historicalFutureSegment,
            historicalOutcome: starterScenarioFixture.historicalOutcome,
            evaluationRules: starterScenarioFixture.evaluationRules,
            debrief: starterScenarioFixture.debrief,
            rematchLogic: starterScenarioFixture.rematchLogic
          }
        }
      }
    }));
    const client = new ApiClient({ fetchImpl });
    const result = await client.getReveal("run-1");
    expect(result.reveal.historicalOutcome.outcomeId).toBe("false-breakout-reversal");
    expect(result.run.score?.score).toBe(87);
  });

  it("surfaces network failures as a typed network error", async () => {
    const fetchImpl = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    const client = new ApiClient({ fetchImpl });
    const error = await client.me().then(
      () => {
        throw new Error("expected failure");
      },
      (caught: unknown) => caught
    );
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("network");
  });

  it("parses the scenario catalog and run history through contracts", async () => {
    const { fetchImpl } = makeFetch((request) => {
      if (request.url.endsWith("/api/v1/scenarios")) {
        return {
          body: {
            data: {
              scenarios: [
                {
                  scenarioId: "foundation-false-breakout-001",
                  version: "1.0.0",
                  mode: "academy",
                  scenarioLevel: 3,
                  assetClass: "crypto_spot",
                  assetId: "asset_demo_alpha",
                  marketSegment: "large_cap",
                  timeframe: "1h",
                  decisionPointT0: "2024-01-02T12:00:00Z"
                }
              ]
            }
          }
        };
      }
      return {
        body: {
          data: {
            runs: [
              {
                runId: "run-1",
                scenarioId: "foundation-false-breakout-001",
                scenarioVersion: "1.0.0",
                state: "sealed",
                score: 87,
                createdAt: "2026-09-21T10:00:00.000Z",
                sealedAt: "2026-09-21T10:05:00.000Z"
              }
            ]
          }
        }
      };
    });
    const client = new ApiClient({ fetchImpl });
    const scenarios = await client.listScenarios();
    expect(scenarios[0]?.scenarioId).toBe("foundation-false-breakout-001");
    const runs = await client.listRuns("user-1");
    expect(runs[0]?.score).toBe(87);
  });

  it("parses the server-derived balance through the economy contract", async () => {
    const { fetchImpl } = makeFetch(() => ({
      body: {
        data: { balance: {
          userId: "user-1",
          coins: 105,
          coinsPromo: 25,
          xp: 52,
          xpIntoLevel: 52,
          xpToNext: 125,
          accountLevel: 1,
          masteryStars: 2,
          energy: 4,
          energyCap: 5,
          xpToday: 52,
          xpDailyCap: 500,
          asOf: "2026-09-21T10:10:00.000Z"
        } }
      }
    }));
    const client = new ApiClient({ fetchImpl });
    const balance = await client.getBalance("user-1");
    expect(balance.accountLevel).toBe(1);
    expect(balance.xp).toBe(52);
    expect(balance.coins).toBe(105);
  });

  it("rejects a balance that leaks unknown fields", async () => {
    const { fetchImpl } = makeFetch(() => ({
      body: {
        data: { balance: {
          userId: "user-1",
          coins: 1,
          coinsPromo: 0,
          xp: 0,
          xpIntoLevel: 0,
          xpToNext: 125,
          accountLevel: 1,
          masteryStars: 0,
          energy: 5,
          energyCap: 5,
          xpToday: 0,
          xpDailyCap: 500,
          asOf: "2026-09-21T10:10:00.000Z",
          hiddenEntityIds: ["fomo_wraith"]
        } }
      }
    }));
    const client = new ApiClient({ fetchImpl });
    await expect(client.getBalance("user-1")).rejects.toBeInstanceOf(ApiError);
  });
});
