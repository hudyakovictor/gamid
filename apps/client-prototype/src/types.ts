/**
 * Shared client types. Contract types come from the versioned contracts
 * package; API response wrappers come from the typed client.
 */
export type {
  DecisionAction,
  DecisionTrace,
  ScenarioPublicProjection,
  ScenarioRevealProjection,
  ScoreResult,
  SourceGroup
} from "@signal-arena/contracts/src";

export type {
  ApiErrorCode,
  RunResponse,
  RunSummary,
  ScenarioSummary
} from "./api/client";
