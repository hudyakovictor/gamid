import type { PersistencePort } from "../../../packages/db/src/ports.js";
import type { ReferralRecord } from "../../../packages/db/src/store.js";

/**
 * Referral runtime (P1-7b) per docs/referral_and_growth_spec.md and
 * economy_monetization_referrals.md §6.
 *
 * One-level referrals only. Seven-day attribution window. Activation
 * (onboarding + 3 valid solo scenarios) pays 25 promo Coins to BOTH sides,
 * once per invitee. The inviter's first confirmed purchase pays the inviter
 * 50 promo Coins. All grants are server-side, idempotent, promo-flagged,
 * and capped at 250 promo Coins per inviter per UTC calendar month
 * (which also bounds purchase bonuses to five per month).
 */

type ReferralPersistence = Pick<
  PersistencePort,
  | "atomic"
  | "getOrCreateReferral"
  | "getReferralByCode"
  | "findReferralByInvitee"
  | "attributeReferral"
  | "countValidScenarios"
  | "setReferralScenarioCount"
  | "activateReferral"
  | "grantReferralPurchaseBonus"
  | "recordLedgerEvent"
  | "sumPromoCoinsInRange"
>;

export const REFERRAL_ACTIVATION_REWARD_COINS = 25;
export const REFERRAL_PURCHASE_BONUS_COINS = 50;
export const REFERRAL_MONTHLY_PROMO_CAP = 250;
export const REFERRAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const REFERRAL_ACTIVATION_SCENARIOS = 3;

export class ReferralError extends Error {
  public constructor(
    public readonly code:
      | "referral_not_found"
      | "self_referral"
      | "window_expired"
      | "already_attributed"
      | "cap_reached",
    message: string
  ) {
    super(message);
    this.name = "ReferralError";
  }
}

function monthBounds(nowIso: string): { from: string; to: string } {
  const yearMonth = nowIso.slice(0, 7); // UTC YYYY-MM
  const from = `${yearMonth}-01T00:00:00Z`;
  const parts = yearMonth.split("-").map(Number);
  const year = parts[0] ?? 1970;
  const month = parts[1] ?? 1;
  const nextMonth =
    month === 12
      ? `${year + 1}-01`
      : `${year}-${String(month + 1).padStart(2, "0")}`;
  const to = `${nextMonth}-01T00:00:00Z`;
  return { from, to };
}

async function grantPromoCoinsIfUnderCap(
  persist: ReferralPersistence,
  params: {
    userId: string;
    amount: number;
    reason: "referral_activation" | "referral_purchase_bonus";
    idempotencyKey: string;
    nowIso: string;
  }
): Promise<boolean> {
  const { from, to } = monthBounds(params.nowIso);
  const alreadyThisMonth = await persist.sumPromoCoinsInRange(params.userId, from, to);
  if (alreadyThisMonth + params.amount > REFERRAL_MONTHLY_PROMO_CAP) {
    return false;
  }
  const result = await persist.recordLedgerEvent({
    userId: params.userId,
    asset: "coins",
    amount: params.amount,
    reason: params.reason,
    promo: true,
    idempotencyKey: params.idempotencyKey,
    createdAt: params.nowIso
  });
  return result.inserted;
}

export async function createReferralCode(
  persist: ReferralPersistence,
  userId: string,
  nowIso?: string
): Promise<{ created: boolean; referral: ReferralRecord }> {
  const now = nowIso ?? new Date().toISOString();
  return persist.getOrCreateReferral({ inviterId: userId, createdAt: now });
}

export async function attributeReferral(
  persist: ReferralPersistence,
  params: { code: string; inviteeId: string; nowIso?: string }
): Promise<ReferralRecord> {
  return persist.atomic(() => attributeReferralInTransaction(persist, params));
}

async function attributeReferralInTransaction(
  persist: ReferralPersistence,
  params: { code: string; inviteeId: string; nowIso?: string }
): Promise<ReferralRecord> {
  const now = params.nowIso ?? new Date().toISOString();
  const referral = await persist.getReferralByCode(params.code);
  if (!referral) {
    throw new ReferralError("referral_not_found", `Unknown invite code: ${params.code}`);
  }
  if (referral.inviteeId === params.inviteeId) {
    // Idempotent re-attribution by the same invitee.
    return referral;
  }
  if (referral.inviteeId !== null) {
    throw new ReferralError("already_attributed", "This invite code is already attributed");
  }
  if (referral.inviterId === params.inviteeId) {
    // Self-referral: no rewards, record the rejection server-side.
    throw new ReferralError("self_referral", "Self-referrals are not allowed");
  }
  const attributed = await persist.attributeReferral({
    code: params.code,
    inviteeId: params.inviteeId,
    attributedAt: now,
    windowExpiresAt: new Date(Date.parse(now) + REFERRAL_WINDOW_MS).toISOString()
  });
  if (!attributed) {
    throw new ReferralError("referral_not_found", "Invite code is not available for attribution");
  }
  const updated = await persist.getReferralByCode(params.code);
  return updated as ReferralRecord;
}

/**
 * Server-driven progress check, called after every valid scenario
 * completion of the invitee. Activates the referral (and pays both sides)
 * exactly once when three valid solo scenarios are reached inside the
 * attribution window.
 */
export async function syncReferralProgress(
  persist: ReferralPersistence,
  inviteeId: string,
  nowIso?: string
): Promise<{ activated: boolean; inviterRewardGranted: boolean; inviteeRewardGranted: boolean }> {
  return persist.atomic(() => syncReferralProgressInTransaction(persist, inviteeId, nowIso));
}

async function syncReferralProgressInTransaction(
  persist: ReferralPersistence,
  inviteeId: string,
  nowIso?: string
): Promise<{ activated: boolean; inviterRewardGranted: boolean; inviteeRewardGranted: boolean }> {
  const now = nowIso ?? new Date().toISOString();
  const referral = await findInviteeReferral(persist, inviteeId);
  if (!referral) {
    return { activated: false, inviterRewardGranted: false, inviteeRewardGranted: false };
  }
  // Already activated: idempotent report, no new rewards.
  if (referral.state === "activated") {
    return { activated: true, inviterRewardGranted: false, inviteeRewardGranted: false };
  }
  if (referral.state !== "attributed") {
    return { activated: false, inviterRewardGranted: false, inviteeRewardGranted: false };
  }
  if (referral.windowExpiresAt !== null && Date.parse(referral.windowExpiresAt) < Date.parse(now)) {
    return { activated: false, inviterRewardGranted: false, inviteeRewardGranted: false };
  }

  const validScenarios = await persist.countValidScenarios(inviteeId);
  await persist.setReferralScenarioCount(referral.code, validScenarios);
  if (validScenarios < REFERRAL_ACTIVATION_SCENARIOS) {
    return { activated: false, inviterRewardGranted: false, inviteeRewardGranted: false };
  }

  const activated = await persist.activateReferral(referral.code, now);
  if (!activated) {
    const current = await persist.getReferralByCode(referral.code);
    return {
      activated: current?.state === "activated",
      inviterRewardGranted: false,
      inviteeRewardGranted: false
    };
  }

  const inviterRewardGranted = await grantPromoCoinsIfUnderCap(persist, {
    userId: referral.inviterId,
    amount: REFERRAL_ACTIVATION_REWARD_COINS,
    reason: "referral_activation",
    idempotencyKey: `referral:activation:${referral.code}:inviter`,
    nowIso: now
  });
  const inviteeRewardGranted = await grantPromoCoinsIfUnderCap(persist, {
    userId: inviteeId,
    amount: REFERRAL_ACTIVATION_REWARD_COINS,
    reason: "referral_activation",
    idempotencyKey: `referral:activation:${referral.code}:invitee`,
    nowIso: now
  });

  return { activated: true, inviterRewardGranted, inviteeRewardGranted };
}

/**
 * Server-driven hook, called after the invitee's first confirmed purchase.
 * Grants the inviter the 50-coin purchase bonus once, under the monthly cap.
 */
export async function onInviteePurchase(
  persist: ReferralPersistence,
  inviteeId: string,
  nowIso?: string
): Promise<{ bonusGranted: boolean }> {
  return persist.atomic(() => onInviteePurchaseInTransaction(persist, inviteeId, nowIso));
}

async function onInviteePurchaseInTransaction(
  persist: ReferralPersistence,
  inviteeId: string,
  nowIso?: string
): Promise<{ bonusGranted: boolean }> {
  const now = nowIso ?? new Date().toISOString();
  const referral = await findInviteeReferral(persist, inviteeId);
  if (!referral || referral.state !== "activated" || referral.purchaseBonusAt !== null) {
    return { bonusGranted: false };
  }
  const bonusGranted = await grantPromoCoinsIfUnderCap(persist, {
    userId: referral.inviterId,
    amount: REFERRAL_PURCHASE_BONUS_COINS,
    reason: "referral_purchase_bonus",
    idempotencyKey: `referral:purchase:${referral.code}`,
    nowIso: now
  });
  if (bonusGranted) {
    await persist.grantReferralPurchaseBonus(referral.code, now);
  }
  return { bonusGranted };
}

async function findInviteeReferral(
  persist: ReferralPersistence,
  inviteeId: string
): Promise<ReferralRecord | undefined> {
  return persist.findReferralByInvitee(inviteeId);
}
