import type {
  AuthSessionRecord,
  CreateAuthSessionInput,
  CreateScenarioRunInput,
  HistoricalSnapshotRecord,
  PlatformIdentityInput,
  ScenarioPackageSummary,
  ScenarioRunRecord,
  ScenarioRunSummary
} from "./repository.js";
import type { DecisionTrace } from "../../contracts/src/run.js";
import type {
  HistoricalMarketSnapshot,
  ScenarioPackage,
  ScoreResult
} from "../../contracts/src/index.js";
import type { LedgerEvent, UserBalance } from "../../contracts/src/economy.js";
import type { LedgerEventInput } from "./ledger.js";
import type {
  GrantEntitlementInput,
  PurchaseRecord,
  ReferralRecord
} from "./store.js";
import type {
  HistoricalImportRecord,
  HistoricalImportStatus,
  HistoricalSnapshotSummary,
  ReviewTransitionRecord,
  ScenarioSnapshotLinkRecord,
  ScenarioSnapshotLinkRole,
  SnapshotMetadataRecord
} from "./historical-import-store.js";

export type PersistencePort = {
  /** Serialized economic unit of work; nested calls share the transaction. */
  atomic<T>(operation: () => Promise<T>): Promise<T>;
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
  listScenarioPackages(): Promise<ScenarioPackageSummary[]>;
  upsertScenarioPackage(
    package_: ScenarioPackage,
    nowIso?: string
  ): Promise<{ created: boolean }>;
  setScenarioReviewStatus(
    scenarioId: string,
    version: string,
    status: string,
    nowIso?: string
  ): Promise<boolean>;
  createScenarioRun(input: CreateScenarioRunInput): Promise<ScenarioRunRecord>;
  listScenarioRunsForUser(userId: string): Promise<ScenarioRunSummary[]>;
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
  recordLedgerEvent(
    input: LedgerEventInput
  ): Promise<{ inserted: boolean; event: LedgerEvent }>;
  listLedgerEvents(userId: string, limit?: number): Promise<LedgerEvent[]>;
  deriveUserBalance(userId: string, nowIso?: string): Promise<UserBalance>;
  sumPromoCoinsInRange(
    userId: string,
    fromIso: string,
    toIso: string
  ): Promise<number>;
  createPurchase(input: {
    purchaseId: string;
    userId: string;
    kind: PurchaseRecord["kind"];
    itemId: string;
    priceCoins: number;
    invoiceId?: string | undefined;
    idempotencyKey: string;
    createdAt: string;
  }): Promise<PurchaseRecord>;
  getPurchaseByIdempotencyKey(idempotencyKey: string): Promise<PurchaseRecord | undefined>;
  getPurchaseByInvoice(invoiceId: string): Promise<PurchaseRecord | undefined>;
  getPurchase(purchaseId: string, userId: string): Promise<PurchaseRecord | undefined>;
  markPurchaseRefunded(
    purchaseId: string,
    userId: string,
    refundedAt: string
  ): Promise<boolean>;
  reserveSupply(itemId: string, supplyLimit: number | undefined): Promise<boolean>;
  releaseSupply(itemId: string): Promise<void>;
  grantEntitlement(input: GrantEntitlementInput): Promise<{ inserted: boolean; entitlementId: string }>;
  revokeEntitlement(
    userId: string,
    entitlementKey: string,
    revokedAt: string
  ): Promise<boolean>;
  listActiveEntitlements(
    userId: string
  ): Promise<Array<{ entitlementKey: string; sourcePurchaseId: string; createdAt: string }>>;
  getOrCreateReferral(input: {
    inviterId: string;
    code?: string | undefined;
    createdAt: string;
  }): Promise<{ created: boolean; referral: ReferralRecord }>;
  getReferralByCode(code: string): Promise<ReferralRecord | undefined>;
  findReferralByInvitee(inviteeId: string): Promise<ReferralRecord | undefined>;
  attributeReferral(input: {
    code: string;
    inviteeId: string;
    attributedAt: string;
    windowExpiresAt: string;
  }): Promise<boolean>;
  countValidScenarios(userId: string): Promise<number>;
  setReferralScenarioCount(code: string, inviteeValidScenarios: number): Promise<void>;
  activateReferral(code: string, activatedAt: string): Promise<boolean>;
  grantReferralPurchaseBonus(code: string, bonusAt: string): Promise<boolean>;
  // ---- Historical pipeline (Batch 01): race-safe, constraint-backed ----
  /** Insert-first scenario write; never check-then-insert. */
  insertScenarioPackageIgnoreConflict(
    package_: ScenarioPackage,
    nowIso?: string
  ): Promise<boolean>;
  /** Authoritative review-status COLUMN value (not package_json). */
  getScenarioReviewStatusColumn(
    scenarioId: string,
    version: string
  ): Promise<string | undefined>;
  /** Raw stored package_json for fail-closed readiness evaluation. */
  getStoredScenarioPackageJson(
    scenarioId: string,
    version: string
  ): Promise<unknown | undefined>;
  getHistoricalSnapshotByContentHash(
    contentHash: string
  ): Promise<HistoricalSnapshotRecord | undefined>;
  /** Insert-first snapshot write keyed by content hash. */
  insertHistoricalSnapshotIgnoreConflict(
    snapshot: HistoricalMarketSnapshot,
    snapshotId: string,
    createdAt: string
  ): Promise<boolean>;
  listHistoricalSnapshots(options?: {
    limit?: number;
    offset?: number;
  }): Promise<HistoricalSnapshotSummary[]>;
  countHistoricalSnapshots(): Promise<number>;
  createHistoricalImport(input: {
    importId: string;
    importHash: string;
    status: HistoricalImportStatus;
    summaryJson: string;
    createdBy: string | null;
    createdAt: string;
  }): Promise<{ created: boolean; record: HistoricalImportRecord }>;
  getHistoricalImport(importId: string): Promise<HistoricalImportRecord | undefined>;
  getHistoricalImportByHash(importHash: string): Promise<HistoricalImportRecord | undefined>;
  listHistoricalImports(options?: {
    limit?: number;
    offset?: number;
  }): Promise<HistoricalImportRecord[]>;
  countHistoricalImports(): Promise<number>;
  upsertSnapshotMetadata(input: {
    snapshotId: string;
    licensingJson: string | null;
    captureJson: string | null;
    createdAt: string;
  }): Promise<{ created: boolean }>;
  getSnapshotMetadata(snapshotId: string): Promise<SnapshotMetadataRecord | undefined>;
  createScenarioSnapshotLink(input: {
    scenarioId: string;
    scenarioVersion: string;
    snapshotId: string;
    sourceId: string;
    snapshotContentHash: string;
    linkRole: ScenarioSnapshotLinkRole;
    createdAt: string;
  }): Promise<{ created: boolean }>;
  listScenarioSnapshotLinks(
    scenarioId: string,
    scenarioVersion: string
  ): Promise<ScenarioSnapshotLinkRecord[]>;
  listLinksForSnapshot(snapshotId: string): Promise<ScenarioSnapshotLinkRecord[]>;
  recordReviewTransition(input: {
    transitionId: string;
    scenarioId: string;
    scenarioVersion: string;
    fromStatus: string;
    toStatus: string;
    actorUserId: string;
    reason: string | null;
    createdAt: string;
  }): Promise<void>;
  listReviewTransitions(
    scenarioId: string,
    scenarioVersion: string,
    options?: { limit?: number; offset?: number }
  ): Promise<ReviewTransitionRecord[]>;
  countReviewTransitions(scenarioId: string, scenarioVersion: string): Promise<number>;
};
