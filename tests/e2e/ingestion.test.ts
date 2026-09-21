import assert from "node:assert/strict";
import test from "node:test";

import { buildServer } from "../../apps/api-server/src/server.js";
import { coreScenario } from "../../packages/content/src/index.js";

type Server = ReturnType<typeof buildServer>;

function makePackage(overrides: Record<string, unknown> = {}) {
  return {
    ...coreScenario,
    scenarioId: "ingested-liquidity-001",
    version: "1.0.0",
    reviewStatus: "review",
    ...overrides
  };
}

async function listCatalog(server: Server): Promise<Array<{ scenarioId: string }>> {
  const response = await server.inject({ method: "GET", url: "/api/v1/scenarios" });
  assert.equal(response.statusCode, 200);
  return response.json<{ data: { scenarios: Array<{ scenarioId: string }> } }>()
    .data.scenarios;
}

test("ingestion validates, stores, and gates publication by review status", async () => {
  const server = buildServer({ editorUserIds: ["seed-user-001"] });

  // 1. Invalid package (post-t0 source) is rejected.
  const invalid = makePackage();
  const firstSource = invalid.availableSources[0];
  if (!firstSource) {
    throw new Error("test fixture is missing its first source");
  }
  invalid.availableSources = [
    { ...firstSource, availableAt: "2024-03-14T09:00:00Z" }, // after t0
    ...invalid.availableSources.slice(1)
  ];
  const rejected = await server.inject({
    method: "POST",
    url: "/api/v1/admin/scenarios",
    payload: invalid
  });
  assert.equal(rejected.statusCode, 422);
  assert.equal(rejected.json().error, "invalid_scenario_package");

  // 2. Malformed JSON string body is rejected by the importer (422),
  // not by the JSON parser.
  const badJson = await server.inject({
    method: "POST",
    url: "/api/v1/admin/scenarios",
    headers: { "content-type": "application/json" },
    payload: JSON.stringify("{not json")
  });
  assert.equal(badJson.statusCode, 422);
  assert.equal(badJson.json().error, "invalid_scenario_package");

  // 3. Valid package lands in 'review' — NOT visible in the public catalog.
  const ingested = await server.inject({
    method: "POST",
    url: "/api/v1/admin/scenarios",
    payload: makePackage()
  });
  assert.equal(ingested.statusCode, 201);
  assert.equal(ingested.json().data.created, true);
  assert.equal(ingested.json().data.reviewStatus, "review");

  const inReview = await listCatalog(server);
  assert.equal(
    inReview.some((row) => row.scenarioId === "ingested-liquidity-001"),
    false,
    "review-status scenario must not appear in the public catalog"
  );

  // 4. Identical re-import is idempotent (200, created=false).
  const reimport = await server.inject({
    method: "POST",
    url: "/api/v1/admin/scenarios",
    payload: makePackage()
  });
  assert.equal(reimport.statusCode, 200);
  assert.equal(reimport.json().data.created, false);

  // 5. Same id+version with different content is a conflict.
  const conflict = await server.inject({
    method: "POST",
    url: "/api/v1/admin/scenarios",
    payload: makePackage({ assetId: "asset_different" })
  });
  assert.equal(conflict.statusCode, 409);
  assert.equal(conflict.json().error, "scenario_conflict");

  // 6. Review transition to 'validated' publishes it.
  const validate = await server.inject({
    method: "POST",
    url: "/api/v1/admin/scenarios/ingested-liquidity-001/review",
    payload: { version: "1.0.0", status: "validated" }
  });
  assert.equal(validate.statusCode, 200);
  const published = await listCatalog(server);
  assert.equal(
    published.some((row) => row.scenarioId === "ingested-liquidity-001"),
    true,
    "validated scenario must appear in the public catalog"
  );

  // 7. Re-review back to 'review' hides it again.
  const reReview = await server.inject({
    method: "POST",
    url: "/api/v1/admin/scenarios/ingested-liquidity-001/review",
    payload: { version: "1.0.0", status: "review" }
  });
  assert.equal(reReview.statusCode, 200);
  const hidden = await listCatalog(server);
  assert.equal(
    hidden.some((row) => row.scenarioId === "ingested-liquidity-001"),
    false
  );

  // 8. Invalid review status is rejected; unknown scenario is 404.
  const badStatus = await server.inject({
    method: "POST",
    url: "/api/v1/admin/scenarios/ingested-liquidity-001/review",
    payload: { version: "1.0.0", status: "shipped" }
  });
  assert.equal(badStatus.statusCode, 422);

  const missing = await server.inject({
    method: "POST",
    url: "/api/v1/admin/scenarios/nope-000/review",
    payload: { version: "1.0.0", status: "validated" }
  });
  assert.equal(missing.statusCode, 404);

  await server.close();
});

test("ingested validated scenario is playable through the full lifecycle", async () => {
  const server = buildServer({ editorUserIds: ["seed-user-001"] });

  await server.inject({
    method: "POST",
    url: "/api/v1/admin/scenarios",
    payload: makePackage({ reviewStatus: "validated" })
  });
  await server.inject({
    method: "POST",
    url: "/api/v1/admin/scenarios/ingested-liquidity-001/review",
    payload: { version: "1.0.0", status: "validated" }
  });

  const brief = await server.inject({
    method: "GET",
    url: "/api/v1/scenarios/ingested-liquidity-001?version=1.0.0"
  });
  assert.equal(brief.statusCode, 200);
  assert.equal(brief.json().data.scenarioId, "ingested-liquidity-001");

  const start = await server.inject({
    method: "POST",
    url: "/api/v1/scenario-runs",
    payload: {
      scenarioId: "ingested-liquidity-001",
      scenarioVersion: "1.0.0",
      idempotencyKey: "ingest-run-1"
    }
  });
  assert.equal(start.statusCode, 201);
  const runId = start.json<{ data: { run: { runId: string } } }>().data.run.runId;

  const seal = await server.inject({
    method: "POST",
    url: `/api/v1/scenario-runs/${runId}/seal`,
    payload: {
      action: "wait",
      evidenceSourceIds: ["source_price_structure_beta"],
      invalidation: "Structure breaks below the range low.",
      confidence: 60
    }
  });
  assert.equal(seal.statusCode, 200);

  const reveal = await server.inject({
    method: "GET",
    url: `/api/v1/scenario-runs/${runId}/reveal`
  });
  assert.equal(reveal.statusCode, 200);
  assert.equal(reveal.json().data.run.state, "revealed");

  await server.close();
});
