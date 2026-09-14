import { starterScenario } from "../packages/content/src/fixtures/starter-scenario.js";
import { validateScenarioPackage } from "../packages/content/src/validate.js";

const scenario = validateScenarioPackage(starterScenario);

console.log(
  `Content validation passed: ${scenario.scenarioId} uses ${scenario.availableSourceGroups.length} Source Groups.`
);
