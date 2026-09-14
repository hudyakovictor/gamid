import assert from "node:assert/strict";

import { starterScenario } from "../packages/content/src/fixtures/starter-scenario.js";
import { toPublicScenarioProjection } from "../packages/domain/src/scenario.js";
import { ScenarioPublicProjectionSchema } from "../packages/contracts/src/scenario.js";

const publicProjection = toPublicScenarioProjection(starterScenario);
const parsedProjection = ScenarioPublicProjectionSchema.parse(publicProjection);

assert.equal(parsedProjection.scenarioId, starterScenario.scenarioId);
assert.equal("hiddenEntities" in publicProjection, false);
assert.equal("historicalFutureSegment" in publicProjection, false);
assert.equal("historicalOutcome" in publicProjection, false);

console.log("Contract validation passed: public projection excludes hidden and future data.");
