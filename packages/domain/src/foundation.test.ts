import assert from "node:assert/strict";
import test from "node:test";

import { starterScenario } from "../../content/src/fixtures/starter-scenario.js";
import {
  importScenarioPackage,
  validateScenarioPackage
} from "../../content/src/validate.js";
import {
  assertActionAllowed,
  assertDecisionTraceAllowed,
  assertLoadoutMode,
  calculateQualityScore,
  toPublicScenarioProjection,
  toScenarioRevealProjection,
  type ScoreInput
} from "./index.js";

test("validates the starter ScenarioPackage and protects its public projection", () => {
  const scenario = validateScenarioPackage(starterScenario);
  const publicProjection = toPublicScenarioProjection(scenario);

  assert.equal(publicProjection.scenarioId, "foundation-false-breakout-001");
  assert.equal("hiddenEntities" in publicProjection, false);
  assert.equal("historicalFutureSegment" in publicProjection, false);
  assert.equal("historicalOutcome" in publicProjection, false);
  assert.equal("evaluationRules" in publicProjection, false);
});

test("imports JSON ScenarioPackages and keeps reveal data out of public projection", () => {
  const imported = importScenarioPackage(JSON.stringify(starterScenario));
  const reveal = toScenarioRevealProjection(imported);

  assert.deepEqual(reveal.hiddenEntities, ["fake_breakout_phantom"]);
  assert.equal(reveal.historicalFutureSegment.contentHash, imported.futureHash);
  assert.equal("historicalFutureSegment" in toPublicScenarioProjection(imported), false);
});

test("rejects a ScenarioPackage with a mismatched future hash", () => {
  assert.throws(() => validateScenarioPackage({
    ...starterScenario,
    futureHash: "sha256:wrong-future-hash"
  }), /future hash/);
});

test("rejects actions that are not allowed by the scenario", () => {
  assert.doesNotThrow(() => assertActionAllowed(starterScenario, "no_trade"));
  assert.throws(
    () => assertActionAllowed(starterScenario, "close_position"),
    /not allowed/
  );
});

test("validates decision evidence against the ScenarioPackage", () => {
  assert.doesNotThrow(() => assertDecisionTraceAllowed(starterScenario, {
    action: "wait_for_confirmation",
    evidenceSourceIds: ["source_ohlcv_demo", "source_volume_demo"],
    invalidation: "Close below the breakout level.",
    confidence: 72
  }));
  assert.throws(() => assertDecisionTraceAllowed(starterScenario, {
    action: "wait_for_confirmation",
    evidenceSourceIds: ["source_ohlcv_demo", "source_ohlcv_demo"],
    invalidation: "Close below the breakout level.",
    confidence: 72
  }), /duplicate/);
  assert.throws(() => assertDecisionTraceAllowed(starterScenario, {
    action: "wait_for_confirmation",
    evidenceSourceIds: ["source_missing"],
    invalidation: "Close below the breakout level.",
    confidence: 72
  }), /unavailable/);
});

test("enforces mode-specific loadout semantics", () => {
  assert.doesNotThrow(() => assertLoadoutMode({
    mode: "academy",
    kind: "guided",
    cardIds: ["c01_market_structure"],
    protocolIds: ["p01_evidence_only"]
  }));
  assert.throws(() => assertLoadoutMode({
    mode: "exam",
    kind: "guided",
    cardIds: ["c01_market_structure"],
    protocolIds: ["p01_evidence_only"]
  }), /invalid/);
});

test("calculates a disclosed deterministic process score without market outcome input", () => {
  const input: ScoreInput = {
    decision_quality: 88,
    protocol_adherence: 90,
    evidence_quality: 84,
    follow_up_decision_quality: 80,
    risk_management: 92,
    invalidation: 86,
    discipline: 95,
    entity_resistance: 82,
    confidence_calibration: 89
  };

  const result = calculateQualityScore(input);
  assert.equal(result.score, 87);
  assert.deepEqual(result.breakdown, input);
  assert.equal(result.rubricVersion, "score-v1");
});

test("rejects scores outside the disclosed 0-100 range", () => {
  assert.throws(() => calculateQualityScore({
    decision_quality: 101,
    protocol_adherence: 90,
    evidence_quality: 84,
    follow_up_decision_quality: 80,
    risk_management: 92,
    invalidation: 86,
    discipline: 95,
    entity_resistance: 82,
    confidence_calibration: 89
  }), /between 0 and 100/);
});
