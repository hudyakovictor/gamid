import type {
  ScoreDimension,
  ScoreResult as ContractScoreResult
} from "../../contracts/src/index.js";

export const SCORE_DIMENSIONS = [
  "decision_quality",
  "protocol_adherence",
  "evidence_quality",
  "follow_up_decision_quality",
  "risk_management",
  "invalidation",
  "discipline",
  "entity_resistance",
  "confidence_calibration"
] as const satisfies readonly ScoreDimension[];

export type ScoreInput = Record<(typeof SCORE_DIMENSIONS)[number], number>;

export type ScoreResult = ContractScoreResult;

const WEIGHTS: Record<(typeof SCORE_DIMENSIONS)[number], number> = {
  decision_quality: 0.2,
  protocol_adherence: 0.1,
  evidence_quality: 0.15,
  follow_up_decision_quality: 0.1,
  risk_management: 0.15,
  invalidation: 0.1,
  discipline: 0.05,
  entity_resistance: 0.05,
  confidence_calibration: 0.1
};

function assertScoreValue(value: number, dimension: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new RangeError(`${dimension} must be between 0 and 100`);
  }
}

export function calculateQualityScore(
  input: ScoreInput,
  rubricVersion = "score-v1"
): ScoreResult {
  let weightedScore = 0;

  for (const dimension of SCORE_DIMENSIONS) {
    const value = input[dimension];
    assertScoreValue(value, dimension);
    weightedScore += value * WEIGHTS[dimension];
  }

  return {
    score: Math.round(weightedScore),
    breakdown: { ...input },
    rubricVersion
  };
}
