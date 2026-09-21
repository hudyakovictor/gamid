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
  },
  {
    id: "0004_economy_ledger",
    sql: `
CREATE TABLE IF NOT EXISTS ledger_events (
  event_id UUID PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id),
  asset TEXT NOT NULL CHECK (asset IN ('coins', 'xp', 'mastery_stars', 'energy')),
  amount INTEGER NOT NULL CHECK (amount <> 0),
  reason TEXT NOT NULL,
  source_id TEXT,
  scenario_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  promo BOOLEAN NOT NULL DEFAULT FALSE,
  risk_state TEXT NOT NULL DEFAULT 'cleared' CHECK (risk_state IN ('cleared', 'hold')),
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ledger_events_user_created
  ON ledger_events(user_id, created_at);

CREATE TABLE IF NOT EXISTS user_economy_state (
  user_id TEXT PRIMARY KEY REFERENCES users(user_id),
  xp_total INTEGER NOT NULL DEFAULT 0,
  account_level INTEGER NOT NULL DEFAULT 1 CHECK (account_level BETWEEN 1 AND 99),
  xp_day_utc TEXT NOT NULL DEFAULT '',
  xp_day_amount INTEGER NOT NULL DEFAULT 0,
  mastery_stars INTEGER NOT NULL DEFAULT 0,
  energy INTEGER NOT NULL DEFAULT 5,
  energy_cap INTEGER NOT NULL DEFAULT 5,
  energy_regen_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
`
  },
  {
    id: "0005_catalog_purchases_referrals",
    sql: `
CREATE TABLE IF NOT EXISTS purchases (
  purchase_id UUID PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id),
  kind TEXT NOT NULL CHECK (kind IN ('coin_pack', 'service', 'sku')),
  item_id TEXT NOT NULL,
  price_coins INTEGER NOT NULL DEFAULT 0 CHECK (price_coins >= 0),
  invoice_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL DEFAULT 'completed' CHECK (state IN ('completed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL,
  refunded_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_invoice
  ON purchases(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchases_user_created
  ON purchases(user_id, created_at);

CREATE TABLE IF NOT EXISTS supply_counters (
  item_id TEXT PRIMARY KEY,
  supply_limit INTEGER NOT NULL CHECK (supply_limit > 0),
  reserved INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0)
);

CREATE TABLE IF NOT EXISTS user_entitlements (
  entitlement_id UUID PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id),
  entitlement_key TEXT NOT NULL UNIQUE,
  source_purchase_id UUID NOT NULL REFERENCES purchases(purchase_id),
  created_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_entitlements_user
  ON user_entitlements(user_id, revoked_at);

CREATE TABLE IF NOT EXISTS referrals (
  code TEXT PRIMARY KEY,
  inviter_id TEXT NOT NULL REFERENCES users(user_id),
  invitee_id TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  attributed_at TIMESTAMPTZ,
  window_expires_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  invitee_valid_scenarios INTEGER NOT NULL DEFAULT 0,
  purchase_bonus_at TIMESTAMPTZ,
  state TEXT NOT NULL DEFAULT 'invited' CHECK (state IN ('invited', 'attributed', 'activated', 'expired', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_referrals_invitee
  ON referrals(invitee_id, state);
`
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
