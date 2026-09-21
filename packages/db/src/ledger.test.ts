import assert from "node:assert/strict";
import test from "node:test";

import {
  closeDatabase,
  createDatabase,
  recordLedgerEvent,
  deriveUserBalance,
  listLedgerEvents,
  type DatabaseHandle
} from "./index.js";

function setupUser(handle: DatabaseHandle, userId: string): void {
  handle.sqlite
    .prepare("INSERT INTO users (user_id, external_id, created_at) VALUES (?, ?, ?)")
    .run(userId, `ext-${userId}`, "2024-01-01T00:00:00Z");
}

test("ledger rejects duplicate idempotency keys (no double rewards)", () => {
  const handle = createDatabase();
  try {
    setupUser(handle, "u-ledger-1");
    const first = recordLedgerEvent(handle, {
      userId: "u-ledger-1",
      asset: "xp",
      amount: 52,
      reason: "guided_scenario_completed",
      scenarioId: "s1",
      idempotencyKey: "economy:xp:run-1",
      createdAt: "2024-01-01T05:00:00Z"
    });
    assert.equal(first.inserted, true);

    const duplicate = recordLedgerEvent(handle, {
      userId: "u-ledger-1",
      asset: "xp",
      amount: 52,
      reason: "guided_scenario_completed",
      scenarioId: "s1",
      idempotencyKey: "economy:xp:run-1",
      createdAt: "2024-01-01T05:00:00Z"
    });
    assert.equal(duplicate.inserted, false);
    assert.equal(duplicate.event.eventId, first.event.eventId);

    const balance = deriveUserBalance(handle, "u-ledger-1", "2024-01-01T12:00:00Z");
    assert.equal(balance.xp, 52);
  } finally {
    closeDatabase(handle);
  }
});

test("balance is derived: coins from ledger, state from xp grants", () => {
  const handle = createDatabase();
  try {
    setupUser(handle, "u-ledger-2");
    recordLedgerEvent(handle, {
      userId: "u-ledger-2",
      asset: "coins",
      amount: 100,
      reason: "coin_pack_purchased",
      sourceId: "pack-starter-1",
      idempotencyKey: "coins:pack-starter-1",
      createdAt: "2024-01-01T00:10:00Z"
    });
    recordLedgerEvent(handle, {
      userId: "u-ledger-2",
      asset: "coins",
      amount: 25,
      reason: "referral_activation",
      promo: true,
      idempotencyKey: "coins:referral-u-ledger-2",
      createdAt: "2024-01-01T00:20:00Z"
    });
    recordLedgerEvent(handle, {
      userId: "u-ledger-2",
      asset: "coins",
      amount: -20,
      reason: "energy_refilled",
      idempotencyKey: "coins:energy-refill-1",
      createdAt: "2024-01-01T00:30:00Z"
    });
    recordLedgerEvent(handle, {
      userId: "u-ledger-2",
      asset: "xp",
      amount: 125,
      reason: "guided_scenario_completed",
      scenarioId: "s1",
      idempotencyKey: "economy:xp:run-u2-1",
      createdAt: "2024-01-01T01:00:00Z"
    });
    recordLedgerEvent(handle, {
      userId: "u-ledger-2",
      asset: "mastery_stars",
      amount: 2,
      reason: "mastery_awarded",
      scenarioId: "s1",
      idempotencyKey: "economy:mastery:run-u2-1",
      createdAt: "2024-01-01T01:05:00Z"
    });
    recordLedgerEvent(handle, {
      userId: "u-ledger-2",
      asset: "energy",
      amount: -1,
      reason: "energy_spent",
      idempotencyKey: "energy:spend-arena-1",
      createdAt: "2024-01-01T02:00:00Z"
    });

    const balance = deriveUserBalance(handle, "u-ledger-2", "2024-01-01T02:10:00Z");
    assert.equal(balance.coins, 105);
    assert.equal(balance.coinsPromo, 25);
    assert.equal(balance.xp, 125);
    assert.equal(balance.accountLevel, 2);
    assert.equal(balance.xpToNext, 175);
    assert.equal(balance.masteryStars, 2);
    assert.equal(balance.energy, 4);
    assert.equal(balance.energyCap, 5);
    assert.equal(balance.xpToday, 125);
  } finally {
    closeDatabase(handle);
  }
});

test("sends cannot drive coins or mastery negative", () => {
  const handle = createDatabase();
  try {
    setupUser(handle, "u-ledger-3");
    assert.throws(() =>
      recordLedgerEvent(handle, {
        userId: "u-ledger-3",
        asset: "mastery_stars",
        amount: -1,
        reason: "mastery_awarded",
        scenarioId: "s1",
        idempotencyKey: "economy:mastery:run-u3-bad",
        createdAt: "2024-01-01T00:05:00Z"
      })
    );
    // Negative coins are detected on derivation, not on insert (the spend
    // check belongs to the spending service); assert the guard trips.
    recordLedgerEvent(handle, {
      userId: "u-ledger-3",
      asset: "coins",
      amount: -1,
      reason: "energy_refilled",
      idempotencyKey: "coins:energy-refill-neg",
      createdAt: "2024-01-01T00:05:00Z"
    });
    assert.throws(() => deriveUserBalance(handle, "u-ledger-3", "2024-01-01T06:00:00Z"));
  } finally {
    closeDatabase(handle);
  }
});

test("xp daily counter rolls over on a new UTC day", () => {
  const handle = createDatabase();
  try {
    setupUser(handle, "u-ledger-4");
    recordLedgerEvent(handle, {
      userId: "u-ledger-4",
      asset: "xp",
      amount: 400,
      reason: "quick_run_completed",
      scenarioId: "s1",
      idempotencyKey: "economy:xp:run-u4-1",
      createdAt: "2024-01-01T23:00:00Z"
    });
    const before = deriveUserBalance(handle, "u-ledger-4", "2024-01-01T23:30:00Z");
    assert.equal(before.xpToday, 400);

    recordLedgerEvent(handle, {
      userId: "u-ledger-4",
      asset: "xp",
      amount: 30,
      reason: "quick_run_completed",
      scenarioId: "s2",
      idempotencyKey: "economy:xp:run-u4-2",
      createdAt: "2024-01-02T01:00:00Z"
    });
    const after = deriveUserBalance(handle, "u-ledger-4", "2024-01-02T01:30:00Z");
    assert.equal(after.xp, 430);
    assert.equal(after.xpToday, 30);
  } finally {
    closeDatabase(handle);
  }
});

test("ledger events list is newest-first and bounded", () => {
  const handle = createDatabase();
  try {
    setupUser(handle, "u-ledger-5");
    for (let i = 0; i < 5; i += 1) {
      recordLedgerEvent(handle, {
        userId: "u-ledger-5",
        asset: "xp",
        amount: i + 1,
        reason: "quick_run_completed",
        scenarioId: `s${i}`,
        idempotencyKey: `economy:xp:run-${i}`,
        createdAt: `2024-01-01T00:0${i}:00Z`
      });
    }
    const events = listLedgerEvents(handle, "u-ledger-5", 3);
    assert.equal(events.length, 3);
    assert.deepEqual(events.map((event) => event.amount), [5, 4, 3]);
  } finally {
    closeDatabase(handle);
  }
});
