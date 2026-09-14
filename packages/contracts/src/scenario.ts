import { z } from "zod";

const IsoDate = z.string().datetime({ offset: true });

export const SourceGroupSchema = z.enum([
  "PRICE",
  "CONTEXT",
  "FLOW",
  "EVENT",
  "PROJECT"
]);

export const ScenarioModeSchema = z.enum([
  "academy",
  "exam",
  "arena",
  "collection",
  "rematch",
  "series",
  "tournament",
  "historical"
]);

export const DecisionActionSchema = z.enum([
  "long",
  "short",
  "wait",
  "no_trade",
  "hold_plan",
  "reduce_risk",
  "close_position",
  "move_protection",
  "wait_for_confirmation",
  "do_not_average",
  "invalidate_idea"
]);

export const ReviewStatusSchema = z.enum([
  "draft",
  "research",
  "point_in_time_validation",
  "review",
  "validated",
  "published"
]);

export const ScoreDimensionSchema = z.enum([
  "decision_quality",
  "protocol_adherence",
  "evidence_quality",
  "follow_up_decision_quality",
  "risk_management",
  "invalidation",
  "discipline",
  "entity_resistance",
  "confidence_calibration"
]);

export const ScenarioSourceSchema = z.object({
  sourceId: z.string().min(1),
  sourceGroup: SourceGroupSchema,
  publishedAt: IsoDate.optional(),
  observedAt: IsoDate,
  availableAt: IsoDate,
  timezone: z.string().min(1),
  sourceReference: z.string().min(1),
  reliability: z.enum(["low", "medium", "high"]),
  contentHash: z.string().min(8),
  revisionStatus: z.enum(["original", "revised", "superseded"])
}).strict();

export const ScenarioPackageSchema = z.object({
  scenarioId: z.string().min(1),
  version: z.string().min(1),
  scenarioLevel: z.number().int().min(1).max(99),
  mode: ScenarioModeSchema,
  assetClass: z.string().min(1),
  assetId: z.string().min(1),
  marketSegment: z.string().min(1),
  timeframe: z.string().min(1),
  decisionPoint: z.object({
    t0: IsoDate,
    timezone: z.string().min(1)
  }).strict(),
  availableSourceGroups: z.array(SourceGroupSchema).min(1).max(5),
  availableSources: z.array(ScenarioSourceSchema).min(1),
  availableCards: z.array(z.string().min(1)),
  activeProtocols: z.array(z.string().min(1)),
  hiddenEntities: z.array(z.string().min(1)).min(1),
  allowedActions: z.array(DecisionActionSchema).min(1),
  historicalFutureSegment: z.object({
    from: IsoDate,
    to: IsoDate,
    contentHash: z.string().min(8)
  }).strict(),
  historicalOutcome: z.object({
    outcomeId: z.string().min(1),
    summary: z.string().min(1)
  }).strict(),
  evaluationRules: z.object({
    rubricVersion: z.string().min(1),
    dimensions: z.array(ScoreDimensionSchema).min(1)
  }).strict(),
  debrief: z.object({
    summary: z.string().min(1)
  }).strict(),
  rematchLogic: z.object({
    targetSkillId: z.string().min(1),
    scenarioConstraints: z.array(z.string().min(1)).min(1)
  }).strict(),
  contentVersion: z.string().min(1),
  dataVersion: z.string().min(1),
  futureHash: z.string().min(8),
  locale: z.string().min(2),
  reviewStatus: ReviewStatusSchema
}).strict();

export const ScenarioPublicProjectionSchema = ScenarioPackageSchema.omit({
  hiddenEntities: true,
  historicalFutureSegment: true,
  historicalOutcome: true,
  evaluationRules: true,
  debrief: true,
  rematchLogic: true
}).strict();

export const ScenarioRevealProjectionSchema = ScenarioPackageSchema.pick({
  scenarioId: true,
  version: true,
  hiddenEntities: true,
  historicalFutureSegment: true,
  historicalOutcome: true,
  evaluationRules: true,
  debrief: true,
  rematchLogic: true
}).strict();

export const LoadoutSchema = z.object({
  mode: ScenarioModeSchema,
  kind: z.enum(["guided", "curated", "base", "personal"]),
  cardIds: z.array(z.string().min(1)).min(1),
  protocolIds: z.array(z.string().min(1)).min(1)
}).strict();

export type SourceGroup = z.infer<typeof SourceGroupSchema>;
export type ScenarioMode = z.infer<typeof ScenarioModeSchema>;
export type DecisionAction = z.infer<typeof DecisionActionSchema>;
export type ScoreDimension = z.infer<typeof ScoreDimensionSchema>;
export type ScenarioSource = z.infer<typeof ScenarioSourceSchema>;
export type ScenarioPackage = z.infer<typeof ScenarioPackageSchema>;
export type ScenarioPublicProjection = z.infer<typeof ScenarioPublicProjectionSchema>;
export type ScenarioRevealProjection = z.infer<typeof ScenarioRevealProjectionSchema>;
export type Loadout = z.infer<typeof LoadoutSchema>;
