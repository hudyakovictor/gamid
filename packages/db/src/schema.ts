import { sql } from "drizzle-orm";
import {
  check,
  index,
  foreignKey,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  userId: text("user_id").primaryKey(),
  externalId: text("external_id").notNull().unique(),
  createdAt: text("created_at").notNull()
});

export const userIdentities = sqliteTable(
  "user_identities",
  {
    identityId: text("identity_id").primaryKey(),
    userId: text("user_id").notNull(),
    provider: text("provider").notNull(),
    providerUserId: text("provider_user_id").notNull(),
    createdAt: text("created_at").notNull()
  },
  (table) => ({
    userReference: foreignKey({
      columns: [table.userId],
      foreignColumns: [users.userId],
      name: "user_identities_user_fk"
    }),
    providerIdentityUnique: uniqueIndex("user_identities_provider_user_unique")
      .on(table.provider, table.providerUserId)
  })
);

export const authReplayKeys = sqliteTable(
  "auth_replay_keys",
  {
    replayKey: text("replay_key").primaryKey(),
    expiresAt: text("expires_at").notNull()
  },
  (table) => ({
    expiryIndex: index("idx_auth_replay_keys_expiry").on(table.expiresAt)
  })
);

export const authSessions = sqliteTable(
  "auth_sessions",
  {
    sessionId: text("session_id").primaryKey(),
    userId: text("user_id").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at").notNull(),
    revokedAt: text("revoked_at")
  },
  (table) => ({
    userReference: foreignKey({
      columns: [table.userId],
      foreignColumns: [users.userId],
      name: "auth_sessions_user_fk"
    }),
    userActiveIndex: index("idx_auth_sessions_user_active").on(
      table.userId,
      table.expiresAt,
      table.revokedAt
    )
  })
);

export const historicalSnapshots = sqliteTable(
  "historical_snapshots",
  {
    snapshotId: text("snapshot_id").primaryKey(),
    provider: text("provider").notNull(),
    symbol: text("symbol").notNull(),
    interval: text("interval").notNull(),
    asOf: text("as_of").notNull(),
    contentHash: text("content_hash").notNull().unique(),
    snapshotJson: text("snapshot_json").notNull(),
    createdAt: text("created_at").notNull()
  },
  (table) => ({
    lookupIndex: index("idx_historical_snapshots_lookup").on(
      table.provider,
      table.symbol,
      table.interval,
      table.asOf
    )
  })
);

export const scenarios = sqliteTable(
  "scenarios",
  {
    scenarioId: text("scenario_id").notNull(),
    version: text("version").notNull(),
    scenarioLevel: integer("scenario_level").notNull(),
    mode: text("mode").notNull(),
    contentVersion: text("content_version").notNull(),
    dataVersion: text("data_version").notNull(),
    futureHash: text("future_hash").notNull(),
    packageJson: text("package_json").notNull(),
    reviewStatus: text("review_status").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.scenarioId, table.version] }),
    scenarioLevelCheck: check(
      "scenario_level_range",
      sql`${table.scenarioLevel} BETWEEN 1 AND 99`
    ),
    reviewStatusIndex: index("idx_scenarios_review_status").on(table.reviewStatus)
  })
);

export const scenarioRuns = sqliteTable(
  "scenario_runs",
  {
    runId: text("run_id").primaryKey(),
    userId: text("user_id").notNull(),
    scenarioId: text("scenario_id").notNull(),
    scenarioVersion: text("scenario_version").notNull(),
    state: text("state").notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    decisionJson: text("decision_json"),
    scoreJson: text("score_json"),
    createdAt: text("created_at").notNull(),
    sealedAt: text("sealed_at"),
    revealedAt: text("revealed_at"),
    completedAt: text("completed_at")
  },
  (table) => ({
    scenarioReference: foreignKey({
      columns: [table.scenarioId, table.scenarioVersion],
      foreignColumns: [scenarios.scenarioId, scenarios.version],
      name: "scenario_runs_scenario_version_fk"
    }),
    userReference: foreignKey({
      columns: [table.userId],
      foreignColumns: [users.userId],
      name: "scenario_runs_user_fk"
    }),
    stateCheck: check(
      "scenario_run_state",
      sql`${table.state} IN ('started', 'sealed', 'revealed', 'completed')`
    ),
    userCreatedIndex: index("idx_scenario_runs_user_created").on(
      table.userId,
      table.createdAt
    ),
    scenarioIndex: index("idx_scenario_runs_scenario").on(
      table.scenarioId,
      table.scenarioVersion
    )
  })
);

export const ledgerEvents = sqliteTable(
  "ledger_events",
  {
    eventId: text("event_id").primaryKey(),
    userId: text("user_id").notNull(),
    asset: text("asset").notNull(),
    amount: integer("amount").notNull(),
    reason: text("reason").notNull(),
    sourceId: text("source_id"),
    scenarioId: text("scenario_id"),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    promo: integer("promo", { mode: "boolean" }).notNull().default(false),
    riskState: text("risk_state").notNull().default("cleared"),
    createdAt: text("created_at").notNull()
  },
  (table) => ({
    userReference: foreignKey({
      columns: [table.userId],
      foreignColumns: [users.userId],
      name: "ledger_events_user_fk"
    }),
    userCreatedIndex: index("idx_ledger_events_user_created").on(
      table.userId,
      table.createdAt
    ),
    assetCheck: check(
      "ledger_event_asset",
      sql`${table.asset} IN ('coins', 'xp', 'mastery_stars', 'energy')`
    ),
    nonzeroAmount: check("ledger_event_amount", sql`${table.amount} <> 0`)
  })
);

export const userEconomyState = sqliteTable(
  "user_economy_state",
  {
    userId: text("user_id").primaryKey(),
    xpTotal: integer("xp_total").notNull().default(0),
    accountLevel: integer("account_level").notNull().default(1),
    xpDayUtc: text("xp_day_utc").notNull().default(""),
    xpDayAmount: integer("xp_day_amount").notNull().default(0),
    masteryStars: integer("mastery_stars").notNull().default(0),
    energy: integer("energy").notNull().default(5),
    energyCap: integer("energy_cap").notNull().default(5),
    energyRegenAt: text("energy_regen_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => ({
    userReference: foreignKey({
      columns: [table.userId],
      foreignColumns: [users.userId],
      name: "user_economy_state_user_fk"
    }),
    levelCheck: check(
      "user_economy_state_level",
      sql`${table.accountLevel} BETWEEN 1 AND 99`
    )
  })
);

export const historicalImports = sqliteTable(
  "historical_imports",
  {
    importId: text("import_id").primaryKey(),
    importHash: text("import_hash").notNull().unique(),
    status: text("status").notNull(),
    summaryJson: text("summary_json").notNull(),
    createdBy: text("created_by"),
    createdAt: text("created_at").notNull()
  },
  (table) => ({
    statusCheck: check(
      "historical_import_status",
      sql`${table.status} IN ('completed', 'conflict', 'rejected')`
    ),
    createdIndex: index("idx_historical_imports_created").on(
      table.createdAt,
      table.importId
    )
  })
);

export const historicalSnapshotMetadata = sqliteTable(
  "historical_snapshot_metadata",
  {
    snapshotId: text("snapshot_id").primaryKey(),
    licensingJson: text("licensing_json"),
    captureJson: text("capture_json"),
    createdAt: text("created_at").notNull()
  },
  (table) => ({
    snapshotReference: foreignKey({
      columns: [table.snapshotId],
      foreignColumns: [historicalSnapshots.snapshotId],
      name: "historical_snapshot_metadata_snapshot_fk"
    })
  })
);

export const scenarioSnapshotLinks = sqliteTable(
  "scenario_snapshot_links",
  {
    scenarioId: text("scenario_id").notNull(),
    scenarioVersion: text("scenario_version").notNull(),
    snapshotId: text("snapshot_id").notNull(),
    sourceId: text("source_id").notNull(),
    snapshotContentHash: text("snapshot_content_hash").notNull(),
    linkRole: text("link_role").notNull().default("source"),
    createdAt: text("created_at").notNull()
  },
  (table) => ({
    primaryKey: primaryKey({
      columns: [table.scenarioId, table.scenarioVersion, table.snapshotId, table.sourceId]
    }),
    scenarioReference: foreignKey({
      columns: [table.scenarioId, table.scenarioVersion],
      foreignColumns: [scenarios.scenarioId, scenarios.version],
      name: "scenario_snapshot_links_scenario_fk"
    }),
    snapshotReference: foreignKey({
      columns: [table.snapshotId],
      foreignColumns: [historicalSnapshots.snapshotId],
      name: "scenario_snapshot_links_snapshot_fk"
    }),
    roleCheck: check(
      "scenario_snapshot_link_role",
      sql`${table.linkRole} IN ('source', 'public', 'future')`
    ),
    snapshotIndex: index("idx_scenario_snapshot_links_snapshot").on(table.snapshotId),
    scenarioIndex: index("idx_scenario_snapshot_links_scenario").on(
      table.scenarioId,
      table.scenarioVersion
    )
  })
);

export const scenarioReviewTransitions = sqliteTable(
  "scenario_review_transitions",
  {
    transitionId: text("transition_id").primaryKey(),
    scenarioId: text("scenario_id").notNull(),
    scenarioVersion: text("scenario_version").notNull(),
    fromStatus: text("from_status").notNull(),
    toStatus: text("to_status").notNull(),
    actorUserId: text("actor_user_id").notNull(),
    reason: text("reason"),
    createdAt: text("created_at").notNull()
  },
  (table) => ({
    scenarioReference: foreignKey({
      columns: [table.scenarioId, table.scenarioVersion],
      foreignColumns: [scenarios.scenarioId, scenarios.version],
      name: "scenario_review_transitions_scenario_fk"
    }),
    actorReference: foreignKey({
      columns: [table.actorUserId],
      foreignColumns: [users.userId],
      name: "scenario_review_transitions_actor_fk"
    }),
    scenarioIndex: index("idx_scenario_review_transitions_scenario").on(
      table.scenarioId,
      table.scenarioVersion,
      table.createdAt
    ),
    actorIndex: index("idx_scenario_review_transitions_actor").on(
      table.actorUserId,
      table.createdAt
    )
  })
);
