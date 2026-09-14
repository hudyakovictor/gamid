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

  const decisionTime = Date.parse(scenario.decisionPoint.t0);

  if (scenario.availableSources.some((source) => {
    const observedTime = Date.parse(source.observedAt);
    const availableTime = Date.parse(source.availableAt);
    const publishedTime = source.publishedAt ? Date.parse(source.publishedAt) : undefined;

    return availableTime < observedTime
      || (publishedTime !== undefined && availableTime < publishedTime)
      || availableTime > decisionTime;
  })) {
    throw new Error(`Scenario ${scenario.scenarioId} contains an unavailable or post-t0 source`);
  }

  const futureStart = Date.parse(scenario.historicalFutureSegment.from);
  const futureEnd = Date.parse(scenario.historicalFutureSegment.to);
  if (futureStart <= decisionTime || futureEnd <= futureStart) {
    throw new Error(`Scenario ${scenario.scenarioId} has an invalid historical future range`);
  }

  if (scenario.futureHash !== scenario.historicalFutureSegment.contentHash) {
    throw new Error(`Scenario ${scenario.scenarioId} future hash does not match its future segment`);
  }

  return scenario;
}

export function importScenarioPackage(input: unknown): ScenarioPackage {
  let decoded: unknown = input;

  if (typeof input === "string") {
    try {
      decoded = JSON.parse(input) as unknown;
    } catch {
      throw new Error("ScenarioPackage import received invalid JSON");
    }
  }

  return validateScenarioPackage(decoded);
}
