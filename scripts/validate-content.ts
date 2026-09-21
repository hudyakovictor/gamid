import {
  advancedScenario,
  coreScenario,
  starterScenario,
  validateContentRegistry,
  validateScenarioPackage
} from "../packages/content/src/index.js";

const fixtures = [starterScenario, coreScenario, advancedScenario];

for (const scenario of fixtures) {
  const validated = validateScenarioPackage(scenario);
  console.log(
    `Content validation passed: ${validated.scenarioId} (level ${validated.scenarioLevel}) uses ${validated.availableSourceGroups.length} Source Groups.`
  );
}

const registryIssues = validateContentRegistry();
if (registryIssues.length > 0) {
  throw new Error(
    `Content registry validation failed:\n${registryIssues.join("\n")}`
  );
}

console.log(
  "Content registry validation passed: 15 modules (00–14), 40 cards, 9 protocols, 40 entities, levels 1–99 covered exactly once."
);
