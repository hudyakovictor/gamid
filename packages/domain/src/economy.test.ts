import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVITY_BASE_XP,
  accountLevelFromXp,
  applyEnergyRegen,
  canSpend,
  cumulativeXpAtLevelStart,
  grantActivityXp,
  masteryStarsForScore,
  REMATCH_IMPROVEMENT_BONUS,
  REMATCH_IMPROVEMENT_THRESHOLD,
  xpQualityModifier,
  xpToNext,
  XP_DAILY_CAP
} from "./economy.js";

// Reference snapshot from docs/game_balance_spec.md §3.1 — the generated
// server configuration is authoritative and must match the formula.
const SNAPSHOT_XP_TO_NEXT: Record<number, number> = {
  1: 125,
  2: 175,
  3: 250,
  4: 300,
  5: 350,
  6: 425,
  7: 500,
  8: 575,
  9: 650,
  10: 725,
  15: 1150,
  20: 1625,
  30: 2700,
  40: 3925,
  50: 5275,
  60: 6750,
  70: 8325,
  80: 10025,
  90: 11800,
  98: 13275
};

const SNAPSHOT_CUMULATIVE: Record<number, number> = {
  1: 0,
  2: 125,
  3: 300,
  4: 550,
  5: 850,
  6: 1200,
  7: 1625,
  8: 2125,
  9: 2700,
  10: 3350,
  15: 7775,
  20: 14450,
  30: 35375,
  40: 67800,
  50: 113025,
  60: 172350,
  70: 246900,
  80: 337750,
  90: 445875,
  98: 545400,
  99: 558675
};

test("XP curve matches the canonical reference snapshot", () => {
  for (const [level, expected] of Object.entries(SNAPSHOT_XP_TO_NEXT)) {
    assert.equal(
      xpToNext(Number(level)),
      expected,
      `xpToNext(${level}) should be ${expected}`
    );
  }
  for (const [level, expected] of Object.entries(SNAPSHOT_CUMULATIVE)) {
    assert.equal(
      cumulativeXpAtLevelStart(Number(level)),
      expected,
      `cumulativeXpAtLevelStart(${level}) should be ${expected}`
    );
  }
});

test("accountLevelFromXp inverts the curve", () => {
  assert.deepEqual(accountLevelFromXp(0), {
    level: 1,
    xpIntoLevel: 0,
    xpToNextLevel: 125
  });
  assert.deepEqual(accountLevelFromXp(124), {
    level: 1,
    xpIntoLevel: 124,
    xpToNextLevel: 125
  });
  assert.deepEqual(accountLevelFromXp(125), {
    level: 2,
    xpIntoLevel: 0,
    xpToNextLevel: 175
  });
  assert.equal(accountLevelFromXp(558675).level, 99);
  assert.equal(accountLevelFromXp(558675 + 5000).xpToNextLevel, null);
});

test("XP quality modifier bands", () => {
  assert.equal(xpQualityModifier(0), 0.75);
  assert.equal(xpQualityModifier(49), 0.75);
  assert.equal(xpQualityModifier(50), 1.0);
  assert.equal(xpQualityModifier(69), 1.0);
  assert.equal(xpQualityModifier(70), 1.15);
  assert.equal(xpQualityModifier(84), 1.15);
  assert.equal(xpQualityModifier(85), 1.3);
  assert.equal(xpQualityModifier(94), 1.3);
  assert.equal(xpQualityModifier(95), 1.4);
  assert.equal(xpQualityModifier(100), 1.4);
});

test("grantActivityXp applies modifier and daily cap", () => {
  // Guided academy scenario: 40 base × 1.3 (score 87) = 52.
  assert.equal(
    grantActivityXp({
      activity: "guided_academy_scenario",
      qualityScore: 87,
      xpAlreadyToday: 0
    }),
    52
  );
  // Daily cap: 480 already granted today, only 20 remain of the 52.
  assert.equal(
    grantActivityXp({
      activity: "guided_academy_scenario",
      qualityScore: 87,
      xpAlreadyToday: 480
    }),
    20
  );
  // Cap exhausted.
  assert.equal(
    grantActivityXp({
      activity: "quick_run",
      qualityScore: 100,
      xpAlreadyToday: XP_DAILY_CAP
    }),
    0
  );
  // Cap-exempt onboarding grants the full 100 even past the cap.
  assert.equal(
    grantActivityXp({
      activity: "onboarding_completion",
      xpAlreadyToday: XP_DAILY_CAP,
      exemptFromDailyCap: true
    }),
    100
  );
  assert.throws(() =>
    grantActivityXp({ activity: "does_not_exist", xpAlreadyToday: 0 })
  );
});

test("mastery stars: completion / 70 / 85 + key conditions", () => {
  assert.equal(masteryStarsForScore(50, false), 1);
  assert.equal(masteryStarsForScore(69, false), 1);
  assert.equal(masteryStarsForScore(70, false), 2);
  assert.equal(masteryStarsForScore(84, false), 2);
  assert.equal(masteryStarsForScore(85, false), 2);
  assert.equal(masteryStarsForScore(85, true), 3);
  assert.equal(masteryStarsForScore(100, true), 3);
});

test("energy regen: +1 per 30 minutes, capped", () => {
  const base = 1_700_000_000_000;
  assert.deepEqual(
    applyEnergyRegen({
      energy: 2,
      energyCap: 5,
      regenUpdatedAtMs: base,
      nowMs: base + 30 * 60 * 1000
    }),
    { energy: 3, regenUpdatedAtMs: base + 30 * 60 * 1000 }
  );
  assert.equal(
    applyEnergyRegen({
      energy: 2,
      energyCap: 5,
      regenUpdatedAtMs: base,
      nowMs: base + 24 * 60 * 60 * 1000
    }).energy,
    5
  );
  assert.throws(() =>
    applyEnergyRegen({
      energy: 5,
      energyCap: 5,
      regenUpdatedAtMs: base + 1,
      nowMs: base
    })
  );
  assert.throws(() =>
    applyEnergyRegen({
      energy: 6,
      energyCap: 5,
      regenUpdatedAtMs: base,
      nowMs: base
    })
  );
});

test("canSpend never allows negative balances", () => {
  assert.equal(canSpend(100, 100), true);
  assert.equal(canSpend(99, 100), false);
  assert.throws(() => canSpend(10, 0));
  assert.throws(() => canSpend(10, 1.5));
});

test("activity table covers the canonical reward set", () => {
  assert.equal(ACTIVITY_BASE_XP.onboarding_completion, 100);
  assert.equal(ACTIVITY_BASE_XP.guided_academy_scenario, 40);
  assert.equal(ACTIVITY_BASE_XP.quick_run, 25);
  assert.equal(ACTIVITY_BASE_XP.blind_scenario, 35);
  assert.equal(ACTIVITY_BASE_XP.conflict_scenario, 45);
  assert.equal(ACTIVITY_BASE_XP.daily_fix, 50);
  assert.equal(ACTIVITY_BASE_XP.post_loss_protocol, 30);
  assert.equal(ACTIVITY_BASE_XP.rematch, 20);
  assert.equal(ACTIVITY_BASE_XP.exam_pass, 150);
  assert.equal(REMATCH_IMPROVEMENT_BONUS, 40);
  assert.equal(REMATCH_IMPROVEMENT_THRESHOLD, 10);
  // Tournament grants no paid XP opportunity.
  assert.equal(ACTIVITY_BASE_XP.tournament, undefined);
});
