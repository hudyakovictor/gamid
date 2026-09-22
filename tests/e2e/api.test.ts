import assert from "node:assert/strict";
import test from "node:test";

import { buildServer } from "../../apps/api-server/src/server.js";
import { ScenarioPublicProjectionSchema } from "../../packages/contracts/src/scenario.js";

test("health endpoint is available", async () => {
  const server = buildServer();
  const response = await server.inject({ method: "GET", url: "/health" });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    status: "ok",
    service: "api-server"
  });

  const readiness = await server.inject({ method: "GET", url: "/ready" });
  assert.equal(readiness.statusCode, 200);
  assert.deepEqual(readiness.json(), {
    status: "ready",
    service: "api-server"
  });

  await server.close();
});

test("readiness fails closed when an authoritative dependency is unavailable", async () => {
  const server = buildServer({
    readinessCheck: async () => {
      throw new Error("database unavailable");
    }
  });
  const response = await server.inject({ method: "GET", url: "/ready" });

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.json(), {
    status: "not_ready",
    service: "api-server"
  });

  await server.close();
});

test("scenario API reads a versioned package from the database", async () => {
  const server = buildServer();
  const response = await server.inject({
    method: "GET",
    url: "/api/v1/scenarios/foundation-false-breakout-001?version=1.0.0"
  });
  const body = response.json<{ data: Record<string, unknown> }>();

  assert.equal(response.statusCode, 200);
  assert.equal(body.data.version, "1.0.0");
  assert.equal("hiddenEntities" in body.data, false);

  await server.close();
});

test("scenario API never returns hidden future data", async () => {
  const server = buildServer();
  const response = await server.inject({
    method: "GET",
    url: "/api/v1/scenarios/foundation-false-breakout-001"
  });
  const body = response.json<{ data: Record<string, unknown> }>();

  assert.equal(response.statusCode, 200);
  const projection = ScenarioPublicProjectionSchema.parse(body.data);

  assert.equal(projection.scenarioId, "foundation-false-breakout-001");
  assert.equal("hiddenEntities" in projection, false);
  assert.equal("historicalFutureSegment" in body.data, false);
  assert.equal("historicalOutcome" in body.data, false);

  await server.close();
});

test("scenario run API seals decisions and reveals server-only history after seal", async () => {
  const server = buildServer();
  const startPayload = {
    scenarioId: "foundation-false-breakout-001",
    scenarioVersion: "1.0.0",
    idempotencyKey: "e2e-run-001"
  };
  const startResponse = await server.inject({
    method: "POST",
    url: "/api/v1/scenario-runs",
    payload: startPayload
  });
  const startBody = startResponse.json<{
    data: { run: { runId: string; state: string }; scenario: Record<string, unknown> }
  }>();

  assert.equal(startResponse.statusCode, 201);
  assert.equal(startBody.data.run.state, "started");
  assert.equal("decision" in startBody.data.run, false);
  assert.equal("hiddenEntities" in startBody.data.scenario, false);

  const retryResponse = await server.inject({
    method: "POST",
    url: "/api/v1/scenario-runs",
    payload: startPayload
  });
  const retryBody = retryResponse.json<{
    data: { run: { runId: string } }
  }>();
  assert.equal(retryResponse.statusCode, 201);
  assert.equal(retryBody.data.run.runId, startBody.data.run.runId);

  const beforeSeal = await server.inject({
    method: "POST",
    url: `/api/v1/scenario-runs/${startBody.data.run.runId}/reveal`
  });
  assert.equal(beforeSeal.statusCode, 409);
  assert.equal(beforeSeal.json<{ error: string }>().error, "scenario_run_not_sealed");

  const sealResponse = await server.inject({
    method: "POST",
    url: `/api/v1/scenario-runs/${startBody.data.run.runId}/seal`,
    payload: {
      action: "wait_for_confirmation",
      evidenceSourceIds: ["source_ohlcv_demo", "source_volume_demo"],
      invalidation: "Close below the failed breakout level.",
      confidence: 72
    }
  });
  const sealBody = sealResponse.json<{
    data: { run: { state: string; score?: unknown } }
  }>();
  assert.equal(sealResponse.statusCode, 200);
  assert.equal(sealBody.data.run.state, "sealed");
  assert.equal("score" in sealBody.data.run, false);

  const revealResponse = await server.inject({
    method: "POST",
    url: `/api/v1/scenario-runs/${startBody.data.run.runId}/reveal`
  });
  const revealBody = revealResponse.json<{
    data: {
      run: { state: string; score: { score: number; rubricVersion: string } };
      reveal: { hiddenEntities: string[]; historicalFutureSegment: unknown };
    };
  }>();
  assert.equal(revealResponse.statusCode, 200);
  assert.equal(revealBody.data.run.state, "revealed");
  assert.equal(revealBody.data.run.score.score, 87);
  assert.equal(revealBody.data.run.score.rubricVersion, "score-v1");
  assert.deepEqual(revealBody.data.reveal.hiddenEntities, ["fake_breakout_phantom"]);
  assert.equal(typeof revealBody.data.reveal.historicalFutureSegment, "object");

  await server.close();
});
