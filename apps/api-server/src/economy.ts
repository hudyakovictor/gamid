import type {
  LedgerEvent,
  LedgerReason,
  UserBalance
} from "../../../packages/contracts/src/economy.js";
import {
  grantActivityXp,
  masteryStarsForScore
} from "../../../packages/domain/src/economy.js";
import type { PersistencePort } from "../../../packages/db/src/ports.js";
import type { ScoreResult } from "../../../packages/contracts/src/index.js";

/**
 * Economy service (P1-7): server-authoritative reward grants for
 * verified run completions.
 *
 * Canonical rules: docs/game_balance_spec.md §3–4 and
 * docs/economy_monetization_referrals.md §8. Every grant is an immutable
 * ledger event with a stable idempotency key, so replayed reveals can
 * never double-grant XP or Mastery Stars.
 */

type EconomyPersistence = Pick<
  PersistencePort,
  "recordLedgerEvent" | "deriveUserBalance"
>;

/**
 * Scenario mode → rewardable activity (H-BAL-2 §3.2). Tournament grants
 * no XP (Rating/event rewards instead), so it is intentionally absent.
 */
const MODE_ACTIVITY: Record<string, {
  activity: Parameters<typeof grantActivityXp>[0]["activity"];
  reason: LedgerReason;
}> = {
  academy: { activity: "guided_academy_scenario", reason: "guided_scenario_completed" },
  arena: { activity: "quick_run", reason: "quick_run_completed" },
  collection: { activity: "quick_run", reason: "quick_run_completed" },
  series: { activity: "quick_run", reason: "quick_run_completed" },
  rematch: { activity: "rematch", reason: "rematch_completed" },
  exam: { activity: "exam_pass", reason: "exam_passed" }
};

const BREAKDOWN_DIMENSIONS = [
  "decision_quality",
  "protocol_adherence",
  "evidence_quality",
  "follow_up_decision_quality",
  "risk_management",
  "invalidation",
  "discipline",
  "entity_resistance",
  "confidence_calibration"
] as const;

/**
 * Foundation key conditions for the third Mastery Star (H-BAL-3 §4):
 * score ≥ 85 plus no evaluation dimension below the 70 floor.
 */
export function scenarioKeyConditionsMet(score: ScoreResult): boolean {
  if (score.score < 85) {
    return false;
  }
  return BREAKDOWN_DIMENSIONS.every((dimension) => score.breakdown[dimension] >= 70);
}

export type ScenarioRewardGrant = {
  xpGranted: number;
  masteryStars: number;
  events: LedgerEvent[];
  duplicate: boolean;
};

export async function grantScenarioRewards(
  persist: EconomyPersistence,
  params: {
    userId: string;
    runId: string;
    scenarioId: string;
    mode: string;
    score: ScoreResult;
    nowIso?: string;
  }
): Promise<ScenarioRewardGrant> {
  const nowIso = params.nowIso ?? new Date().toISOString();
  const mapping = MODE_ACTIVITY[params.mode];
  if (!mapping) {
    // Tournament and other non-rewardable modes grant no XP.
    return { xpGranted: 0, masteryStars: 0, events: [], duplicate: false };
  }

  const balance: UserBalance = await persist.deriveUserBalance(params.userId, nowIso);
  const exemptFromDailyCap = params.mode === "exam";
  const xpToGrant = grantActivityXp({
    activity: mapping.activity,
    qualityScore: params.score.score,
    xpAlreadyToday: balance.xpToday,
    exemptFromDailyCap
  });

  const events: LedgerEvent[] = [];
  let xpDuplicate = false;

  if (xpToGrant > 0) {
    const xpResult = await persist.recordLedgerEvent({
      userId: params.userId,
      asset: "xp",
      amount: xpToGrant,
      reason: mapping.reason,
      scenarioId: params.scenarioId,
      idempotencyKey: `economy:xp:${params.runId}`,
      createdAt: nowIso
    });
    if (xpResult.inserted) {
      events.push(xpResult.event);
    } else {
      xpDuplicate = true;
    }
  }

  const masteryStars = masteryStarsForScore(
    params.score.score,
    scenarioKeyConditionsMet(params.score)
  );
  const masteryResult = await persist.recordLedgerEvent({
    userId: params.userId,
    asset: "mastery_stars",
    amount: masteryStars,
    reason: "mastery_awarded",
    scenarioId: params.scenarioId,
    idempotencyKey: `economy:mastery:${params.runId}`,
    createdAt: nowIso
  });
  const masteryDuplicate = !masteryResult.inserted;
  if (masteryResult.inserted) {
    events.push(masteryResult.event);
  }

  return {
    // The run's grant is defined by its idempotency keys; whether it was
    // inserted now or existed before, the run owns exactly this amount.
    xpGranted: xpToGrant,
    masteryStars,
    events,
    duplicate: xpDuplicate || masteryDuplicate
  };
}
