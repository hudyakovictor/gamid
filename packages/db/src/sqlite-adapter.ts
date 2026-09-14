import type {
  HistoricalMarketSnapshot,
  ScenarioPackage,
  ScoreResult
} from "../../contracts/src/index.js";
import type { DecisionTrace } from "../../contracts/src/run.js";
import type { DatabaseHandle } from "./database.js";
import {
  consumeAuthReplayKey,
  createAuthSession,
  createScenarioRun,
  getActiveAuthSession,
  getHistoricalSnapshot,
  getOrCreateUserForIdentity,
  getScenarioPackage,
  getScenarioRun,
  revokeAuthSession,
  revealScenarioRun,
  sealScenarioRun,
  upsertHistoricalSnapshot,
  type AuthSessionRecord,
  type CreateAuthSessionInput,
  type CreateScenarioRunInput,
  type HistoricalSnapshotRecord,
  type PlatformIdentityInput,
  type ScenarioRunRecord
} from "./repository.js";
import type { PersistencePort } from "./ports.js";

export class SqlitePersistenceAdapter implements PersistencePort {
  public constructor(private readonly handle: DatabaseHandle) {}

  public async getOrCreateUserForIdentity(
    input: PlatformIdentityInput
  ): Promise<{ userId: string; created: boolean }> {
    return getOrCreateUserForIdentity(this.handle, input);
  }

  public async consumeAuthReplayKey(
    replayKey: string,
    expiresAtMs: number,
    nowMs?: number
  ): Promise<boolean> {
    return consumeAuthReplayKey(this.handle, replayKey, expiresAtMs, nowMs);
  }

  public async createAuthSession(input: CreateAuthSessionInput): Promise<AuthSessionRecord> {
    return createAuthSession(this.handle, input);
  }

  public async getActiveAuthSession(
    tokenHash: string,
    now?: string
  ): Promise<AuthSessionRecord | undefined> {
    return getActiveAuthSession(this.handle, tokenHash, now);
  }

  public async revokeAuthSession(sessionId: string, revokedAt?: string): Promise<boolean> {
    return revokeAuthSession(this.handle, sessionId, revokedAt);
  }

  public async getScenarioPackage(
    scenarioId: string,
    version: string
  ): Promise<ScenarioPackage | undefined> {
    return getScenarioPackage(this.handle, scenarioId, version);
  }

  public async createScenarioRun(input: CreateScenarioRunInput): Promise<ScenarioRunRecord> {
    return createScenarioRun(this.handle, input);
  }

  public async getScenarioRun(
    runId: string,
    userId: string
  ): Promise<ScenarioRunRecord | undefined> {
    return getScenarioRun(this.handle, runId, userId);
  }

  public async sealScenarioRun(
    runId: string,
    userId: string,
    decision: DecisionTrace,
    score: ScoreResult
  ): Promise<ScenarioRunRecord> {
    return sealScenarioRun(this.handle, runId, userId, decision, score);
  }

  public async revealScenarioRun(
    runId: string,
    userId: string
  ): Promise<ScenarioRunRecord> {
    return revealScenarioRun(this.handle, runId, userId);
  }

  public async upsertHistoricalSnapshot(
    snapshot: HistoricalMarketSnapshot,
    snapshotId?: string,
    createdAt?: string
  ): Promise<HistoricalSnapshotRecord> {
    return upsertHistoricalSnapshot(this.handle, snapshot, snapshotId, createdAt);
  }

  public async getHistoricalSnapshot(
    snapshotId: string
  ): Promise<HistoricalSnapshotRecord | undefined> {
    return getHistoricalSnapshot(this.handle, snapshotId);
  }
}
