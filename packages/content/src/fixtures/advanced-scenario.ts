import { ScenarioPackageSchema } from "../../../contracts/src/scenario.js";

/**
 * Advanced difficulty fixture (scenario level 78 — Macro & Uncertainty band).
 * Five Source Groups, conflicting evidence, and no single clean answer.
 * Development-only content: point-in-time fixture sources, no external data.
 */
export const advancedScenario = ScenarioPackageSchema.parse({
  scenarioId: "advanced-macro-conflict-003",
  version: "1.0.0",
  scenarioLevel: 78,
  mode: "academy",
  assetClass: "crypto_perp",
  assetId: "asset_demo_gamma",
  marketSegment: "large_cap",
  timeframe: "1d",
  decisionPoint: {
    t0: "2024-06-05T00:00:00Z",
    timezone: "UTC"
  },
  availableSourceGroups: ["PRICE", "CONTEXT", "FLOW", "EVENT", "PROJECT"],
  availableSources: [
    {
      sourceId: "source_daily_structure_gamma",
      sourceGroup: "PRICE",
      observedAt: "2024-06-04T23:50:00Z",
      availableAt: "2024-06-04T23:55:00Z",
      timezone: "UTC",
      sourceReference: "fixture://price/advanced-macro-conflict-003",
      reliability: "high",
      contentHash: "sha256:fixture-price-adv-003",
      revisionStatus: "original"
    },
    {
      sourceId: "source_macro_calendar_gamma",
      sourceGroup: "EVENT",
      publishedAt: "2024-06-04T18:00:00Z",
      observedAt: "2024-06-04T18:05:00Z",
      availableAt: "2024-06-04T18:10:00Z",
      timezone: "UTC",
      sourceReference: "fixture://macro/advanced-macro-conflict-003",
      reliability: "high",
      contentHash: "sha256:fixture-macro-adv-003",
      revisionStatus: "original"
    },
    {
      sourceId: "source_funding_gamma",
      sourceGroup: "FLOW",
      observedAt: "2024-06-04T23:40:00Z",
      availableAt: "2024-06-04T23:50:00Z",
      timezone: "UTC",
      sourceReference: "fixture://funding/advanced-macro-conflict-003",
      reliability: "medium",
      contentHash: "sha256:fixture-funding-adv-003",
      revisionStatus: "original"
    },
    {
      sourceId: "source_headline_gamma",
      sourceGroup: "CONTEXT",
      publishedAt: "2024-06-04T20:12:00Z",
      observedAt: "2024-06-04T20:12:00Z",
      availableAt: "2024-06-04T20:15:00Z",
      timezone: "UTC",
      sourceReference: "fixture://headline/advanced-macro-conflict-003",
      reliability: "low",
      contentHash: "sha256:fixture-headline-adv-003",
      revisionStatus: "revised"
    },
    {
      sourceId: "source_unlock_note_gamma",
      sourceGroup: "PROJECT",
      publishedAt: "2024-06-01T09:00:00Z",
      observedAt: "2024-06-01T09:05:00Z",
      availableAt: "2024-06-01T09:10:00Z",
      timezone: "UTC",
      sourceReference: "fixture://unlock/advanced-macro-conflict-003",
      reliability: "medium",
      contentHash: "sha256:fixture-unlock-adv-003",
      revisionStatus: "original"
    }
  ],
  availableCards: ["c10_macro_context", "c39_confidence_check", "c08_news_context", "c25_evidence_only"],
  activeProtocols: ["p09_confidence_check", "p02_risk_first_mode"],
  hiddenEntities: ["certainty_siren", "narrative_siren", "headline_titan", "regime_shifter"],
  allowedActions: [
    "long",
    "short",
    "wait",
    "no_trade",
    "wait_for_confirmation",
    "invalidate_idea"
  ],
  historicalFutureSegment: {
    from: "2024-06-05T01:00:00Z",
    to: "2024-06-06T01:00:00Z",
    contentHash: "sha256:fixture-future-adv-003"
  },
  historicalOutcome: {
    outcomeId: "chop-around-event",
    summary: "Price chopped around the event in both directions; the plan that survived was the conditional one."
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
    summary: "Conflicting evidence across five groups rewarded calibration over conviction."
  },
  rematchLogic: {
    targetSkillId: "confidence-calibration-under-conflict",
    scenarioConstraints: ["different_asset", "different_event_type", "different_timeframe"]
  },
  contentVersion: "content-advanced-1",
  dataVersion: "data-fixture-advanced-1",
  futureHash: "sha256:fixture-future-adv-003",
  locale: "en-US",
  reviewStatus: "validated"
});
