import assert from "node:assert/strict";
import test from "node:test";

import { starterScenario } from "../../content/src/fixtures/starter-scenario.js";
import { evaluateFoundationDecision } from "./foundation-scoring.js";

test("foundation scoring rewards disciplined process without reading historical outcome", () => {
  const goodProcess = {
    action: "wait_for_confirmation" as const,
    evidenceSourceIds: ["source_ohlcv_demo", "source_volume_demo"],
    invalidation: "Close below the failed breakout level.",
    confidence: 72
  };
  const luckyDirectionalProcess = {
    action: "long" as const,
    evidenceSourceIds: ["source_ohlcv_demo"],
    invalidation: "invalid",
    confidence: 95
  };

  const goodScore = evaluateFoundationDecision(starterScenario, goodProcess);
  const luckyScore = evaluateFoundationDecision(starterScenario, luckyDirectionalProcess);
  const changedOutcomeScore = evaluateFoundationDecision({
    ...starterScenario,
    historicalOutcome: {
      outcomeId: "different-outcome",
      summary: "A different historical result."
    }
  }, goodProcess);

  assert.equal(goodScore.score, 87);
  assert.equal(luckyScore.score, 68);
  assert.ok(goodScore.score > luckyScore.score);
  assert.deepEqual(changedOutcomeScore, goodScore);
  assert.equal(goodScore.rubricVersion, "score-v1");
});

test("foundation scoring rejects a scenario rubric that omits a disclosed dimension", () => {
  assert.throws(() => evaluateFoundationDecision({
    ...starterScenario,
    evaluationRules: {
      ...starterScenario.evaluationRules,
      dimensions: starterScenario.evaluationRules.dimensions.filter(
        (dimension) => dimension !== "confidence_calibration"
      )
    }
  }, {
    action: "no_trade",
    evidenceSourceIds: ["source_ohlcv_demo"],
    invalidation: "No confirmation above the level.",
    confidence: 60
  }), /confidence_calibration/);
});
