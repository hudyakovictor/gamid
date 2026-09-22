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
  },
  {
    id: "0002_auth_boundary",
    sql: `
CREATE TABLE IF NOT EXISTS user_identities (
  identity_id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(user_id),
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS auth_replay_keys (
  replay_key TEXT PRIMARY KEY NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  session_id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(user_id),
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active
  ON auth_sessions(user_id, expires_at, revoked_at);

CREATE INDEX IF NOT EXISTS idx_auth_replay_keys_expiry
  ON auth_replay_keys(expires_at);
`
  },
  {
    id: "0003_historical_snapshots",
    sql: `
CREATE TABLE IF NOT EXISTS historical_snapshots (
  snapshot_id TEXT PRIMARY KEY NOT NULL,
  provider TEXT NOT NULL,
  symbol TEXT NOT NULL,
  interval TEXT NOT NULL,
  as_of TEXT NOT NULL,
  content_hash TEXT NOT NULL UNIQUE,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_historical_snapshots_lookup
  ON historical_snapshots(provider, symbol, interval, as_of);
`
  },
  {
    id: "0004_economy_ledger",
    sql: `
CREATE TABLE IF NOT EXISTS ledger_events (
  event_id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(user_id),
  asset TEXT NOT NULL CHECK (asset IN ('coins', 'xp', 'mastery_stars', 'energy')),
  amount INTEGER NOT NULL CHECK (amount <> 0),
  reason TEXT NOT NULL,
  source_id TEXT,
  scenario_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  promo INTEGER NOT NULL DEFAULT 0 CHECK (promo IN (0, 1)),
  risk_state TEXT NOT NULL DEFAULT 'cleared' CHECK (risk_state IN ('cleared', 'hold')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ledger_events_user_created
  ON ledger_events(user_id, created_at);

CREATE TABLE IF NOT EXISTS user_economy_state (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(user_id),
  xp_total INTEGER NOT NULL DEFAULT 0,
  account_level INTEGER NOT NULL DEFAULT 1 CHECK (account_level BETWEEN 1 AND 99),
  xp_day_utc TEXT NOT NULL DEFAULT '',
  xp_day_amount INTEGER NOT NULL DEFAULT 0,
  mastery_stars INTEGER NOT NULL DEFAULT 0,
  energy INTEGER NOT NULL DEFAULT 5,
  energy_cap INTEGER NOT NULL DEFAULT 5,
  energy_regen_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`
  },
  {
    id: "0005_catalog_purchases_referrals",
    sql: `
CREATE TABLE IF NOT EXISTS purchases (
  purchase_id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(user_id),
  kind TEXT NOT NULL CHECK (kind IN ('coin_pack', 'service', 'sku')),
  item_id TEXT NOT NULL,
  price_coins INTEGER NOT NULL DEFAULT 0 CHECK (price_coins >= 0),
  invoice_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL DEFAULT 'completed' CHECK (state IN ('completed', 'refunded')),
  created_at TEXT NOT NULL,
  refunded_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_invoice
  ON purchases(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchases_user_created
  ON purchases(user_id, created_at);

CREATE TABLE IF NOT EXISTS supply_counters (
  item_id TEXT PRIMARY KEY NOT NULL,
  supply_limit INTEGER NOT NULL CHECK (supply_limit > 0),
  reserved INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0)
);

CREATE TABLE IF NOT EXISTS user_entitlements (
  entitlement_id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(user_id),
  entitlement_key TEXT NOT NULL UNIQUE,
  source_purchase_id TEXT NOT NULL REFERENCES purchases(purchase_id),
  created_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_entitlements_user
  ON user_entitlements(user_id, revoked_at);

CREATE TABLE IF NOT EXISTS referrals (
  code TEXT PRIMARY KEY NOT NULL,
  inviter_id TEXT NOT NULL REFERENCES users(user_id),
  invitee_id TEXT,
  created_at TEXT NOT NULL,
  attributed_at TEXT,
  window_expires_at TEXT,
  activated_at TEXT,
  invitee_valid_scenarios INTEGER NOT NULL DEFAULT 0,
  purchase_bonus_at TEXT,
  state TEXT NOT NULL DEFAULT 'invited' CHECK (state IN ('invited', 'attributed', 'activated', 'expired', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_referrals_invitee
  ON referrals(invitee_id, state);
`
  },
  {
    id: "0006_historical_pipeline",
    sql: `
CREATE TABLE IF NOT EXISTS historical_imports (
  import_id TEXT PRIMARY KEY NOT NULL,
  import_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('completed', 'conflict', 'rejected')),
  summary_json TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_historical_imports_created
  ON historical_imports(created_at, import_id);

CREATE TABLE IF NOT EXISTS historical_snapshot_metadata (
  snapshot_id TEXT PRIMARY KEY NOT NULL REFERENCES historical_snapshots(snapshot_id),
  licensing_json TEXT,
  capture_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scenario_snapshot_links (
  scenario_id TEXT NOT NULL,
  scenario_version TEXT NOT NULL,
  snapshot_id TEXT NOT NULL REFERENCES historical_snapshots(snapshot_id),
  source_id TEXT NOT NULL,
  snapshot_content_hash TEXT NOT NULL,
  link_role TEXT NOT NULL DEFAULT 'source' CHECK (link_role IN ('source', 'public', 'future')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (scenario_id, scenario_version, snapshot_id, source_id),
  FOREIGN KEY (scenario_id, scenario_version)
    REFERENCES scenarios(scenario_id, version)
);

CREATE INDEX IF NOT EXISTS idx_scenario_snapshot_links_snapshot
  ON scenario_snapshot_links(snapshot_id);

CREATE INDEX IF NOT EXISTS idx_scenario_snapshot_links_scenario
  ON scenario_snapshot_links(scenario_id, scenario_version);

CREATE TABLE IF NOT EXISTS scenario_review_transitions (
  transition_id TEXT PRIMARY KEY NOT NULL,
  scenario_id TEXT NOT NULL,
  scenario_version TEXT NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  actor_user_id TEXT NOT NULL REFERENCES users(user_id),
  reason TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (scenario_id, scenario_version)
    REFERENCES scenarios(scenario_id, version)
);

CREATE INDEX IF NOT EXISTS idx_scenario_review_transitions_scenario
  ON scenario_review_transitions(scenario_id, scenario_version, created_at);

CREATE INDEX IF NOT EXISTS idx_scenario_review_transitions_actor
  ON scenario_review_transitions(actor_user_id, created_at);
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
