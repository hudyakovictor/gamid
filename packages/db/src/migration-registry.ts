/**
 * Canonical migration registry for Signal Arena.
 *
 * Selected canonical source:
 * - packages/db/src/migrations.ts (SQLite) is the source of truth for schema intent and ordering.
 * - packages/db/src/postgres-migrations.ts is an explicit dialect rendering of the same intent.
 * - packages/db/src/schema-manifest.ts is the deterministic, reviewable manifest of
 *   table-level intent that BOTH dialect renderings must satisfy.
 *
 * Invariants:
 * - Migrations are forward-only, deterministic, ordered, transactional where supported, idempotent where expected.
 * - Both dialects must share identical migration ids in identical order.
 * - Table intent (tables, columns, primary keys, unique constraints, foreign keys, named indexes)
 *   must match the manifest for BOTH dialects.
 * - Documented dialect differences (TEXT vs TIMESTAMPTZ, JSON text vs JSONB, TEXT vs UUID,
 *   INTEGER-as-boolean vs BOOLEAN, dialect-specific defaults/CHECK syntax) are allowed and are
 *   NOT compared — see schema-manifest.ts ALLOWED_DIALECT_DIFFERENCES.
 * - infra/migrations/** is legacy and not canonical; if it returns with files, validation FAILS.
 *
 * Future Backend and Content/Data agents:
 * - Add new migrations to BOTH files with the same id, preserving order, AND extend the manifest.
 * - Run `pnpm validate:migrations` to verify drift; it exits non-zero on every detected drift.
 * - Migrations must be tested from empty SQLite and empty Postgres (CI uses POSTGRES_TEST_URL) and repeated application.
 * - Do not add destructive migrations without explicit backup/rollback plan.
 */

import { MIGRATIONS as SQLITE_MIGRATIONS } from "./migrations.js";
import { POSTGRES_MIGRATIONS } from "./postgres-migrations.js";
import {
  SCHEMA_MANIFEST,
  type ForeignKeyIntent,
  type SchemaManifest,
} from "./schema-manifest.js";

export const CANONICAL_MIGRATION_IDS = SQLITE_MIGRATIONS.map((m) => m.id);

export const MIGRATION_REGISTRY = {
  canonicalSource: "packages/db/src/migrations.ts",
  dialectRendering: "packages/db/src/postgres-migrations.ts",
  schemaManifest: "packages/db/src/schema-manifest.ts",
  legacyPath: "infra/migrations/** (removed, not canonical; presence of files fails validation)",
  ids: CANONICAL_MIGRATION_IDS,
  count: SQLITE_MIGRATIONS.length,
} as const;

// ---------------------------------------------------------------------------
// Bounded, deterministic SQL intent extractor.
//
// This is NOT a general SQL parser. It reads only the constrained shapes our
// own migrations use: `CREATE TABLE IF NOT EXISTS <name> ( <items> );` and
// `CREATE [UNIQUE] INDEX IF NOT EXISTS <name> ON <table>(...)`. It extracts
// table-level intent (columns, primary keys, unique constraints, foreign keys)
// and named indexes so both dialect renderings can be verified against the
// canonical manifest. Physical types, defaults and CHECK expressions are
// intentionally ignored (allowed dialect differences).
// ---------------------------------------------------------------------------

export type ExtractedForeignKey = {
  columns: string[];
  references: string;
  refColumns: string[];
};

export type ExtractedTable = {
  table: string;
  columns: string[];
  primaryKey: string[];
  uniqueConstraints: string[][];
  foreignKeys: ExtractedForeignKey[];
};

export type ExtractedIndex = {
  name: string;
  table: string;
  unique: boolean;
};

export type ExtractedSchema = {
  tables: Map<string, ExtractedTable>;
  indexes: Map<string, ExtractedIndex>;
};

/** Split a parenthesized body into top-level comma-separated items. */
function splitTopLevel(body: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of body) {
    if (char === "(") {
      depth += 1;
      current += char;
    } else if (char === ")") {
      depth -= 1;
      current += char;
    } else if (char === "," && depth === 0) {
      items.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim().length > 0) {
    items.push(current);
  }
  return items;
}

/** Return the content inside the FIRST balanced parenthesis group at/after `from`. */
function readParenGroup(sql: string, from: number): { content: string; end: number } | null {
  const open = sql.indexOf("(", from);
  if (open === -1) {
    return null;
  }
  let depth = 0;
  for (let i = open; i < sql.length; i += 1) {
    const ch = sql[i];
    if (ch === "(") {
      depth += 1;
    } else if (ch === ")") {
      depth -= 1;
      if (depth === 0) {
        return { content: sql.slice(open + 1, i), end: i };
      }
    }
  }
  return null;
}

function parseColumnList(group: string): string[] {
  return splitTopLevel(group)
    .map((part) => part.trim().split(/\s+/)[0]?.replace(/["`]/g, "") ?? "")
    .filter((name) => name.length > 0);
}

function parseCreateTable(statement: string): ExtractedTable | null {
  const header = /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+([a-z_][a-z0-9_]*)/i.exec(statement);
  if (!header || !header[1]) {
    return null;
  }
  const table = header[1].toLowerCase();
  const group = readParenGroup(statement, header.index + header[0].length);
  if (!group) {
    return null;
  }

  const columns: string[] = [];
  const primaryKey: string[] = [];
  const uniqueConstraints: string[][] = [];
  const foreignKeys: ExtractedForeignKey[] = [];

  for (const rawItem of splitTopLevel(group.content)) {
    const item = rawItem.trim();
    if (item.length === 0) {
      continue;
    }
    const upper = item.toUpperCase();

    // Table-level constraints.
    if (upper.startsWith("PRIMARY KEY")) {
      const pk = readParenGroup(item, 0);
      if (pk) {
        primaryKey.push(...parseColumnList(pk.content));
      }
      continue;
    }
    if (upper.startsWith("UNIQUE")) {
      const uq = readParenGroup(item, 0);
      if (uq) {
        uniqueConstraints.push(parseColumnList(uq.content));
      }
      continue;
    }
    if (upper.startsWith("FOREIGN KEY")) {
      const fk = parseForeignKey(item, null);
      if (fk) {
        foreignKeys.push(fk);
      }
      continue;
    }
    if (upper.startsWith("CHECK")) {
      continue;
    }

    // Column definition: first token is the column name.
    const columnName = item.split(/\s+/)[0]?.replace(/["`]/g, "").toLowerCase();
    if (!columnName) {
      continue;
    }
    columns.push(columnName);

    if (/\bPRIMARY\s+KEY\b/i.test(item)) {
      primaryKey.push(columnName);
    }
    if (/\bUNIQUE\b/i.test(item)) {
      uniqueConstraints.push([columnName]);
    }
    if (/\bREFERENCES\b/i.test(item)) {
      const fk = parseForeignKey(item, columnName);
      if (fk) {
        foreignKeys.push(fk);
      }
    }
  }

  return { table, columns, primaryKey, uniqueConstraints, foreignKeys };
}

function parseForeignKey(item: string, inlineColumn: string | null): ExtractedForeignKey | null {
  let localColumns: string[];
  let refSearchFrom: number;

  if (inlineColumn) {
    localColumns = [inlineColumn];
    refSearchFrom = 0;
  } else {
    // FOREIGN KEY (a, b) REFERENCES t(x, y)
    const localGroup = readParenGroup(item, 0);
    if (!localGroup) {
      return null;
    }
    localColumns = parseColumnList(localGroup.content);
    refSearchFrom = localGroup.end;
  }

  const refMatch = /REFERENCES\s+([a-z_][a-z0-9_]*)/i.exec(item.slice(refSearchFrom));
  if (!refMatch || !refMatch[1]) {
    return null;
  }
  const references = refMatch[1].toLowerCase();
  const afterRef = refSearchFrom + refMatch.index + refMatch[0].length;
  const refGroup = readParenGroup(item, afterRef);
  // Referenced columns may be omitted (defaults to the PK of the referenced table).
  const refColumns = refGroup ? parseColumnList(refGroup.content) : [];
  return { columns: localColumns, references, refColumns };
}

function parseIndexes(statement: string): ExtractedIndex[] {
  const indexes: ExtractedIndex[] = [];
  const regex =
    /CREATE\s+(UNIQUE\s+)?INDEX(?:\s+IF NOT EXISTS)?\s+([a-z_][a-z0-9_]*)\s+ON\s+([a-z_][a-z0-9_]*)/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(statement)) !== null) {
    const name = match[2];
    const table = match[3];
    if (name && table) {
      indexes.push({ name: name.toLowerCase(), table: table.toLowerCase(), unique: Boolean(match[1]) });
    }
  }
  return indexes;
}

/** Extract the full schema intent from an ordered list of migration SQL blocks. */
export function extractSchema(migrations: readonly { readonly sql: string }[]): ExtractedSchema {
  const tables = new Map<string, ExtractedTable>();
  const indexes = new Map<string, ExtractedIndex>();

  for (const migration of migrations) {
    // Split into statements on semicolons at the top level. Our migrations do
    // not embed semicolons inside parenthesized bodies, so a simple split is
    // safe and deterministic here.
    const statements = migration.sql.split(";");
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed.length === 0) {
        continue;
      }
      const upper = trimmed.toUpperCase();
      if (upper.startsWith("CREATE TABLE")) {
        const table = parseCreateTable(trimmed);
        if (table && table.table !== "_migrations" && table.table !== "signal_arena_migrations") {
          tables.set(table.table, table);
        }
      } else if (/^CREATE\s+(UNIQUE\s+)?INDEX/i.test(trimmed)) {
        for (const index of parseIndexes(trimmed)) {
          indexes.set(index.name, index);
        }
      }
    }
  }

  return { tables, indexes };
}

// ---------------------------------------------------------------------------
// Drift checking.
// ---------------------------------------------------------------------------

export type DriftIssue = {
  migrationId: string;
  issue: string;
};

const sortedSets = (values: readonly string[]): string => [...values].sort().join(", ");

function canonicalConstraint(cols: readonly string[]): string {
  return [...cols].join("+");
}

function canonicalFk(fk: ForeignKeyIntent | ExtractedForeignKey): string {
  return `${fk.columns.join("+")}->${fk.references}(${fk.refColumns.join("+")})`;
}

/**
 * Verify an extracted dialect schema against the canonical manifest.
 * `dialect` labels the issues (e.g. "sqlite" / "postgres").
 */
export function checkAgainstManifest(
  extracted: ExtractedSchema,
  manifest: SchemaManifest,
  dialect: string
): DriftIssue[] {
  const issues: DriftIssue[] = [];
  const manifestTableNames = new Set(manifest.tables.map((t) => t.table));

  // Extra tables not in the manifest.
  for (const tableName of extracted.tables.keys()) {
    if (!manifestTableNames.has(tableName)) {
      issues.push({
        migrationId: dialect,
        issue: `Table '${tableName}' exists in ${dialect} rendering but is not in the schema manifest`,
      });
    }
  }

  for (const intent of manifest.tables) {
    const table = extracted.tables.get(intent.table);
    if (!table) {
      issues.push({
        migrationId: intent.migrationId,
        issue: `Table '${intent.table}' missing from ${dialect} rendering`,
      });
      continue;
    }

    // Columns (set equality).
    const expectedCols = new Set(intent.columns);
    const actualCols = new Set(table.columns);
    for (const col of expectedCols) {
      if (!actualCols.has(col)) {
        issues.push({
          migrationId: intent.migrationId,
          issue: `Table '${intent.table}' is missing column '${col}' in ${dialect} rendering (expected [${sortedSets(intent.columns)}])`,
        });
      }
    }
    for (const col of actualCols) {
      if (!expectedCols.has(col)) {
        issues.push({
          migrationId: intent.migrationId,
          issue: `Table '${intent.table}' has unexpected column '${col}' in ${dialect} rendering (not in manifest)`,
        });
      }
    }

    // Primary key (ordered).
    if (intent.primaryKey.join(",") !== table.primaryKey.join(",")) {
      issues.push({
        migrationId: intent.migrationId,
        issue: `Table '${intent.table}' primary key mismatch in ${dialect}: expected [${intent.primaryKey.join(", ")}], got [${table.primaryKey.join(", ")}]`,
      });
    }

    // Unique constraints (as sets of column-groups).
    const expectedUnique = new Set(intent.uniqueConstraints.map(canonicalConstraint));
    const actualUnique = new Set(table.uniqueConstraints.map(canonicalConstraint));
    for (const uq of expectedUnique) {
      if (!actualUnique.has(uq)) {
        issues.push({
          migrationId: intent.migrationId,
          issue: `Table '${intent.table}' is missing unique constraint (${uq}) in ${dialect} rendering`,
        });
      }
    }

    // Foreign keys (as sets).
    const expectedFks = new Set(intent.foreignKeys.map(canonicalFk));
    const actualFks = new Set(table.foreignKeys.map(canonicalFk));
    for (const fk of expectedFks) {
      if (!actualFks.has(fk)) {
        issues.push({
          migrationId: intent.migrationId,
          issue: `Table '${intent.table}' is missing foreign key ${fk} in ${dialect} rendering`,
        });
      }
    }
    for (const fk of actualFks) {
      if (!expectedFks.has(fk)) {
        issues.push({
          migrationId: intent.migrationId,
          issue: `Table '${intent.table}' has unexpected foreign key ${fk} in ${dialect} rendering (not in manifest)`,
        });
      }
    }
  }

  // Indexes.
  const manifestIndexNames = new Set(manifest.indexes.map((i) => i.name));
  for (const intent of manifest.indexes) {
    const index = extracted.indexes.get(intent.name);
    if (!index) {
      issues.push({
        migrationId: dialect,
        issue: `Named index '${intent.name}' (on ${intent.table}) missing from ${dialect} rendering`,
      });
      continue;
    }
    if (index.table !== intent.table) {
      issues.push({
        migrationId: dialect,
        issue: `Index '${intent.name}' is on table '${index.table}' in ${dialect}, expected '${intent.table}'`,
      });
    }
    if (index.unique !== intent.unique) {
      issues.push({
        migrationId: dialect,
        issue: `Index '${intent.name}' uniqueness mismatch in ${dialect}: expected unique=${intent.unique}, got unique=${index.unique}`,
      });
    }
  }
  for (const indexName of extracted.indexes.keys()) {
    if (!manifestIndexNames.has(indexName)) {
      issues.push({
        migrationId: dialect,
        issue: `Named index '${indexName}' exists in ${dialect} rendering but is not in the schema manifest`,
      });
    }
  }

  return issues;
}

/**
 * Full drift check:
 *  1. migration count parity;
 *  2. identical, ordered migration ids across dialects;
 *  3. SQLite rendering matches the canonical manifest;
 *  4. PostgreSQL rendering matches the canonical manifest;
 *  5. (transitively) the two dialects agree on table-level intent.
 */
export type MigrationSql = { readonly id: string; readonly sql: string };

export function checkMigrationDrift(
  sqliteMigrations: readonly MigrationSql[] = SQLITE_MIGRATIONS,
  postgresMigrations: readonly MigrationSql[] = POSTGRES_MIGRATIONS,
  manifest: SchemaManifest = SCHEMA_MANIFEST
): DriftIssue[] {
  const issues: DriftIssue[] = [];

  if (sqliteMigrations.length !== postgresMigrations.length) {
    issues.push({
      migrationId: "registry",
      issue: `Migration count mismatch: SQLite has ${sqliteMigrations.length}, Postgres has ${postgresMigrations.length}`,
    });
  }

  const maxLen = Math.max(sqliteMigrations.length, postgresMigrations.length);
  for (let i = 0; i < maxLen; i += 1) {
    const sqlite = sqliteMigrations[i];
    const pg = postgresMigrations[i];
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
  }

  const sqliteSchema = extractSchema(sqliteMigrations);
  const postgresSchema = extractSchema(postgresMigrations);

  issues.push(...checkAgainstManifest(sqliteSchema, manifest, "sqlite"));
  issues.push(...checkAgainstManifest(postgresSchema, manifest, "postgres"));

  return issues;
}

export function assertNoDrift(): void {
  const issues = checkMigrationDrift();
  if (issues.length > 0) {
    const details = issues.map((i) => `${i.migrationId}: ${i.issue}`).join("\n");
    throw new Error(`Migration drift detected:\n${details}`);
  }
}
