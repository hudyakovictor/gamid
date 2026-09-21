import { z } from "zod";

/**
 * Economy runtime contracts (P1-7).
 *
 * Canonical source: docs/economy_monetization_referrals.md §8 — every
 * mutation is an immutable ledger event:
 *
 *   event_id, user_id, asset, amount, reason, source_id, scenario_id,
 *   idempotency_key, promo, created_at, risk_state
 *
 * Balances are derived from the ledger (or reconciled against it).
 * Client balances are display-only. Negative balances are impossible.
 * Duplicate events are rejected by idempotency key.
 */

export const LedgerAssetSchema = z.enum([
  "coins",
  "xp",
  "mastery_stars",
  "energy"
]);

export type LedgerAsset = z.infer<typeof LedgerAssetSchema>;

export const LedgerReasonSchema = z.enum([
  "onboarding_completion",
  "academy_theory_node",
  "worked_example",
  "guided_scenario_completed",
  "exam_passed",
  "quick_run_completed",
  "blind_scenario_completed",
  "conflict_scenario_completed",
  "daily_fix_completed",
  "post_loss_protocol_completed",
  "rematch_completed",
  "rematch_improvement",
  "challenge_friend_completed",
  "mastery_awarded",
  "energy_spent",
  "energy_refilled",
  "energy_regen",
  "rewarded_ad_energy",
  "coin_pack_purchased",
  "service_purchased",
  "sku_purchased",
  "referral_activation",
  "referral_purchase_bonus",
  "tournament_ticket_purchased",
  "tournament_promo_reward",
  "compensation",
  "referral_reward_rejected"
]);

export type LedgerReason = z.infer<typeof LedgerReasonSchema>;

export const LedgerRiskStateSchema = z.enum(["cleared", "hold"]);

export type LedgerRiskState = z.infer<typeof LedgerRiskStateSchema>;

export const LedgerEventSchema = z
  .object({
    eventId: z.string().uuid(),
    userId: z.string().min(1),
    asset: LedgerAssetSchema,
    /** Signed integer; the sign encodes grant (+) or spend (-). */
    amount: z.number().int().refine((value) => value !== 0, "amount must be non-zero"),
    reason: LedgerReasonSchema,
    sourceId: z.string().min(1).optional(),
    scenarioId: z.string().min(1).optional(),
    idempotencyKey: z.string().min(1).max(190),
    /** Promo flag: referral / promotional / compensation Coins. */
    promo: z.boolean().default(false),
    riskState: LedgerRiskStateSchema.default("cleared"),
    createdAt: z.string().datetime()
  })
  .strict();

export type LedgerEvent = z.infer<typeof LedgerEventSchema>;

export const LedgerEventPageSchema = z
  .object({
    events: z.array(LedgerEventSchema),
    asOf: z.string().datetime()
  })
  .strict();

export type LedgerEventPage = z.infer<typeof LedgerEventPageSchema>;

/**
 * Server-derived user balance. The client renders these values only;
 * it never computes them.
 */
export const UserBalanceSchema = z
  .object({
    userId: z.string().min(1),
    coins: z.number().int().nonnegative(),
    coinsPromo: z.number().int().nonnegative(),
    xp: z.number().int().nonnegative(),
    xpIntoLevel: z.number().int().nonnegative(),
    xpToNext: z.number().int().nonnegative(),
    accountLevel: z.number().int().min(1).max(99),
    masteryStars: z.number().int().nonnegative(),
    energy: z.number().int().min(0).max(99),
    energyCap: z.number().int().min(1).max(99),
    /** XP granted on the current UTC day (solo cap is 500). */
    xpToday: z.number().int().nonnegative(),
    xpDailyCap: z.number().int().positive(),
    asOf: z.string().datetime()
  })
  .strict();

export type UserBalance = z.infer<typeof UserBalanceSchema>;
