import assert from "node:assert/strict";
import test from "node:test";

import {
  checkAgainstManifest,
  checkMigrationDrift,
  extractSchema,
  MIGRATION_REGISTRY,
} from "./migration-registry.js";
import { SCHEMA_MANIFEST } from "./schema-manifest.js";
import { MIGRATIONS } from "./migrations.js";
import { POSTGRES_MIGRATIONS } from "./postgres-migrations.js";
import { applyMigrations, closeDatabase, createDatabase } from "./index.js";

test("migration registry has canonical source documented and ordered ids", () => {
  assert.equal(MIGRATION_REGISTRY.canonicalSource, "packages/db/src/migrations.ts");
  assert.equal(MIGRATION_REGISTRY.dialectRendering, "packages/db/src/postgres-migrations.ts");
  assert.equal(MIGRATION_REGISTRY.schemaManifest, "packages/db/src/schema-manifest.ts");
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
  assert.equal(issues.length, 0, `Expected no drift issues, got: ${JSON.stringify(issues, null, 2)}`);
});

test("extractor captures columns, composite primary keys, unique constraints and foreign keys", () => {
  const schema = extractSchema(MIGRATIONS);

  // Composite primary key.
  const scenarios = schema.tables.get("scenarios");
  assert.ok(scenarios, "scenarios table extracted");
  assert.deepEqual(scenarios!.primaryKey, ["scenario_id", "version"]);

  // Composite foreign key + single foreign key.
  const runs = schema.tables.get("scenario_runs");
  assert.ok(runs, "scenario_runs table extracted");
  const fkTargets = runs!.foreignKeys.map((fk) => `${fk.columns.join("+")}->${fk.references}`);
  assert.ok(fkTargets.includes("user_id->users"));
  assert.ok(fkTargets.includes("scenario_id+scenario_version->scenarios"));
  assert.ok(runs!.uniqueConstraints.some((u) => u.join(",") === "idempotency_key"));

  // Table-level composite unique constraint.
  const identities = schema.tables.get("user_identities");
  assert.ok(identities, "user_identities table extracted");
  assert.ok(identities!.uniqueConstraints.some((u) => u.join(",") === "provider,provider_user_id"));

  // Named unique index.
  const invoiceIndex = schema.indexes.get("idx_purchases_invoice");
  assert.ok(invoiceIndex, "idx_purchases_invoice extracted");
  assert.equal(invoiceIndex!.unique, true);
  assert.equal(invoiceIndex!.table, "purchases");
});

// ---- Negative tests: validation MUST detect drift ----

/** Replace one migration's SQL by matching a substring; returns a new list. */
function mutate(
  base: readonly { readonly id: string; readonly sql: string }[],
  find: string,
  replace: string
): { id: string; sql: string }[] {
  let replaced = false;
  const next = base.map((m) => {
    if (!replaced && m.sql.includes(find)) {
      replaced = true;
      return { id: m.id, sql: m.sql.replace(find, replace) };
    }
    return { id: m.id, sql: m.sql };
  });
  assert.ok(replaced, `mutation target not found: ${find}`);
  return next;
}

test("negative: a missing column is detected", () => {
  const mutated = mutate(POSTGRES_MIGRATIONS, "external_id TEXT NOT NULL UNIQUE,", "");
  const issues = checkAgainstManifest(extractSchema(mutated), SCHEMA_MANIFEST, "postgres");
  assert.ok(
    issues.some((i) => i.issue.includes("missing column 'external_id'")),
    `Expected missing-column detection, got: ${JSON.stringify(issues)}`
  );
});

test("negative: a missing unique constraint is detected", () => {
  // Drop the UNIQUE from user_identities' composite unique constraint.
  const mutated = mutate(
    POSTGRES_MIGRATIONS,
    "UNIQUE(provider, provider_user_id)",
    "CONSTRAINT dummy_check CHECK (provider <> '')"
  );
  const issues = checkAgainstManifest(extractSchema(mutated), SCHEMA_MANIFEST, "postgres");
  assert.ok(
    issues.some((i) => i.issue.includes("missing unique constraint") && i.issue.includes("user_identities")),
    `Expected missing-unique detection, got: ${JSON.stringify(issues)}`
  );
});

test("negative: a missing foreign key is detected", () => {
  // Remove the composite FK on scenario_runs -> scenarios.
  const mutated = mutate(
    POSTGRES_MIGRATIONS,
    `FOREIGN KEY (scenario_id, scenario_version)
    REFERENCES scenarios(scenario_id, version)`,
    "scenario_note TEXT"
  );
  const issues = checkAgainstManifest(extractSchema(mutated), SCHEMA_MANIFEST, "postgres");
  assert.ok(
    issues.some((i) => i.issue.includes("missing foreign key") && i.issue.includes("scenarios")),
    `Expected missing-FK detection, got: ${JSON.stringify(issues)}`
  );
});

test("negative: a missing named index is detected", () => {
  const mutated = mutate(
    POSTGRES_MIGRATIONS,
    `CREATE INDEX IF NOT EXISTS idx_ledger_events_user_created
  ON ledger_events(user_id, created_at);`,
    ""
  );
  const issues = checkAgainstManifest(extractSchema(mutated), SCHEMA_MANIFEST, "postgres");
  assert.ok(
    issues.some((i) => i.issue.includes("idx_ledger_events_user_created") && i.issue.includes("missing")),
    `Expected missing-index detection, got: ${JSON.stringify(issues)}`
  );
});

test("negative: a missing primary key is detected", () => {
  const mutated = mutate(
    POSTGRES_MIGRATIONS,
    "supply_limit INTEGER NOT NULL CHECK (supply_limit > 0),",
    "supply_limit INTEGER NOT NULL,"
  );
  // Also strip the PK marker on item_id to force a PK drift.
  const mutated2 = mutate(mutated, "item_id TEXT PRIMARY KEY,", "item_id TEXT,");
  const issues = checkAgainstManifest(extractSchema(mutated2), SCHEMA_MANIFEST, "postgres");
  assert.ok(
    issues.some((i) => i.issue.includes("primary key mismatch") && i.issue.includes("supply_counters")),
    `Expected PK-mismatch detection, got: ${JSON.stringify(issues)}`
  );
});

test("negative: migration ID/order divergence is detected", () => {
  // Reorder the Postgres migrations so ids no longer line up with SQLite.
  const reorderedPg = [...POSTGRES_MIGRATIONS].reverse();
  const issues = checkMigrationDrift(MIGRATIONS, reorderedPg);
  assert.ok(
    issues.some((i) => i.issue.includes("ID/order mismatch")),
    `Expected id/order-mismatch detection, got: ${JSON.stringify(issues.map((i) => i.issue))}`
  );
});

test("negative: migration count mismatch is detected", () => {
  const truncatedPg = POSTGRES_MIGRATIONS.slice(0, POSTGRES_MIGRATIONS.length - 1);
  const issues = checkMigrationDrift(MIGRATIONS, truncatedPg);
  assert.ok(
    issues.some((i) => i.issue.includes("Migration count mismatch")),
    `Expected count-mismatch detection, got: ${JSON.stringify(issues.map((i) => i.issue))}`
  );
});

test("SQLite migrations are idempotent and forward-only from empty database", () => {
  const handle = createDatabase();
  const firstCount = handle.sqlite
    .prepare("SELECT COUNT(*) AS count FROM _migrations")
    .get() as { count: number };
  assert.equal(firstCount.count, 5);

  applyMigrations(handle.sqlite);
  const secondCount = handle.sqlite
    .prepare("SELECT COUNT(*) AS count FROM _migrations")
    .get() as { count: number };
  assert.equal(secondCount.count, 5);

  applyMigrations(handle.sqlite);
  const thirdCount = handle.sqlite
    .prepare("SELECT COUNT(*) AS count FROM _migrations")
    .get() as { count: number };
  assert.equal(thirdCount.count, 5);

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
  assert.equal(MIGRATIONS.length, POSTGRES_MIGRATIONS.length);
  for (let i = 0; i < MIGRATIONS.length; i++) {
    const sqliteId = MIGRATIONS[i]?.id;
    const pgId = POSTGRES_MIGRATIONS[i]?.id;
    assert.ok(sqliteId, `SQLite migration at index ${i} should exist`);
    assert.ok(pgId, `Postgres migration at index ${i} should exist`);
    assert.equal(sqliteId, pgId);
  }
});
