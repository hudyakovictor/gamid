import { ScenarioPackageSchema } from "../../../contracts/src/scenario.js";

/**
 * Core difficulty fixture (scenario level 32 — Risk & Invalidation band).
 * Development-only content: point-in-time fixture sources, no external data.
 */
export const coreScenario = ScenarioPackageSchema.parse({
  scenarioId: "core-risk-invalidation-002",
  version: "1.0.0",
  scenarioLevel: 32,
  mode: "academy",
  assetClass: "crypto_spot",
  assetId: "asset_demo_beta",
  marketSegment: "mid_cap",
  timeframe: "4h",
  decisionPoint: {
    t0: "2024-03-14T08:00:00Z",
    timezone: "UTC"
  },
  availableSourceGroups: ["PRICE", "FLOW", "CONTEXT"],
  availableSources: [
    {
      sourceId: "source_price_structure_beta",
      sourceGroup: "PRICE",
      observedAt: "2024-03-14T07:55:00Z",
      availableAt: "2024-03-14T07:56:00Z",
      timezone: "UTC",
      sourceReference: "fixture://price/core-risk-invalidation-002",
      reliability: "high",
      contentHash: "sha256:fixture-price-core-002",
      revisionStatus: "original"
    },
    {
      sourceId: "source_oi_beta",
      sourceGroup: "FLOW",
      observedAt: "2024-03-14T07:50:00Z",
      availableAt: "2024-03-14T07:55:00Z",
      timezone: "UTC",
      sourceReference: "fixture://oi/core-risk-invalidation-002",
      reliability: "medium",
      contentHash: "sha256:fixture-oi-core-002",
      revisionStatus: "original"
    },
    {
      sourceId: "source_event_calendar_beta",
      sourceGroup: "CONTEXT",
      publishedAt: "2024-03-14T06:00:00Z",
      observedAt: "2024-03-14T06:05:00Z",
      availableAt: "2024-03-14T06:10:00Z",
      timezone: "UTC",
      sourceReference: "fixture://calendar/core-risk-invalidation-002",
      reliability: "medium",
      contentHash: "sha256:fixture-calendar-core-002",
      revisionStatus: "original"
    }
  ],
  availableCards: ["c19_define_invalidation", "c20_set_structural_stop", "c05_volatility_context"],
  activeProtocols: ["p02_risk_first_mode"],
  hiddenEntities: ["risk_mirage", "leverage_goblin"],
  allowedActions: [
    "long",
    "short",
    "wait",
    "no_trade",
    "wait_for_confirmation",
    "reduce_risk"
  ],
  historicalFutureSegment: {
    from: "2024-03-14T09:00:00Z",
    to: "2024-03-14T21:00:00Z",
    contentHash: "sha256:fixture-future-core-002"
  },
  historicalOutcome: {
    outcomeId: "event-driven-reversal",
    summary: "The move reversed after the scheduled event; unvalidated risk was taken out."
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
    summary: "Volatility context changed the cost of the same pattern; the plan needed a conditional entry."
  },
  rematchLogic: {
    targetSkillId: "risk-invalidation-under-volatility",
    scenarioConstraints: ["different_asset", "different_event_type"]
  },
  contentVersion: "content-core-1",
  dataVersion: "data-fixture-core-1",
  futureHash: "sha256:fixture-future-core-002",
  locale: "en-US",
  reviewStatus: "validated"
});
