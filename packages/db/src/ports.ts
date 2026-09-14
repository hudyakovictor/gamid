import type {
  AuthSessionRecord,
  CreateAuthSessionInput,
  CreateScenarioRunInput,
  HistoricalSnapshotRecord,
  PlatformIdentityInput,
  ScenarioRunRecord
} from "./repository.js";
import type { DecisionTrace } from "../../contracts/src/run.js";
import type {
  HistoricalMarketSnapshot,
  ScenarioPackage,
  ScoreResult
} from "../../contracts/src/index.js";

export type PersistencePort = {
  getOrCreateUserForIdentity(
    input: PlatformIdentityInput
  ): Promise<{ userId: string; created: boolean }>;
  consumeAuthReplayKey(
    replayKey: string,
    expiresAtMs: number,
    nowMs?: number
  ): Promise<boolean>;
  createAuthSession(input: CreateAuthSessionInput): Promise<AuthSessionRecord>;
  getActiveAuthSession(tokenHash: string, now?: string): Promise<AuthSessionRecord | undefined>;
  revokeAuthSession(sessionId: string, revokedAt?: string): Promise<boolean>;
  getScenarioPackage(scenarioId: string, version: string): Promise<ScenarioPackage | undefined>;
  createScenarioRun(input: CreateScenarioRunInput): Promise<ScenarioRunRecord>;
  getScenarioRun(runId: string, userId: string): Promise<ScenarioRunRecord | undefined>;
  sealScenarioRun(
    runId: string,
    userId: string,
    decision: DecisionTrace,
    score: ScoreResult
  ): Promise<ScenarioRunRecord>;
  revealScenarioRun(runId: string, userId: string): Promise<ScenarioRunRecord>;
  upsertHistoricalSnapshot(
    snapshot: HistoricalMarketSnapshot,
    snapshotId?: string,
    createdAt?: string
  ): Promise<HistoricalSnapshotRecord>;
  getHistoricalSnapshot(snapshotId: string): Promise<HistoricalSnapshotRecord | undefined>;
};
