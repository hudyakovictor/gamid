import { z } from "zod";

import {
  DecisionActionSchema,
  ScenarioModeSchema
} from "./scenario.js";

export const ScenarioRunStateSchema = z.enum([
  "started",
  "sealed",
  "revealed",
  "completed"
]);

export const ScenarioPackageSummarySchema = z
  .object({
    scenarioId: z.string().min(1),
    version: z.string().min(1),
    mode: ScenarioModeSchema,
    scenarioLevel: z.number().int().min(1).max(99),
    assetClass: z.string().min(1),
    assetId: z.string().min(1),
    marketSegment: z.string().min(1),
    timeframe: z.string().min(1),
    decisionPointT0: z.string().datetime({ offset: true })
  })
  .strict();

export const ScenarioRunSummarySchema = z
  .object({
    runId: z.string().min(1),
    scenarioId: z.string().min(1),
    scenarioVersion: z.string().min(1),
    state: ScenarioRunStateSchema,
    score: z.number().int().min(0).max(100).nullable(),
    createdAt: z.string().datetime({ offset: true }),
    sealedAt: z.string().datetime({ offset: true }).nullable()
  })
  .strict();

export type ScenarioPackageSummary = z.infer<typeof ScenarioPackageSummarySchema>;
export type ScenarioRunSummary = z.infer<typeof ScenarioRunSummarySchema>;

export const ScenarioRunStartRequestSchema = z.object({
  scenarioId: z.string().min(1),
  scenarioVersion: z.string().min(1),
  idempotencyKey: z.string().min(1).max(200)
}).strict();

export const DecisionTraceSchema = z.object({
  action: DecisionActionSchema,
  evidenceSourceIds: z.array(z.string().min(1)).min(1),
  invalidation: z.string().min(1),
  confidence: z.number().int().min(0).max(100)
}).strict();

export type ScenarioRunState = z.infer<typeof ScenarioRunStateSchema>;
export type ScenarioRunStartRequest = z.infer<typeof ScenarioRunStartRequestSchema>;
export type DecisionTrace = z.infer<typeof DecisionTraceSchema>;
