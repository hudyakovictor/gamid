import { AsyncLocalStorage } from "node:async_hooks";
import type {
  HistoricalMarketSnapshot,
  ScenarioPackage,
  ScoreResult
} from "../../contracts/src/index.js";
import type { DecisionTrace } from "../../contracts/src/run.js";
import type { LedgerEvent, UserBalance } from "../../contracts/src/economy.js";
import type { Purchase } from "../../contracts/src/catalog.js";
import {
  deriveUserBalance,
  listLedgerEvents,
  recordLedgerEvent,
  sumPromoCoinsInRange,
  type LedgerEventInput
} from "./ledger.js";
import {
  activateReferral,
  attributeReferral,
  countValidScenarios,
  createPurchase,
  findReferralByInvitee,
  getOrCreateReferral,
  getPurchase,
  getPurchaseByInvoice,
  getPurchaseByIdempotencyKey,
  getReferralByCode,
  grantEntitlement,
  grantReferralPurchaseBonus,
  listActiveEntitlements,
  markPurchaseRefunded,
  releaseSupply,
  reserveSupply,
  revokeEntitlement,
  setReferralScenarioCount,
  type ReferralRecord
} from "./store.js";
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
  listScenarioPackages,
  listScenarioRunsForUser,
  revokeAuthSession,
  revealScenarioRun,
  sealScenarioRun,
  setScenarioReviewStatus,
  upsertHistoricalSnapshot,
  upsertScenarioPackage,
  type AuthSessionRecord,
  type CreateAuthSessionInput,
  type CreateScenarioRunInput,
  type HistoricalSnapshotRecord,
  type PlatformIdentityInput,
  type ScenarioPackageSummary,
  type ScenarioRunRecord,
  type ScenarioRunSummary
} from "./repository.js";
import type { PersistencePort } from "./ports.js";

type ConnectionQueue = { context: AsyncLocalStorage<boolean>; tail: Promise<unknown> };
const connectionQueues = new WeakMap<DatabaseHandle["sqlite"], ConnectionQueue>();

export class SqlitePersistenceAdapter implements PersistencePort {
  private readonly queue: ConnectionQueue;

  public constructor(private readonly handle: DatabaseHandle) {
    const queue = connectionQueues.get(handle.sqlite) ?? {
      context: new AsyncLocalStorage<boolean>(), tail: Promise.resolve()
    };
    connectionQueues.set(handle.sqlite, queue);
    this.queue = queue;
    // Every adapter call uses the same queue, including reads, so unrelated
    // requests cannot observe or join a transaction while its callback awaits.
    return new Proxy(this, {
      get: (target, key) => {
        const value: unknown = Reflect.get(target, key);
        if (typeof value !== "function" || key === "constructor") return value;
        return (...args: unknown[]) => target.serial(() => value.apply(target, args));
      }
    });
  }

  private async serial<T>(operation: () => Promise<T>): Promise<T> {
    if (this.queue.context.getStore()) return operation();
    const result = this.queue.tail.then(() => this.queue.context.run(true, operation));
    this.queue.tail = result.catch(() => undefined);
    return result;
  }

  public async atomic<T>(operation: () => Promise<T>): Promise<T> {
    if (this.handle.sqlite.inTransaction) return operation();
    this.handle.sqlite.exec("BEGIN IMMEDIATE");
    try {
      const result = await operation();
      this.handle.sqlite.exec("COMMIT");
      return result;
    } catch (error) {
      this.handle.sqlite.exec("ROLLBACK");
      throw error;
    }
  }

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

  public async listScenarioPackages(): Promise<ScenarioPackageSummary[]> {
    return listScenarioPackages(this.handle);
  }

  public async upsertScenarioPackage(
    package_: ScenarioPackage,
    nowIso?: string
  ): Promise<{ created: boolean }> {
    return upsertScenarioPackage(this.handle, package_, nowIso);
  }

  public async setScenarioReviewStatus(
    scenarioId: string,
    version: string,
    status: string,
    nowIso?: string
  ): Promise<boolean> {
    return setScenarioReviewStatus(this.handle, scenarioId, version, status, nowIso);
  }

  public async createScenarioRun(input: CreateScenarioRunInput): Promise<ScenarioRunRecord> {
    return createScenarioRun(this.handle, input);
  }

  public async listScenarioRunsForUser(userId: string): Promise<ScenarioRunSummary[]> {
    return listScenarioRunsForUser(this.handle, userId);
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

  public async recordLedgerEvent(
    input: LedgerEventInput
  ): Promise<{ inserted: boolean; event: LedgerEvent }> {
    return recordLedgerEvent(this.handle, input);
  }

  public async listLedgerEvents(
    userId: string,
    limit?: number
  ): Promise<LedgerEvent[]> {
    return listLedgerEvents(this.handle, userId, limit);
  }

  public async deriveUserBalance(userId: string, nowIso?: string): Promise<UserBalance> {
    return deriveUserBalance(this.handle, userId, nowIso ?? new Date().toISOString());
  }

  public async sumPromoCoinsInRange(
    userId: string,
    fromIso: string,
    toIso: string
  ): Promise<number> {
    return sumPromoCoinsInRange(this.handle, userId, fromIso, toIso);
  }

  public async createPurchase(input: {
    purchaseId: string;
    userId: string;
    kind: Purchase["kind"];
    itemId: string;
    priceCoins: number;
    invoiceId?: string | undefined;
    idempotencyKey: string;
    createdAt: string;
  }): Promise<Purchase> {
    return createPurchase(this.handle, input);
  }

  public async getPurchaseByIdempotencyKey(
    idempotencyKey: string
  ): Promise<Purchase | undefined> {
    return getPurchaseByIdempotencyKey(this.handle, idempotencyKey);
  }

  public async getPurchaseByInvoice(invoiceId: string): Promise<Purchase | undefined> {
    return getPurchaseByInvoice(this.handle, invoiceId);
  }

  public async getPurchase(
    purchaseId: string,
    userId: string
  ): Promise<Purchase | undefined> {
    return getPurchase(this.handle, purchaseId, userId);
  }

  public async markPurchaseRefunded(
    purchaseId: string,
    userId: string,
    refundedAt: string
  ): Promise<boolean> {
    return markPurchaseRefunded(this.handle, purchaseId, userId, refundedAt);
  }

  public async reserveSupply(
    itemId: string,
    supplyLimit: number | undefined
  ): Promise<boolean> {
    return reserveSupply(this.handle, itemId, supplyLimit);
  }

  public async releaseSupply(itemId: string): Promise<void> {
    releaseSupply(this.handle, itemId);
  }

  public async grantEntitlement(input: {
    userId: string;
    entitlementKey: string;
    sourcePurchaseId: string;
    createdAt: string;
  }): Promise<{ inserted: boolean; entitlementId: string }> {
    return grantEntitlement(this.handle, input);
  }

  public async revokeEntitlement(
    userId: string,
    entitlementKey: string,
    revokedAt: string
  ): Promise<boolean> {
    return revokeEntitlement(this.handle, userId, entitlementKey, revokedAt);
  }

  public async listActiveEntitlements(
    userId: string
  ): Promise<Array<{ entitlementKey: string; sourcePurchaseId: string; createdAt: string }>> {
    return listActiveEntitlements(this.handle, userId);
  }

  public async getOrCreateReferral(input: {
    inviterId: string;
    code?: string | undefined;
    createdAt: string;
  }): Promise<{ created: boolean; referral: ReferralRecord }> {
    return getOrCreateReferral(this.handle, input);
  }

  public async getReferralByCode(code: string): Promise<ReferralRecord | undefined> {
    return getReferralByCode(this.handle, code);
  }

  public async findReferralByInvitee(inviteeId: string): Promise<ReferralRecord | undefined> {
    return findReferralByInvitee(this.handle, inviteeId);
  }

  public async attributeReferral(input: {
    code: string;
    inviteeId: string;
    attributedAt: string;
    windowExpiresAt: string;
  }): Promise<boolean> {
    return attributeReferral(this.handle, input);
  }

  public async countValidScenarios(userId: string): Promise<number> {
    return countValidScenarios(this.handle, userId);
  }

  public async setReferralScenarioCount(
    code: string,
    inviteeValidScenarios: number
  ): Promise<void> {
    setReferralScenarioCount(this.handle, code, inviteeValidScenarios);
  }

  public async activateReferral(code: string, activatedAt: string): Promise<boolean> {
    return activateReferral(this.handle, code, activatedAt);
  }

  public async grantReferralPurchaseBonus(
    code: string,
    bonusAt: string
  ): Promise<boolean> {
    return grantReferralPurchaseBonus(this.handle, code, bonusAt);
  }
}
