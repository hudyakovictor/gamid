/**
 * Canonical migration registry for Signal Arena.
 *
 * Selected canonical source:
 * - packages/db/src/migrations.ts (SQLite) is the source of truth for schema intent and ordering.
 * - packages/db/src/postgres-migrations.ts is an explicit dialect rendering of the same intent.
 *
 * Invariants:
 * - Migrations are forward-only, deterministic, ordered, transactional where supported, idempotent where expected.
 * - Both dialects must share identical migration ids in identical order.
 * - Table and index intent must match; dialect differences (TEXT vs TIMESTAMPTZ, JSON vs JSONB) are allowed but must be documented.
 * - infra/migrations/** is legacy and not canonical; it contained only 0001_foundation.sql and is now removed. Canonical is in packages/db/src/.
 *
 * Future Backend and Content/Data agents:
 * - Add new migrations to BOTH files with the same id, preserving order.
 * - Do not manually maintain unrelated copies without updating drift checks.
 * - Run `pnpm validate:migrations` to verify drift.
 * - Migrations must be tested from empty SQLite and empty Postgres (CI uses POSTGRES_TEST_URL) and repeated application.
 * - Do not add destructive migrations without explicit backup/rollback plan.
 */

import { MIGRATIONS as SQLITE_MIGRATIONS } from "./migrations.js";
import { POSTGRES_MIGRATIONS } from "./postgres-migrations.js";

export const CANONICAL_MIGRATION_IDS = SQLITE_MIGRATIONS.map((m) => m.id);

export const MIGRATION_REGISTRY = {
  canonicalSource: "packages/db/src/migrations.ts",
  dialectRendering: "packages/db/src/postgres-migrations.ts",
  legacyPath: "infra/migrations/** (removed, not canonical)",
  ids: CANONICAL_MIGRATION_IDS,
  count: SQLITE_MIGRATIONS.length,
} as const;

function extractTableNames(sql: string): Set<string> {
  const tables = new Set<string>();
  const regex = /CREATE TABLE IF NOT EXISTS\s+([a-z_]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(sql)) !== null) {
    const name = match[1];
    if (name) {
      tables.add(name.toLowerCase());
    }
  }
  return tables;
}

function extractIndexNames(sql: string): Set<string> {
  const indexes = new Set<string>();
  const regex = /CREATE (?:UNIQUE )?INDEX IF NOT EXISTS\s+([a-z_]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(sql)) !== null) {
    const name = match[1];
    if (name) {
      indexes.add(name.toLowerCase());
    }
  }
  return indexes;
}

export type DriftIssue = {
  migrationId: string;
  issue: string;
};

export function checkMigrationDrift(): DriftIssue[] {
  const issues: DriftIssue[] = [];

  if (SQLITE_MIGRATIONS.length !== POSTGRES_MIGRATIONS.length) {
    issues.push({
      migrationId: "registry",
      issue: `Migration count mismatch: SQLite has ${SQLITE_MIGRATIONS.length}, Postgres has ${POSTGRES_MIGRATIONS.length}`,
    });
  }

  const maxLen = Math.max(SQLITE_MIGRATIONS.length, POSTGRES_MIGRATIONS.length);
  for (let i = 0; i < maxLen; i++) {
    const sqlite = SQLITE_MIGRATIONS[i];
    const pg = POSTGRES_MIGRATIONS[i];

    if (!sqlite || !pg) {
      issues.push({
        migrationId: sqlite?.id ?? pg?.id ?? `index-${i}`,
        issue: `Missing migration at index ${i}: SQLite=${sqlite?.id ?? "none"}, Postgres=${pg?.id ?? "none"}`,
      });
      continue;
    }

    if (sqlite.id !== pg.id) {
      issues.push({
        migrationId: sqlite.id,
        issue: `ID/order mismatch at index ${i}: SQLite=${sqlite.id}, Postgres=${pg.id}`,
      });
    }

    const sqliteTables = extractTableNames(sqlite.sql);
    const pgTables = extractTableNames(pg.sql);

    for (const table of sqliteTables) {
      if (!pgTables.has(table)) {
        issues.push({
          migrationId: sqlite.id,
          issue: `Table ${table} exists in SQLite but not in Postgres dialect`,
        });
      }
    }
    for (const table of pgTables) {
      if (!sqliteTables.has(table)) {
        issues.push({
          migrationId: sqlite.id,
          issue: `Table ${table} exists in Postgres but not in SQLite canonical`,
        });
      }
    }

    // Check that both contain same indexes (at least same names)
    const sqliteIndexes = extractIndexNames(sqlite.sql);
    const pgIndexes = extractIndexNames(pg.sql);
    for (const idx of sqliteIndexes) {
      if (!pgIndexes.has(idx)) {
        issues.push({
          migrationId: sqlite.id,
          issue: `Index ${idx} exists in SQLite but not in Postgres dialect`,
        });
      }
    }
    for (const idx of pgIndexes) {
      if (!sqliteIndexes.has(idx)) {
        issues.push({
          migrationId: sqlite.id,
          issue: `Index ${idx} exists in Postgres but not in SQLite canonical`,
        });
      }
    }
  }

  return issues;
}

export function assertNoDrift(): void {
  const issues = checkMigrationDrift();
  if (issues.length > 0) {
    const details = issues.map((i) => `${i.migrationId}: ${i.issue}`).join("\n");
    throw new Error(`Migration drift detected:\n${details}`);
  }
}
