import { ScenarioPackageSchema } from "../../../contracts/src/scenario.js";

export const starterScenario = ScenarioPackageSchema.parse({
  scenarioId: "foundation-false-breakout-001",
  version: "1.0.0",
  scenarioLevel: 3,
  mode: "academy",
  assetClass: "crypto_spot",
  assetId: "asset_demo_alpha",
  marketSegment: "large_cap",
  timeframe: "1h",
  decisionPoint: {
    t0: "2024-01-02T12:00:00Z",
    timezone: "UTC"
  },
  availableSourceGroups: ["PRICE", "FLOW"],
  availableSources: [
    {
      sourceId: "source_ohlcv_demo",
      sourceGroup: "PRICE",
      observedAt: "2024-01-02T11:59:00Z",
      availableAt: "2024-01-02T11:59:30Z",
      timezone: "UTC",
      sourceReference: "fixture://ohlcv/foundation-false-breakout-001",
      reliability: "high",
      contentHash: "sha256:fixture-ohlcv-001",
      revisionStatus: "original"
    },
    {
      sourceId: "source_volume_demo",
      sourceGroup: "FLOW",
      observedAt: "2024-01-02T11:58:00Z",
      availableAt: "2024-01-02T11:59:30Z",
      timezone: "UTC",
      sourceReference: "fixture://volume/foundation-false-breakout-001",
      reliability: "high",
      contentHash: "sha256:fixture-volume-001",
      revisionStatus: "original"
    }
  ],
  availableCards: ["c01_market_structure", "c03_volume_confirmation"],
  activeProtocols: ["p01_evidence_only"],
  hiddenEntities: ["fake_breakout_phantom"],
  allowedActions: ["long", "short", "wait", "no_trade", "wait_for_confirmation"],
  historicalFutureSegment: {
    from: "2024-01-02T13:00:00Z",
    to: "2024-01-02T18:00:00Z",
    contentHash: "sha256:fixture-future-001"
  },
  historicalOutcome: {
    outcomeId: "false-breakout-reversal",
    summary: "The breakout failed after the decision point."
  },
  evaluationRules: {
    rubricVersion: "score-v1",
    dimensions: [
      "decision_quality",
      "protocol_adherence",
      "evidence_quality",
      "follow_up_decision_quality",
      "risk_management",
      "invalidation",
      "discipline",
      "entity_resistance",
      "confidence_calibration"
    ]
  },
  debrief: {
    summary: "A weakly confirmed breakout required conditional waiting."
  },
  rematchLogic: {
    targetSkillId: "breakout-validation",
    scenarioConstraints: ["different_asset", "different_timeframe"]
  },
  contentVersion: "content-foundation-1",
  dataVersion: "data-fixture-1",
  futureHash: "sha256:fixture-future-001",
  locale: "en-US",
  reviewStatus: "validated"
});
