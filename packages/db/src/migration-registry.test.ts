import assert from "node:assert/strict";
import test from "node:test";

import { checkMigrationDrift, MIGRATION_REGISTRY } from "./migration-registry.js";
import { applyMigrations, closeDatabase, createDatabase } from "./index.js";

test("migration registry has canonical source documented and ordered ids", () => {
  assert.equal(MIGRATION_REGISTRY.canonicalSource, "packages/db/src/migrations.ts");
  assert.equal(MIGRATION_REGISTRY.dialectRendering, "packages/db/src/postgres-migrations.ts");
  assert.deepEqual(MIGRATION_REGISTRY.ids, [
    "0001_foundation",
    "0002_auth_boundary",
    "0003_historical_snapshots",
    "0004_economy_ledger",
    "0005_catalog_purchases_referrals",
  ]);
  assert.equal(MIGRATION_REGISTRY.count, 5);
});

test("migration drift check passes for current SQLite and Postgres dialects", () => {
  const issues = checkMigrationDrift();
  assert.equal(issues.length, 0, `Expected no drift issues, got: ${JSON.stringify(issues)}`);
});

test("SQLite migrations are idempotent and forward-only from empty database", () => {
  const handle = createDatabase();
  // First application already happened in createDatabase via applyMigrations
  const firstCount = handle.sqlite
    .prepare("SELECT COUNT(*) AS count FROM _migrations")
    .get() as { count: number };
  assert.equal(firstCount.count, 5);

  // Second application should be idempotent
  applyMigrations(handle.sqlite);
  const secondCount = handle.sqlite
    .prepare("SELECT COUNT(*) AS count FROM _migrations")
    .get() as { count: number };
  assert.equal(secondCount.count, 5);

  // Third application again
  applyMigrations(handle.sqlite);
  const thirdCount = handle.sqlite
    .prepare("SELECT COUNT(*) AS count FROM _migrations")
    .get() as { count: number };
  assert.equal(thirdCount.count, 5);

  // Verify all expected tables exist
  const tables = handle.sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all() as Array<{ name: string }>;
  const tableNames = tables.map((t) => t.name);
  assert.ok(tableNames.includes("users"));
  assert.ok(tableNames.includes("scenarios"));
  assert.ok(tableNames.includes("scenario_runs"));
  assert.ok(tableNames.includes("ledger_events"));
  assert.ok(tableNames.includes("purchases"));
  assert.ok(tableNames.includes("referrals"));

  closeDatabase(handle);
});

test("Postgres migrations maintain same ids and are ordered", async () => {
  const { POSTGRES_MIGRATIONS } = await import("./postgres-migrations.js");
  const { MIGRATIONS } = await import("./migrations.js");

  assert.equal(MIGRATIONS.length, POSTGRES_MIGRATIONS.length);
  for (let i = 0; i < MIGRATIONS.length; i++) {
    const sqliteId = MIGRATIONS[i]?.id;
    const pgId = POSTGRES_MIGRATIONS[i]?.id;
    assert.ok(sqliteId, `SQLite migration at index ${i} should exist`);
    assert.ok(pgId, `Postgres migration at index ${i} should exist`);
    assert.equal(sqliteId, pgId);
  }
});
