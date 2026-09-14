import BetterSqlite3 from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import { applyMigrations } from "./migrations.js";
import * as schema from "./schema.js";

export type DatabaseHandle = {
  sqlite: BetterSqlite3.Database;
  db: BetterSQLite3Database<typeof schema>;
};

export function createDatabase(filename = ":memory:"): DatabaseHandle {
  const sqlite = new BetterSqlite3(filename);
  sqlite.pragma("foreign_keys = ON");
  applyMigrations(sqlite);

  return {
    sqlite,
    db: drizzle(sqlite, { schema })
  };
}

export function closeDatabase(handle: DatabaseHandle): void {
  handle.sqlite.close();
}
