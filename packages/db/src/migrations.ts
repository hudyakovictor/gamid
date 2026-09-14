import type BetterSqlite3 from "better-sqlite3";

export const MIGRATIONS = [
  {
    id: "0001_foundation",
    sql: `
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY NOT NULL,
  external_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scenarios (
  scenario_id TEXT NOT NULL,
  version TEXT NOT NULL,
  scenario_level INTEGER NOT NULL CHECK (scenario_level BETWEEN 1 AND 99),
  mode TEXT NOT NULL,
  content_version TEXT NOT NULL,
  data_version TEXT NOT NULL,
  future_hash TEXT NOT NULL,
  package_json TEXT NOT NULL,
  review_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (scenario_id, version)
);

CREATE TABLE IF NOT EXISTS scenario_runs (
  run_id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(user_id),
  scenario_id TEXT NOT NULL,
  scenario_version TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('started', 'sealed', 'revealed', 'completed')),
  idempotency_key TEXT NOT NULL UNIQUE,
  decision_json TEXT,
  score_json TEXT,
  created_at TEXT NOT NULL,
  sealed_at TEXT,
  revealed_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (scenario_id, scenario_version)
    REFERENCES scenarios(scenario_id, version)
);

CREATE INDEX IF NOT EXISTS idx_scenarios_review_status
  ON scenarios(review_status);

CREATE INDEX IF NOT EXISTS idx_scenario_runs_user_created
  ON scenario_runs(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_scenario_runs_scenario
  ON scenario_runs(scenario_id, scenario_version);
`
  }
] as const;

type Migration = (typeof MIGRATIONS)[number];

export function applyMigrations(sqlite: BetterSqlite3.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);

  const hasMigration = sqlite.prepare(
    "SELECT id FROM _migrations WHERE id = ?"
  );
  const recordMigration = sqlite.prepare(
    "INSERT INTO _migrations (id, applied_at) VALUES (?, ?)"
  );

  for (const migration of MIGRATIONS satisfies readonly Migration[]) {
    if (hasMigration.get(migration.id)) {
      continue;
    }

    const apply = sqlite.transaction(() => {
      sqlite.exec(migration.sql);
      recordMigration.run(migration.id, new Date().toISOString());
    });

    apply();
  }
}
