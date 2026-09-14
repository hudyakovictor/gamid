import assert from "node:assert/strict";
import test from "node:test";

import {
  DecisionTraceSchema,
  ScenarioRunStartRequestSchema
} from "./index.js";

test("scenario run contracts accept a sealed decision trace", () => {
  const start = ScenarioRunStartRequestSchema.parse({
    scenarioId: "foundation-false-breakout-001",
    scenarioVersion: "1.0.0",
    idempotencyKey: "run-start-001"
  });
  const decision = DecisionTraceSchema.parse({
    action: "no_trade",
    evidenceSourceIds: ["source_ohlcv_demo"],
    invalidation: "A confirmed close above the level invalidates the wait plan.",
    confidence: 68
  });

  assert.equal(start.scenarioVersion, "1.0.0");
  assert.equal(decision.action, "no_trade");
});

test("decision trace rejects invalid confidence and unknown fields", () => {
  assert.equal(DecisionTraceSchema.safeParse({
    action: "long",
    evidenceSourceIds: ["source_ohlcv_demo"],
    invalidation: "invalid",
    confidence: 101
  }).success, false);
  assert.equal(DecisionTraceSchema.safeParse({
    action: "wait",
    evidenceSourceIds: ["source_ohlcv_demo"],
    invalidation: "invalid",
    confidence: 50,
    future: true
  }).success, false);
});
