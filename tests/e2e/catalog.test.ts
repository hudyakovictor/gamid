import assert from "node:assert/strict";
import test from "node:test";

import { buildServer } from "../../apps/api-server/src/server.js";
import {
  ScenarioPackageSummarySchema,
  ScenarioRunSummarySchema
} from "../../packages/contracts/src/index.js";

test("scenario catalog returns only public summary fields", async () => {
  const server = buildServer();
  const response = await server.inject({ method: "GET", url: "/api/v1/scenarios" });

  assert.equal(response.statusCode, 200);
  const body = response.json<{
    data: { scenarios: Array<Record<string, unknown>> };
  }>();
  assert.equal(body.data.scenarios.length, 1);
  const scenarioRow = body.data.scenarios[0] as Record<string, unknown>;
  const summary = ScenarioPackageSummarySchema.parse(scenarioRow);
  assert.equal(summary.scenarioId, "foundation-false-breakout-001");
  assert.equal(summary.mode, "academy");
  assert.equal(summary.scenarioLevel, 3);
  assert.equal("hiddenEntities" in scenarioRow, false);
  assert.equal("historicalOutcome" in scenarioRow, false);

  await server.close();
});

test("scenario run history is user-scoped and exposes only run summaries", async () => {
  const server = buildServer();

  const startResponse = await server.inject({
    method: "POST",
    url: "/api/v1/scenario-runs",
    payload: {
      scenarioId: "foundation-false-breakout-001",
      scenarioVersion: "1.0.0",
      idempotencyKey: "history-test-001"
    }
  });
  assert.equal(startResponse.statusCode, 201);
  const runId = startResponse
    .json<{ data: { run: { runId: string } } }>()
    .data.run.runId;

  const sealResponse = await server.inject({
    method: "POST",
    url: `/api/v1/scenario-runs/${runId}/seal`,
    payload: {
      action: "wait_for_confirmation",
      evidenceSourceIds: ["source_ohlcv_demo", "source_volume_demo"],
      invalidation: "Close below the failed breakout level.",
      confidence: 72
    }
  });
  assert.equal(sealResponse.statusCode, 200);

  const meResponse = await server.inject({ method: "GET", url: "/api/v1/users/me" });
  assert.equal(meResponse.statusCode, 200);
  const userId = meResponse.json<{ data: { userId: string } }>().data.userId;

  const historyResponse = await server.inject({
    method: "GET",
    url: `/api/v1/users/${userId}/scenario-runs`
  });
  assert.equal(historyResponse.statusCode, 200);
  const body = historyResponse.json<{
    data: { runs: Array<Record<string, unknown>> };
  }>();
  assert.equal(body.data.runs.length, 1);
  const runRow = body.data.runs[0] as Record<string, unknown>;
  const run = ScenarioRunSummarySchema.parse(runRow);
  assert.equal(run.runId, runId);
  assert.equal(run.state, "sealed");
  assert.equal(run.score, 87);
  assert.equal("decision" in runRow, false);
  assert.equal("breakdown" in runRow, false);

  const foreignResponse = await server.inject({
    method: "GET",
    url: "/api/v1/users/some-other-user/scenario-runs"
  });
  assert.equal(foreignResponse.statusCode, 404);

  await server.close();
});
