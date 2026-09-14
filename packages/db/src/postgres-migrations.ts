export type PostgresQueryExecutor = {
  query(sql: string, parameters?: readonly unknown[]): Promise<{
    rows?: readonly { id?: string }[];
  }>;
};

export const POSTGRES_MIGRATIONS = [
  {
    id: "0001_foundation",
    sql: `
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  external_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS scenarios (
  scenario_id TEXT NOT NULL,
  version TEXT NOT NULL,
  scenario_level INTEGER NOT NULL CHECK (scenario_level BETWEEN 1 AND 99),
  mode TEXT NOT NULL,
  content_version TEXT NOT NULL,
  data_version TEXT NOT NULL,
  future_hash TEXT NOT NULL,
  package_json JSONB NOT NULL,
  review_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (scenario_id, version)
);

CREATE TABLE IF NOT EXISTS scenario_runs (
  run_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id),
  scenario_id TEXT NOT NULL,
  scenario_version TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('started', 'sealed', 'revealed', 'completed')),
  idempotency_key TEXT NOT NULL UNIQUE,
  decision_json JSONB,
  score_json JSONB,
  created_at TIMESTAMPTZ NOT NULL,
  sealed_at TIMESTAMPTZ,
  revealed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  FOREIGN KEY (scenario_id, scenario_version)
    REFERENCES scenarios(scenario_id, version)
);

CREATE INDEX IF NOT EXISTS idx_scenarios_review_status
  ON scenarios(review_status);
CREATE INDEX IF NOT EXISTS idx_scenario_runs_user_created
  ON scenario_runs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_scenario_runs_scenario
  ON scenario_runs(scenario_id, scenario_version);
`,
  },
  {
    id: "0002_auth_boundary",
    sql: `
CREATE TABLE IF NOT EXISTS user_identities (
  identity_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id),
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE(provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS auth_replay_keys (
  replay_key TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id),
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active
  ON auth_sessions(user_id, expires_at, revoked_at);
CREATE INDEX IF NOT EXISTS idx_auth_replay_keys_expiry
  ON auth_replay_keys(expires_at);
`,
  },
  {
    id: "0003_historical_snapshots",
    sql: `
CREATE TABLE IF NOT EXISTS historical_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  symbol TEXT NOT NULL,
  interval TEXT NOT NULL,
  as_of TIMESTAMPTZ NOT NULL,
  content_hash TEXT NOT NULL UNIQUE,
  snapshot_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_historical_snapshots_lookup
  ON historical_snapshots(provider, symbol, interval, as_of);
`,
  }
] as const;

const MIGRATION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS signal_arena_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const MIGRATION_LOCK_SQL = "SELECT pg_advisory_xact_lock(731946102);";

export async function applyPostgresMigrations(
  executor: PostgresQueryExecutor
): Promise<void> {
  await executor.query("BEGIN;");
  try {
    await executor.query(MIGRATION_LOCK_SQL);
    await executor.query(MIGRATION_TABLE_SQL);

    const applied = await executor.query("SELECT id FROM signal_arena_migrations;");
    const appliedIds = new Set(
      (applied.rows ?? [])
        .map((row) => row.id)
        .filter((id): id is string => typeof id === "string")
    );

    for (const migration of POSTGRES_MIGRATIONS) {
      if (appliedIds.has(migration.id)) {
        continue;
      }
      await executor.query(migration.sql);
      await executor.query(
        "INSERT INTO signal_arena_migrations (id) VALUES ($1);",
        [migration.id]
      );
    }

    await executor.query("COMMIT;");
  } catch (error) {
    await executor.query("ROLLBACK;");
    throw error;
  }
}
