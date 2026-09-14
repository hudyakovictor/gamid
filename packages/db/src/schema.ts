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
