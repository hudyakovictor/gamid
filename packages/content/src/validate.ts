import {
  ScenarioPackageSchema,
  type ScenarioPackage,
  type SourceGroup
} from "../../contracts/src/scenario.js";

export function validateScenarioPackage(input: unknown): ScenarioPackage {
  const scenario = ScenarioPackageSchema.parse(input);
  const groups = new Set<SourceGroup>(scenario.availableSourceGroups);

  if (groups.size !== scenario.availableSourceGroups.length) {
    throw new Error(`Scenario ${scenario.scenarioId} repeats a Source Group`);
  }

  if (scenario.availableSources.some((source) => !groups.has(source.sourceGroup))) {
    throw new Error(`Scenario ${scenario.scenarioId} exposes a source outside its Source Groups`);
  }

  if (scenario.scenarioLevel <= 5 && groups.size > 3) {
    throw new Error(`Beginner scenario ${scenario.scenarioId} exceeds three Source Groups`);
  }

  if (scenario.availableSources.some((source) => source.availableAt > scenario.decisionPoint.t0)) {
    throw new Error(`Scenario ${scenario.scenarioId} contains a source after t0`);
  }

  if (scenario.historicalFutureSegment.from <= scenario.decisionPoint.t0) {
    throw new Error(`Scenario ${scenario.scenarioId} future starts before t0`);
  }

  return scenario;
}
