import assert from "node:assert/strict";
import test from "node:test";

import { buildServer } from "../../apps/api-server/src/server.js";

test("health endpoint is available", async () => {
  const server = buildServer();
  const response = await server.inject({ method: "GET", url: "/health" });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    status: "ok",
    service: "api-server"
  });

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
  assert.equal("hiddenEntities" in body.data, false);
  assert.equal("historicalFutureSegment" in body.data, false);
  assert.equal("historicalOutcome" in body.data, false);

  await server.close();
});
