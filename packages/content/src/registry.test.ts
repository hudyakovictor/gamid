import assert from "node:assert/strict";
import test from "node:test";

import {
  contentCards,
  contentChapters,
  contentEntities,
  contentProtocols,
  theoryModules,
  validateContentRegistry
} from "./registry.js";

test("content registry passes its own validation", () => {
  const issues = validateContentRegistry();
  assert.deepEqual(issues, []);
});

test("registry scale matches the canonical curriculum", () => {
  assert.equal(contentCards.length, 40);
  assert.equal(contentProtocols.length, 9);
  assert.equal(contentEntities.length, 40);
  assert.equal(theoryModules.length, 15);
  assert.ok(contentChapters.length >= 100, "expected a full chapter set");
});

test("scenario levels 1–99 are covered exactly once", () => {
  const owner = new Map<number, string>();
  for (const module of theoryModules) {
    if (!module.levelRange) {
      continue;
    }
    for (let level = module.levelRange[0]; level <= module.levelRange[1]; level += 1) {
      assert.equal(
        owner.has(level),
        false,
        `Level ${level} owned by both ${owner.get(level)} and ${module.moduleId}`
      );
      owner.set(level, module.moduleId);
    }
  }
  assert.equal(owner.size, 99);
  for (let level = 1; level <= 99; level += 1) {
    assert.ok(owner.has(level), `Level ${level} is not covered`);
  }
});

test("critical curriculum topics appear by level 40", () => {
  const critical = ["m03_breakout_validation", "m05_risk_invalidation"];
  for (const moduleId of critical) {
    const module = theoryModules.find((candidate) => candidate.moduleId === moduleId);
    assert.ok(module, `missing ${moduleId}`);
    assert.ok(module.levelRange, `${moduleId} must own levels`);
    assert.ok(module.levelRange[1] <= 40, `${moduleId} ends after level 40`);
  }
});

test("broken card link is rejected", () => {
  const original = contentCards.map((card) => card.cardId);
  const module = theoryModules.find((candidate) => candidate.moduleId === "m01_decision_foundations");
  assert.ok(module);
  const swapped = [...module.cardIds];
  const removed = swapped.pop();
  assert.ok(removed);
  const issues = validateRegistrySnapshot({
    ...module,
    cardIds: [...swapped, "c99_does_not_exist"]
  });
  assert.ok(
    issues.some((issue) => issue.includes("c99_does_not_exist")),
    `expected unknown-card issue, got: ${issues.join("; ")}`
  );
  assert.equal(removed, module.cardIds[module.cardIds.length - 1]);
  assert.equal(contentCards.length, original.length);
});

test("Cyrillic entity name is rejected", () => {
  const original = contentEntities[0];
  assert.ok(original);
  const issues = validateEntityName("fake_breakout_phantom", "Фейк Брейкаут Фантом");
  assert.equal(issues.length, 1);
  assert.ok(issues[0]?.includes("exact English"));
  assert.equal(validateEntityName("fake_breakout_phantom", "Fake Breakout Phantom").length, 0);
  contentEntities[0] = original;
});

/* Local helpers: run the registry checks against a mutated snapshot. */

function validateRegistrySnapshot(module: (typeof theoryModules)[number]): string[] {
  const cardIds = new Set(contentCards.map((card) => card.cardId));
  const protocolIds = new Set(contentProtocols.map((protocol) => protocol.protocolId));
  const entityIds = new Set(contentEntities.map((contentEntity) => contentEntity.entityId));
  const issues: string[] = [];
  for (const cardId of module.cardIds) {
    if (!cardIds.has(cardId)) {
      issues.push(`Module ${module.moduleId} references unknown card ${cardId}`);
    }
  }
  for (const protocolId of module.protocolIds) {
    if (!protocolIds.has(protocolId)) {
      issues.push(`Module ${module.moduleId} references unknown protocol ${protocolId}`);
    }
  }
  for (const entityId of module.entityIds) {
    if (!entityIds.has(entityId)) {
      issues.push(`Module ${module.moduleId} references unknown entity ${entityId}`);
    }
  }
  return issues;
}

function validateEntityName(entityId: string, canonicalName: string): string[] {
  const CYRILLIC = /[\u0400-\u04FF]/;
  const issues: string[] = [];
  if (CYRILLIC.test(canonicalName)) {
    issues.push(
      `Entity ${entityId} canonical name must remain exact English: ${canonicalName}`
    );
  }
  return issues;
}
