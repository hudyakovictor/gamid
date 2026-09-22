import assert from "node:assert/strict";
import test from "node:test";

import {
  applyPostgresMigrations,
  POSTGRES_MIGRATIONS,
  type PostgresQueryExecutor
} from "./postgres-migrations.js";

class RecordingExecutor implements PostgresQueryExecutor {
  public readonly calls: Array<{ sql: string; parameters?: readonly unknown[] }> = [];
  public failOnAuthMigration = false;

  public async query(
    sql: string,
    parameters?: readonly unknown[]
  ): Promise<{ rows?: readonly { id?: string }[] }> {
    this.calls.push(parameters === undefined ? { sql } : { sql, parameters });
    if (this.failOnAuthMigration && sql.includes("CREATE TABLE IF NOT EXISTS user_identities")) {
      throw new Error("migration failed");
    }
    if (sql.startsWith("SELECT id FROM signal_arena_migrations")) {
      return { rows: [] };
    }
    return { rows: [] };
  }
}

test("PostgreSQL migrations are ordered, locked and transactional", async () => {
  const executor = new RecordingExecutor();

  await applyPostgresMigrations(executor);

  assert.deepEqual(
    POSTGRES_MIGRATIONS.map((migration) => migration.id),
    [
      "0001_foundation",
      "0002_auth_boundary",
      "0003_historical_snapshots",
      "0004_economy_ledger",
      "0005_catalog_purchases_referrals",
      "0006_historical_pipeline"
    ]
  );
  assert.equal(executor.calls[0]?.sql, "BEGIN;");
  assert.ok(executor.calls.some((call) => call.sql.includes("pg_advisory_xact_lock")));
  assert.ok(executor.calls.some((call) => call.sql.includes("JSONB")));
  assert.ok(executor.calls.some((call) => call.sql.includes("scenario_level BETWEEN 1 AND 99")));
  assert.ok(executor.calls.some((call) => call.sql.includes("idx_historical_snapshots_lookup")));
  assert.equal(executor.calls.at(-1)?.sql, "COMMIT;");
});

test("PostgreSQL migration failures roll back and surface the original error", async () => {
  const executor = new RecordingExecutor();
  executor.failOnAuthMigration = true;

  await assert.rejects(
    () => applyPostgresMigrations(executor),
    /migration failed/
  );
  assert.equal(executor.calls.at(-1)?.sql, "ROLLBACK;");
});
