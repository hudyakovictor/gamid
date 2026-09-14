import {
  ScenarioPackageSchema,
  type DecisionAction,
  type Loadout,
  type ScenarioMode,
  type ScenarioPackage,
  type ScenarioPublicProjection,
  type ScenarioRevealProjection
} from "../../contracts/src/scenario.js";

export function toPublicScenarioProjection(
  scenario: ScenarioPackage
): ScenarioPublicProjection {
  const parsed = ScenarioPackageSchema.parse(scenario);
  const {
    hiddenEntities: _hiddenEntities,
    historicalFutureSegment: _future,
    historicalOutcome: _outcome,
    evaluationRules: _evaluationRules,
    debrief: _debrief,
    rematchLogic: _rematchLogic,
    ...publicProjection
  } = parsed;

  return publicProjection;
}

export function toScenarioRevealProjection(
  scenario: ScenarioPackage
): ScenarioRevealProjection {
  const parsed = ScenarioPackageSchema.parse(scenario);
  const {
    scenarioId,
    version,
    hiddenEntities,
    historicalFutureSegment,
    historicalOutcome,
    evaluationRules,
    debrief,
    rematchLogic
  } = parsed;

  return {
    scenarioId,
    version,
    hiddenEntities,
    historicalFutureSegment,
    historicalOutcome,
    evaluationRules,
    debrief,
    rematchLogic
  };
}

export function assertActionAllowed(
  scenario: ScenarioPackage,
  action: DecisionAction
): void {
  if (!scenario.allowedActions.includes(action)) {
    throw new Error(`Action ${action} is not allowed for ${scenario.scenarioId}`);
  }
}

export function assertLoadoutMode(loadout: Loadout): void {
  const expectedKinds: Partial<Record<ScenarioMode, Loadout["kind"][]>> = {
    academy: ["guided"],
    exam: ["curated"],
    arena: ["base", "personal"]
  };
  const allowedKinds = expectedKinds[loadout.mode];

  if (allowedKinds && !allowedKinds.includes(loadout.kind)) {
    throw new Error(`Loadout kind ${loadout.kind} is invalid for ${loadout.mode}`);
  }
}
