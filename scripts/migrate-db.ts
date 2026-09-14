import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { closeDatabase, createDatabase } from "../packages/db/src/index.js";

const databasePath = process.env.DB_PATH ?? "var/signal-arena.sqlite";

if (databasePath !== ":memory:") {
  mkdirSync(dirname(databasePath), { recursive: true });
}

const handle = createDatabase(databasePath);

try {
  console.log(`Database migrations applied: ${databasePath}`);
} finally {
  closeDatabase(handle);
}
