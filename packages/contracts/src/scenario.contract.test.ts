import assert from "node:assert/strict";
import test from "node:test";

import { starterScenario } from "../../content/src/fixtures/starter-scenario.js";
import { toPublicScenarioProjection } from "../../domain/src/scenario.js";
import {
  DecisionActionSchema,
  LoadoutSchema,
  ScenarioPackageSchema,
  ScenarioPublicProjectionSchema,
  ScenarioRevealProjectionSchema,
  SourceGroupSchema
} from "./scenario.js";

test("ScenarioPackage contract accepts the canonical fixture", () => {
  const parsed = ScenarioPackageSchema.parse(starterScenario);

  assert.equal(parsed.version, "1.0.0");
  assert.deepEqual(parsed.availableSourceGroups, ["PRICE", "FLOW"]);
  assert.deepEqual(parsed.allowedActions.slice(0, 4), [
    "long",
    "short",
    "wait",
    "no_trade"
  ]);
});

test("ScenarioPackage contract rejects unknown fields and invalid levels", () => {
  const withUnknownField = {
    ...starterScenario,
    serverOnlySecret: "must-not-be-in-contract"
  };
  const invalidLevel = {
    ...starterScenario,
    scenarioLevel: 100
  };

  assert.equal(ScenarioPackageSchema.safeParse(withUnknownField).success, false);
  assert.equal(ScenarioPackageSchema.safeParse(invalidLevel).success, false);
});

test("ScenarioPackage contract limits Source Groups to the canonical five", () => {
  assert.equal(SourceGroupSchema.options.length, 5);
  assert.equal(ScenarioPackageSchema.safeParse({
    ...starterScenario,
    availableSourceGroups: [
      "PRICE",
      "CONTEXT",
      "FLOW",
      "EVENT",
      "PROJECT",
      "PRICE"
    ]
  }).success, false);
});

test("public projection contract excludes server-only scenario fields", () => {
  const projection = toPublicScenarioProjection(starterScenario);
  const parsed = ScenarioPublicProjectionSchema.parse(projection);

  assert.equal(parsed.scenarioId, starterScenario.scenarioId);
  assert.equal("hiddenEntities" in parsed, false);
  assert.equal("historicalFutureSegment" in parsed, false);
  assert.equal("historicalOutcome" in parsed, false);
  assert.equal("evaluationRules" in parsed, false);
});

test("reveal projection contains server-only fields and no public-only evidence", () => {
  const projection = ScenarioRevealProjectionSchema.parse({
    scenarioId: starterScenario.scenarioId,
    version: starterScenario.version,
    hiddenEntities: starterScenario.hiddenEntities,
    historicalFutureSegment: starterScenario.historicalFutureSegment,
    historicalOutcome: starterScenario.historicalOutcome,
    evaluationRules: starterScenario.evaluationRules,
    debrief: starterScenario.debrief,
    rematchLogic: starterScenario.rematchLogic
  });

  assert.deepEqual(projection.hiddenEntities, ["fake_breakout_phantom"]);
  assert.equal("availableSources" in projection, false);
  assert.equal("assetId" in projection, false);
});

test("shared enum contracts contain all canonical decision actions", () => {
  assert.deepEqual(DecisionActionSchema.options, [
    "long",
    "short",
    "wait",
    "no_trade",
    "hold_plan",
    "reduce_risk",
    "close_position",
    "move_protection",
    "wait_for_confirmation",
    "do_not_average",
    "invalidate_idea"
  ]);
});

test("loadout contract is strict and versionable", () => {
  const loadout = LoadoutSchema.parse({
    mode: "arena",
    kind: "personal",
    cardIds: ["c01_market_structure"],
    protocolIds: ["p01_evidence_only"]
  });

  assert.equal(loadout.mode, "arena");
  assert.equal(LoadoutSchema.safeParse({
    ...loadout,
    unexpected: true
  }).success, false);
});
