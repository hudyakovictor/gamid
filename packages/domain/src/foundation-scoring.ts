import {
  ScoreResultSchema,
  type DecisionTrace,
  type ScenarioPackage,
  type ScoreBreakdown
} from "../../contracts/src/index.js";
import { assertDecisionTraceAllowed } from "./scenario.js";
import { calculateQualityScore, SCORE_DIMENSIONS, type ScoreResult } from "./scoring.js";

const CAUTIOUS_ACTIONS = new Set<DecisionTrace["action"]>([
  "wait",
  "no_trade",
  "wait_for_confirmation",
  "invalidate_idea"
]);

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function invalidationQuality(invalidation: string): number {
  const wordCount = invalidation.trim().split(/\s+/u).length;
  return clamp(36 + wordCount * 5);
}

function confidenceCalibration(
  confidence: number,
  cautious: boolean
): number {
  const expectedConfidence = cautious ? 60 : 65;
  return clamp(100 - Math.abs(confidence - expectedConfidence) * 2);
}

function buildFoundationBreakdown(
  scenario: ScenarioPackage,
  decision: DecisionTrace
): ScoreBreakdown {
  const cautious = CAUTIOUS_ACTIONS.has(decision.action);
  const sourceById = new Map(
    scenario.availableSources.map((source) => [source.sourceId, source])
  );
  const selectedSources = decision.evidenceSourceIds
    .map((sourceId) => sourceById.get(sourceId))
    .filter((source) => source !== undefined);
  const highReliabilityCount = selectedSources.filter(
    (source) => source.reliability === "high"
  ).length;
  const reliabilityRatio = selectedSources.length === 0
    ? 0
    : highReliabilityCount / selectedSources.length;
  const evidenceQuality = clamp(55 + reliabilityRatio * 45);
  const invalidation = invalidationQuality(decision.invalidation);
  const confidence = confidenceCalibration(decision.confidence, cautious);

  return {
    decision_quality: cautious ? 88 : 62,
    protocol_adherence: selectedSources.length > 0 ? 90 : 35,
    evidence_quality: evidenceQuality,
    follow_up_decision_quality: cautious ? 86 : 68,
    risk_management: cautious ? 90 : clamp(52 + invalidation * 0.35),
    invalidation,
    discipline: cautious ? 94 : 64,
    entity_resistance: cautious ? 90 : 65,
    confidence_calibration: confidence
  };
}

export function evaluateFoundationDecision(
  scenario: ScenarioPackage,
  decision: DecisionTrace
): ScoreResult {
  assertDecisionTraceAllowed(scenario, decision);

  for (const dimension of SCORE_DIMENSIONS) {
    if (!scenario.evaluationRules.dimensions.includes(dimension)) {
      throw new Error(`Scenario rubric does not define ${dimension}`);
    }
  }

  const result = calculateQualityScore(
    buildFoundationBreakdown(scenario, decision),
    scenario.evaluationRules.rubricVersion
  );
  return ScoreResultSchema.parse(result);
}
