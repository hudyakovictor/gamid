import { z } from "zod";

export const ScoreBreakdownSchema = z.object({
  decision_quality: z.number().int().min(0).max(100),
  protocol_adherence: z.number().int().min(0).max(100),
  evidence_quality: z.number().int().min(0).max(100),
  follow_up_decision_quality: z.number().int().min(0).max(100),
  risk_management: z.number().int().min(0).max(100),
  invalidation: z.number().int().min(0).max(100),
  discipline: z.number().int().min(0).max(100),
  entity_resistance: z.number().int().min(0).max(100),
  confidence_calibration: z.number().int().min(0).max(100)
}).strict();

export const ScoreResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  breakdown: ScoreBreakdownSchema,
  rubricVersion: z.string().min(1)
}).strict();

export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>;
export type ScoreResult = z.infer<typeof ScoreResultSchema>;
