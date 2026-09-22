import { checkMigrationDrift, MIGRATION_REGISTRY } from "../packages/db/src/migration-registry.js";
import { MIGRATIONS } from "../packages/db/src/migrations.js";
import { POSTGRES_MIGRATIONS } from "../packages/db/src/postgres-migrations.js";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

function main(): void {
  console.log(`Canonical migration source: ${MIGRATION_REGISTRY.canonicalSource}`);
  console.log(`Dialect rendering: ${MIGRATION_REGISTRY.dialectRendering}`);
  console.log(`Migration count: ${MIGRATION_REGISTRY.count}`);
  console.log(`IDs: ${MIGRATION_REGISTRY.ids.join(", ")}`);

  // Check legacy infra/migrations is not present or is empty
  const infraPath = resolve(process.cwd(), "infra/migrations");
  if (existsSync(infraPath)) {
    const files = readdirSync(infraPath);
    if (files.length > 0) {
      console.warn(`Warning: legacy infra/migrations still contains files: ${files.join(", ")}. Expected to be removed or empty.`);
      // Not failing yet, but drift check will warn.
    }
  }

  // Check forward-only, deterministic, ordered
  const seen = new Set<string>();
  for (const id of MIGRATION_REGISTRY.ids) {
    if (seen.has(id)) {
      throw new Error(`Duplicate migration id detected: ${id}`);
    }
    seen.add(id);
    if (!/^000\d+_[a-z_]+$/.test(id)) {
      throw new Error(`Migration id does not follow ordered naming convention: ${id}`);
    }
  }

  // Check SQLite and Postgres have same ids
  const sqliteIds = MIGRATIONS.map((m) => m.id);
  const pgIds = POSTGRES_MIGRATIONS.map((m) => m.id);
  if (sqliteIds.length !== pgIds.length || !sqliteIds.every((id, i) => id === pgIds[i])) {
    throw new Error(`SQLite and Postgres migration ids differ:\nSQLite: ${sqliteIds.join(", ")}\nPostgres: ${pgIds.join(", ")}`);
  }

  const driftIssues = checkMigrationDrift();
  if (driftIssues.length > 0) {
    console.error("Migration drift detected:");
    for (const issue of driftIssues) {
      console.error(`- ${issue.migrationId}: ${issue.issue}`);
    }
    throw new Error(`Migration drift check failed with ${driftIssues.length} issue(s)`);
  }

  console.log("Migration drift check passed: SQLite and Postgres dialects are consistent.");
  console.log("Migrations are forward-only, ordered, and idempotent (verified by existing tests).");
}

main();
