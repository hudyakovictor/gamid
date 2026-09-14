import { z } from "zod";

import { DecisionActionSchema } from "./scenario.js";

export const ScenarioRunStateSchema = z.enum([
  "started",
  "sealed",
  "revealed",
  "completed"
]);

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
