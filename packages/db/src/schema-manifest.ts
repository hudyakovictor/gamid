/**
 * Canonical schema-intent manifest for Signal Arena.
 *
 * This manifest is the deterministic, human-reviewable source of truth for the
 * *table-level intent* that both dialect renderings must satisfy:
 *   - packages/db/src/migrations.ts          (SQLite, canonical source/order)
 *   - packages/db/src/postgres-migrations.ts (PostgreSQL dialect rendering)
 *
 * Why a manifest instead of a full SQL parser: fully parsing arbitrary SQL
 * would require an unsafe custom parser. Instead we keep this small, explicit
 * manifest next to the migration registry and verify BOTH dialect renderings
 * against it with a bounded extractor (see migration-registry.ts). The manifest
 * captures only what must stay identical across dialects:
 *   - table names
 *   - column names
 *   - primary keys
 *   - required unique constraints
 *   - foreign-key relationships
 *   - named indexes
 *
 * Deliberately excluded from the manifest (allowed documented dialect
 * differences — see `ALLOWED_DIALECT_DIFFERENCES`):
 *   - physical column types (TEXT vs TIMESTAMPTZ, TEXT vs UUID)
 *   - JSON text vs JSONB storage
 *   - boolean-as-integer (SQLite) vs BOOLEAN (PostgreSQL)
 *   - defaults, CHECK expressions, and other dialect-specific syntax
 *
 * When a new APPROVED migration is added, update BOTH migration files with the
 * same id/order AND extend this manifest. `pnpm validate:migrations` fails on
 * any divergence between the manifest and either dialect, or between dialects.
 */

export type ForeignKeyIntent = {
  /** Local columns participating in the foreign key, in order. */
  readonly columns: readonly string[];
  /** Referenced table. */
  readonly references: string;
  /** Referenced columns, in order. */
  readonly refColumns: readonly string[];
};

export type NamedIndexIntent = {
  readonly name: string;
  readonly table: string;
  /** Whether the index is declared UNIQUE. */
  readonly unique: boolean;
};

export type TableIntent = {
  readonly table: string;
  /** Migration id that introduces the table (documentation + ordering aid). */
  readonly migrationId: string;
  readonly columns: readonly string[];
  /** Primary-key columns, in declaration order. */
  readonly primaryKey: readonly string[];
  /**
   * Required unique constraints declared on the table itself (inline `UNIQUE`
   * or table-level `UNIQUE(...)`). Unique *indexes* are listed under `indexes`.
   */
  readonly uniqueConstraints: readonly (readonly string[])[];
  readonly foreignKeys: readonly ForeignKeyIntent[];
};

export type SchemaManifest = {
  readonly tables: readonly TableIntent[];
  readonly indexes: readonly NamedIndexIntent[];
};

export const ALLOWED_DIALECT_DIFFERENCES = [
  "Timestamp columns: SQLite TEXT vs PostgreSQL TIMESTAMPTZ",
  "JSON columns: SQLite TEXT (package_json/decision_json/score_json/snapshot_json) vs PostgreSQL JSONB",
  "Identifier columns: SQLite TEXT primary keys vs PostgreSQL UUID (ledger_events, purchases, user_entitlements)",
  "Boolean columns: SQLite INTEGER 0/1 with CHECK vs PostgreSQL BOOLEAN (ledger_events.promo)",
  "Defaults and CHECK constraint expressions may use dialect-specific syntax",
] as const;

/**
 * Canonical table + index intent. Derived from the SQLite source of truth and
 * required to hold for the PostgreSQL dialect rendering as well.
 */
export const SCHEMA_MANIFEST: SchemaManifest = {
  tables: [
    // ---- 0001_foundation ----
    {
      table: "users",
      migrationId: "0001_foundation",
      columns: ["user_id", "external_id", "created_at"],
      primaryKey: ["user_id"],
      uniqueConstraints: [["external_id"]],
      foreignKeys: [],
    },
    {
      table: "scenarios",
      migrationId: "0001_foundation",
      columns: [
        "scenario_id",
        "version",
        "scenario_level",
        "mode",
        "content_version",
        "data_version",
        "future_hash",
        "package_json",
        "review_status",
        "created_at",
        "updated_at",
      ],
      primaryKey: ["scenario_id", "version"],
      uniqueConstraints: [],
      foreignKeys: [],
    },
    {
      table: "scenario_runs",
      migrationId: "0001_foundation",
      columns: [
        "run_id",
        "user_id",
        "scenario_id",
        "scenario_version",
        "state",
        "idempotency_key",
        "decision_json",
        "score_json",
        "created_at",
        "sealed_at",
        "revealed_at",
        "completed_at",
      ],
      primaryKey: ["run_id"],
      uniqueConstraints: [["idempotency_key"]],
      foreignKeys: [
        { columns: ["user_id"], references: "users", refColumns: ["user_id"] },
        {
          columns: ["scenario_id", "scenario_version"],
          references: "scenarios",
          refColumns: ["scenario_id", "version"],
        },
      ],
    },
    // ---- 0002_auth_boundary ----
    {
      table: "user_identities",
      migrationId: "0002_auth_boundary",
      columns: ["identity_id", "user_id", "provider", "provider_user_id", "created_at"],
      primaryKey: ["identity_id"],
      uniqueConstraints: [["provider", "provider_user_id"]],
      foreignKeys: [{ columns: ["user_id"], references: "users", refColumns: ["user_id"] }],
    },
    {
      table: "auth_replay_keys",
      migrationId: "0002_auth_boundary",
      columns: ["replay_key", "expires_at"],
      primaryKey: ["replay_key"],
      uniqueConstraints: [],
      foreignKeys: [],
    },
    {
      table: "auth_sessions",
      migrationId: "0002_auth_boundary",
      columns: ["session_id", "user_id", "token_hash", "created_at", "expires_at", "revoked_at"],
      primaryKey: ["session_id"],
      uniqueConstraints: [["token_hash"]],
      foreignKeys: [{ columns: ["user_id"], references: "users", refColumns: ["user_id"] }],
    },
    // ---- 0003_historical_snapshots ----
    {
      table: "historical_snapshots",
      migrationId: "0003_historical_snapshots",
      columns: [
        "snapshot_id",
        "provider",
        "symbol",
        "interval",
        "as_of",
        "content_hash",
        "snapshot_json",
        "created_at",
      ],
      primaryKey: ["snapshot_id"],
      uniqueConstraints: [["content_hash"]],
      foreignKeys: [],
    },
    // ---- 0004_economy_ledger ----
    {
      table: "ledger_events",
      migrationId: "0004_economy_ledger",
      columns: [
        "event_id",
        "user_id",
        "asset",
        "amount",
        "reason",
        "source_id",
        "scenario_id",
        "idempotency_key",
        "promo",
        "risk_state",
        "created_at",
      ],
      primaryKey: ["event_id"],
      uniqueConstraints: [["idempotency_key"]],
      foreignKeys: [{ columns: ["user_id"], references: "users", refColumns: ["user_id"] }],
    },
    {
      table: "user_economy_state",
      migrationId: "0004_economy_ledger",
      columns: [
        "user_id",
        "xp_total",
        "account_level",
        "xp_day_utc",
        "xp_day_amount",
        "mastery_stars",
        "energy",
        "energy_cap",
        "energy_regen_at",
        "updated_at",
      ],
      primaryKey: ["user_id"],
      uniqueConstraints: [],
      foreignKeys: [{ columns: ["user_id"], references: "users", refColumns: ["user_id"] }],
    },
    // ---- 0005_catalog_purchases_referrals ----
    {
      table: "purchases",
      migrationId: "0005_catalog_purchases_referrals",
      columns: [
        "purchase_id",
        "user_id",
        "kind",
        "item_id",
        "price_coins",
        "invoice_id",
        "idempotency_key",
        "state",
        "created_at",
        "refunded_at",
      ],
      primaryKey: ["purchase_id"],
      uniqueConstraints: [["idempotency_key"]],
      foreignKeys: [{ columns: ["user_id"], references: "users", refColumns: ["user_id"] }],
    },
    {
      table: "supply_counters",
      migrationId: "0005_catalog_purchases_referrals",
      columns: ["item_id", "supply_limit", "reserved"],
      primaryKey: ["item_id"],
      uniqueConstraints: [],
      foreignKeys: [],
    },
    {
      table: "user_entitlements",
      migrationId: "0005_catalog_purchases_referrals",
      columns: [
        "entitlement_id",
        "user_id",
        "entitlement_key",
        "source_purchase_id",
        "created_at",
        "revoked_at",
      ],
      primaryKey: ["entitlement_id"],
      uniqueConstraints: [["entitlement_key"]],
      foreignKeys: [
        { columns: ["user_id"], references: "users", refColumns: ["user_id"] },
        {
          columns: ["source_purchase_id"],
          references: "purchases",
          refColumns: ["purchase_id"],
        },
      ],
    },
    {
      table: "referrals",
      migrationId: "0005_catalog_purchases_referrals",
      columns: [
        "code",
        "inviter_id",
        "invitee_id",
        "created_at",
        "attributed_at",
        "window_expires_at",
        "activated_at",
        "invitee_valid_scenarios",
        "purchase_bonus_at",
        "state",
      ],
      primaryKey: ["code"],
      uniqueConstraints: [],
      foreignKeys: [{ columns: ["inviter_id"], references: "users", refColumns: ["user_id"] }],
    },
    // ---- 0006_historical_pipeline ----
    {
      table: "historical_imports",
      migrationId: "0006_historical_pipeline",
      columns: [
        "import_id",
        "import_hash",
        "status",
        "summary_json",
        "created_by",
        "created_at",
      ],
      primaryKey: ["import_id"],
      uniqueConstraints: [["import_hash"]],
      foreignKeys: [],
    },
    {
      table: "historical_snapshot_metadata",
      migrationId: "0006_historical_pipeline",
      columns: ["snapshot_id", "licensing_json", "capture_json", "created_at"],
      primaryKey: ["snapshot_id"],
      uniqueConstraints: [],
      foreignKeys: [
        {
          columns: ["snapshot_id"],
          references: "historical_snapshots",
          refColumns: ["snapshot_id"],
        },
      ],
    },
    {
      table: "scenario_snapshot_links",
      migrationId: "0006_historical_pipeline",
      columns: [
        "scenario_id",
        "scenario_version",
        "snapshot_id",
        "source_id",
        "snapshot_content_hash",
        "link_role",
        "created_at",
      ],
      primaryKey: ["scenario_id", "scenario_version", "snapshot_id", "source_id"],
      uniqueConstraints: [],
      foreignKeys: [
        {
          columns: ["snapshot_id"],
          references: "historical_snapshots",
          refColumns: ["snapshot_id"],
        },
        {
          columns: ["scenario_id", "scenario_version"],
          references: "scenarios",
          refColumns: ["scenario_id", "version"],
        },
      ],
    },
    {
      table: "scenario_review_transitions",
      migrationId: "0006_historical_pipeline",
      columns: [
        "transition_id",
        "scenario_id",
        "scenario_version",
        "from_status",
        "to_status",
        "actor_user_id",
        "reason",
        "created_at",
      ],
      primaryKey: ["transition_id"],
      uniqueConstraints: [],
      foreignKeys: [
        { columns: ["actor_user_id"], references: "users", refColumns: ["user_id"] },
        {
          columns: ["scenario_id", "scenario_version"],
          references: "scenarios",
          refColumns: ["scenario_id", "version"],
        },
      ],
    },
  ],
  indexes: [
    { name: "idx_scenarios_review_status", table: "scenarios", unique: false },
    { name: "idx_scenario_runs_user_created", table: "scenario_runs", unique: false },
    { name: "idx_scenario_runs_scenario", table: "scenario_runs", unique: false },
    { name: "idx_auth_sessions_user_active", table: "auth_sessions", unique: false },
    { name: "idx_auth_replay_keys_expiry", table: "auth_replay_keys", unique: false },
    { name: "idx_historical_snapshots_lookup", table: "historical_snapshots", unique: false },
    { name: "idx_ledger_events_user_created", table: "ledger_events", unique: false },
    { name: "idx_purchases_invoice", table: "purchases", unique: true },
    { name: "idx_purchases_user_created", table: "purchases", unique: false },
    { name: "idx_user_entitlements_user", table: "user_entitlements", unique: false },
    { name: "idx_referrals_invitee", table: "referrals", unique: false },
    { name: "idx_historical_imports_created", table: "historical_imports", unique: false },
    { name: "idx_scenario_snapshot_links_snapshot", table: "scenario_snapshot_links", unique: false },
    { name: "idx_scenario_snapshot_links_scenario", table: "scenario_snapshot_links", unique: false },
    { name: "idx_scenario_review_transitions_scenario", table: "scenario_review_transitions", unique: false },
    { name: "idx_scenario_review_transitions_actor", table: "scenario_review_transitions", unique: false },
  ],
};
