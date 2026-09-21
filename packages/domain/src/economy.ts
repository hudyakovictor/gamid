/**
 * Economy domain rules (P1-7).
 *
 * Pure, server-authoritative progression math from
 * docs/game_balance_spec.md and docs/economy_monetization_referrals.md.
 * The client never computes these values; it renders server responses.
 */

/** Daily cap for normal solo XP (UTC day). */
export const XP_DAILY_CAP = 500;

/** Account levels are 1–99; the curve owns the whole range. */
export const ACCOUNT_LEVEL_MIN = 1;
export const ACCOUNT_LEVEL_MAX = 99;

/** Energy: cap 5 at start, regen 1 per 30 minutes. */
export const ENERGY_BASE_CAP = 5;
export const ENERGY_REGEN_MS = 30 * 60 * 1000;

/**
 * Account Level XP curve (`H-BAL-1`):
 *
 *   xpToNext(L) = roundTo25(90 + 35L + 8L^1.55)
 *
 * The generated configuration is tested against the reference snapshot
 * in the unit tests before release.
 */
export function xpToNext(level: number): number {
  if (!Number.isInteger(level) || level < ACCOUNT_LEVEL_MIN || level > ACCOUNT_LEVEL_MAX) {
    throw new Error(`xpToNext: level must be an integer in 1..99, got ${String(level)}`);
  }
  const raw = 90 + 35 * level + 8 * Math.pow(level, 1.55);
  return Math.round(raw / 25) * 25;
}

/** Cumulative XP required to reach the start of `level`. */
export function cumulativeXpAtLevelStart(level: number): number {
  if (!Number.isInteger(level) || level < ACCOUNT_LEVEL_MIN || level > ACCOUNT_LEVEL_MAX) {
    throw new Error(
      `cumulativeXpAtLevelStart: level must be an integer in 1..99, got ${String(level)}`
    );
  }
  let total = 0;
  for (let candidate = ACCOUNT_LEVEL_MIN; candidate < level; candidate += 1) {
    total += xpToNext(candidate);
  }
  return total;
}

/** Derive the Account Level (and XP into the next level) from total XP. */
export function accountLevelFromXp(xpTotal: number): {
  level: number;
  xpIntoLevel: number;
  xpToNextLevel: number | null;
} {
  if (!Number.isInteger(xpTotal) || xpTotal < 0) {
    throw new Error(`accountLevelFromXp: expected non-negative integer, got ${String(xpTotal)}`);
  }
  let level = ACCOUNT_LEVEL_MIN;
  let remaining = xpTotal;
  while (level < ACCOUNT_LEVEL_MAX) {
    const needed = xpToNext(level);
    if (remaining < needed) {
      break;
    }
    remaining -= needed;
    level += 1;
  }
  return {
    level,
    xpIntoLevel: remaining,
    xpToNextLevel: level < ACCOUNT_LEVEL_MAX ? xpToNext(level) : null
  };
}

/**
 * Quality modifier (`H-BAL-2` §3.3). Applied to the first rewardable
 * completion in the relevant reward window.
 */
export function xpQualityModifier(qualityScore: number): number {
  if (qualityScore < 0 || qualityScore > 100) {
    throw new Error(`xpQualityModifier: score must be 0..100, got ${String(qualityScore)}`);
  }
  if (qualityScore <= 49) return 0.75;
  if (qualityScore <= 69) return 1.0;
  if (qualityScore <= 84) return 1.15;
  if (qualityScore <= 94) return 1.3;
  return 1.4;
}

/**
 * Base XP by verified activity (`H-BAL-2` §3.2). Tournament grants no
 * paid XP opportunity; it is not a rewardable activity here.
 */
export const ACTIVITY_BASE_XP: Record<string, number> = {
  onboarding_completion: 100,
  academy_theory_node: 10,
  worked_example: 20,
  guided_academy_scenario: 40,
  exam_pass: 150,
  quick_run: 25,
  blind_scenario: 35,
  conflict_scenario: 45,
  daily_fix: 50,
  post_loss_protocol: 30,
  rematch: 20,
  challenge_friend: 20
} as const;

/** Rematch improvement bonus: improvement ≥ 10 points, once per pair. */
export const REMATCH_IMPROVEMENT_BONUS = 40;
export const REMATCH_IMPROVEMENT_THRESHOLD = 10;

/**
 * Mastery Stars per scenario (`H-BAL-3` §4):
 * ★ completed; ★★ Quality Score ≥ 70; ★★★ ≥ 85 plus key conditions.
 * Key conditions are scenario-specific, so the server awards up to 2
 * stars from the score alone and the 3rd star requires the scenario's
 * `evaluationRules` key conditions (checked by the scoring service).
 */
export function masteryStarsForScore(
  qualityScore: number,
  keyConditionsMet: boolean
): number {
  if (qualityScore < 0 || qualityScore > 100) {
    throw new Error(`masteryStarsForScore: score must be 0..100, got ${String(qualityScore)}`);
  }
  if (qualityScore >= 85 && keyConditionsMet) return 3;
  if (qualityScore >= 70) return 2;
  return 1;
}

/**
 * Grant XP for an activity, respecting the modifier and the daily cap.
 * `xpAlreadyToday` is the XP granted earlier on the same UTC day.
 * Returns the actually-granted amount (0 when the cap is reached).
 *
 * Cap exemptions (onboarding, first exam pass, compensation) are
 * handled by the caller passing `exemptFromDailyCap: true`.
 */
export function grantActivityXp(input: {
  activity: keyof typeof ACTIVITY_BASE_XP | string;
  qualityScore?: number;
  xpAlreadyToday: number;
  exemptFromDailyCap?: boolean;
}): number {
  const base = ACTIVITY_BASE_XP[input.activity];
  if (base === undefined) {
    throw new Error(`grantActivityXp: unknown activity ${input.activity}`);
  }
  let amount = base;
  // Quality modifier applies to scenarios, not to fixed-value grants.
  if (input.qualityScore !== undefined) {
    amount = Math.round(base * xpQualityModifier(input.qualityScore));
  }
  if (input.exemptFromDailyCap) {
    return amount;
  }
  const remaining = Math.max(0, XP_DAILY_CAP - input.xpAlreadyToday);
  return Math.min(amount, remaining);
}

/**
 * Energy after passive regen: +1 per 30 minutes, capped at `energyCap`.
 * `nowMs` and `regenUpdatedAtMs` are server clocks only.
 */
export function applyEnergyRegen(input: {
  energy: number;
  energyCap: number;
  regenUpdatedAtMs: number;
  nowMs: number;
}): { energy: number; regenUpdatedAtMs: number } {
  if (input.nowMs < input.regenUpdatedAtMs) {
    throw new Error("applyEnergyRegen: clock moved backwards");
  }
  if (input.energy > input.energyCap) {
    throw new Error("applyEnergyRegen: energy exceeds cap");
  }
  const elapsed = input.nowMs - input.regenUpdatedAtMs;
  const gained = Math.floor(elapsed / ENERGY_REGEN_MS);
  const energy = Math.min(input.energyCap, input.energy + gained);
  const fullyRegenerated = energy >= input.energyCap;
  return {
    energy,
    regenUpdatedAtMs: fullyRegenerated
      ? input.regenUpdatedAtMs + gained * ENERGY_REGEN_MS
      : input.nowMs
  };
}

/** Refund-safe spend: never drives a balance below zero. */
export function canSpend(balance: number, amount: number): boolean {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`canSpend: amount must be a positive integer, got ${String(amount)}`);
  }
  return balance >= amount;
}
