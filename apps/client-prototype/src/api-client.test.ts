import assert from "node:assert/strict";
import test from "node:test";

import { starterScenario } from "../../../packages/content/src/fixtures/starter-scenario.js";
import { toPublicScenarioProjection } from "../../../packages/domain/src/scenario.js";
import { SignalArenaApiClient } from "./api-client.js";

const publicScenario = toPublicScenarioProjection(starterScenario);
const score = {
  score: 87,
  breakdown: {
    decision_quality: 88,
    protocol_adherence: 90,
    evidence_quality: 84,
    follow_up_decision_quality: 80,
    risk_management: 92,
    invalidation: 86,
    discipline: 95,
    entity_resistance: 82,
    confidence_calibration: 89
  },
  rubricVersion: "score-v1"
};

function run(state: "started" | "sealed" | "revealed", extra: Record<string, unknown> = {}) {
  return {
    runId: "run-client-001",
    scenarioId: starterScenario.scenarioId,
    scenarioVersion: starterScenario.version,
    state,
    createdAt: "2026-09-15T12:00:00.000Z",
    sealedAt: state === "started" ? null : "2026-09-15T12:01:00.000Z",
    revealedAt: state === "revealed" ? "2026-09-15T12:02:00.000Z" : null,
    completedAt: null,
    ...extra
  };
}

test("API client validates public, sealed and reveal projections", async () => {
  const calls: Array<{ url: string; method: string }> = [];
  const client = new SignalArenaApiClient({
    baseUrl: "http://api.test",
    fetcher: async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({ url, method });
      if (url.includes("/scenarios/")) {
        return new Response(JSON.stringify({ data: publicScenario }), { status: 200 });
      }
      if (url.endsWith("/scenario-runs") && method === "POST") {
        return new Response(JSON.stringify({
          data: { run: run("started"), scenario: publicScenario }
        }), { status: 201 });
      }
      if (url.endsWith("/seal") && method === "POST") {
        return new Response(JSON.stringify({
          data: { run: run("sealed", { decision: {
            action: "wait_for_confirmation",
            evidenceSourceIds: ["source_ohlcv_demo"],
            invalidation: "Close below the failed breakout level.",
            confidence: 72
          } }) }
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        data: {
          run: run("revealed", { score }),
          reveal: {
            scenarioId: starterScenario.scenarioId,
            version: starterScenario.version,
            hiddenEntities: starterScenario.hiddenEntities,
            historicalFutureSegment: starterScenario.historicalFutureSegment,
            historicalOutcome: starterScenario.historicalOutcome,
            evaluationRules: starterScenario.evaluationRules,
            debrief: starterScenario.debrief,
            rematchLogic: starterScenario.rematchLogic
          }
        }
      }), { status: 200 });
    }
  });

  const scenario = await client.getScenario(starterScenario.scenarioId, starterScenario.version);
  assert.equal("hiddenEntities" in scenario, false);
  const started = await client.createRun({
    scenarioId: starterScenario.scenarioId,
    scenarioVersion: starterScenario.version,
    idempotencyKey: "client-test-001"
  });
  assert.equal(started.run.state, "started");
  const sealed = await client.sealRun(started.run.runId, {
    action: "wait_for_confirmation",
    evidenceSourceIds: ["source_ohlcv_demo"],
    invalidation: "Close below the failed breakout level.",
    confidence: 72
  });
  assert.equal(sealed.state, "sealed");
  const revealed = await client.revealRun(started.run.runId);
  assert.equal(revealed.run.score?.score, 87);
  assert.deepEqual(revealed.reveal.hiddenEntities, ["fake_breakout_phantom"]);
  assert.deepEqual(calls.map((call) => call.method), ["GET", "POST", "POST", "GET"]);
});
