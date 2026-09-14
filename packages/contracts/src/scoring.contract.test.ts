import assert from "node:assert/strict";
import test from "node:test";

import { ScoreResultSchema } from "./scoring.js";

test("score result contract accepts the disclosed server result", () => {
  const result = ScoreResultSchema.parse({
    score: 87,
    breakdown: {
      decision_quality: 88,
      protocol_adherence: 90,
      evidence_quality: 100,
      follow_up_decision_quality: 86,
      risk_management: 90,
      invalidation: 66,
      discipline: 94,
      entity_resistance: 90,
      confidence_calibration: 76
    },
    rubricVersion: "score-v1"
  });

  assert.equal(result.score, 87);
});

test("score result contract rejects out-of-range dimensions and unknown fields", () => {
  assert.equal(ScoreResultSchema.safeParse({
    score: 101,
    breakdown: {
      decision_quality: 88,
      protocol_adherence: 90,
      evidence_quality: 100,
      follow_up_decision_quality: 86,
      risk_management: 90,
      invalidation: 66,
      discipline: 94,
      entity_resistance: 90,
      confidence_calibration: 76
    },
    rubricVersion: "score-v1",
    outcomeBonus: 10
  }).success, false);
});
