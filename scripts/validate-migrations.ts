import { checkMigrationDrift, MIGRATION_REGISTRY } from "../packages/db/src/migration-registry.js";
import { MIGRATIONS } from "../packages/db/src/migrations.js";
import { POSTGRES_MIGRATIONS } from "../packages/db/src/postgres-migrations.js";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Full migration validation. Throws on the first detected problem so that the
 * caller (the `pnpm validate:migrations` script AND the db test that mirrors it
 * inside `pnpm test`) exits non-zero. Returns a short summary on success.
 *
 * This function is intentionally side-effect free apart from throwing, so it
 * can be exercised both as a CLI and from a unit test without duplicating the
 * rules (single source of truth for migration validation).
 */
export function validateMigrations(options: { cwd?: string } = {}): string[] {
  const cwd = options.cwd ?? process.cwd();
  const summary: string[] = [];
  summary.push(`Canonical migration source: ${MIGRATION_REGISTRY.canonicalSource}`);
  summary.push(`Dialect rendering: ${MIGRATION_REGISTRY.dialectRendering}`);
  summary.push(`Schema manifest: ${MIGRATION_REGISTRY.schemaManifest}`);
  summary.push(`Migration count: ${MIGRATION_REGISTRY.count}`);
  summary.push(`IDs: ${MIGRATION_REGISTRY.ids.join(", ")}`);

  // Legacy infra/migrations/** is not canonical. If it returns with files it
  // is a hard FAILURE (not a warning): a second, drifting migration source
  // must never re-enter the tree.
  const infraPath = resolve(cwd, "infra/migrations");
  if (existsSync(infraPath)) {
    const entries = readdirSync(infraPath, { recursive: true, withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
    if (files.length > 0) {
      throw new Error(
        `Legacy infra/migrations/** must not contain files (found: ${files.join(", ")}). ` +
          `The canonical migration source is ${MIGRATION_REGISTRY.canonicalSource}. Remove infra/migrations/**.`
      );
    }
  }

  // Forward-only, deterministic, ordered naming with no duplicate ids.
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

  // SQLite and Postgres must share identical ordered ids.
  const sqliteIds = MIGRATIONS.map((m) => m.id);
  const pgIds = POSTGRES_MIGRATIONS.map((m) => m.id);
  if (sqliteIds.length !== pgIds.length || !sqliteIds.every((id, i) => id === pgIds[i])) {
    throw new Error(
      `SQLite and Postgres migration ids differ:\nSQLite: ${sqliteIds.join(", ")}\nPostgres: ${pgIds.join(", ")}`
    );
  }

  // Deep drift check (columns, primary keys, unique constraints, foreign keys,
  // indexes) for both dialects against the canonical schema manifest.
  const driftIssues = checkMigrationDrift();
  if (driftIssues.length > 0) {
    const details = driftIssues.map((issue) => `- ${issue.migrationId}: ${issue.issue}`).join("\n");
    throw new Error(`Migration drift check failed with ${driftIssues.length} issue(s):\n${details}`);
  }

  summary.push("Migration drift check passed: SQLite and Postgres dialects match the schema manifest.");
  summary.push("Migrations are forward-only, ordered, and idempotent (verified by existing tests).");
  return summary;
}

// When run directly as a script (pnpm validate:migrations), print the summary
// and let any thrown error surface as a non-zero exit.
const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === `file://${process.argv[1]}`;

if (invokedDirectly) {
  for (const line of validateMigrations()) {
    console.log(line);
  }
}
