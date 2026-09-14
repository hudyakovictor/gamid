import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { starterScenario } from "../packages/content/src/fixtures/starter-scenario.js";
import {
  closeDatabase,
  createDatabase,
  seedFoundation
} from "../packages/db/src/index.js";

const databasePath = process.env.DB_PATH ?? "var/signal-arena.sqlite";

if (databasePath !== ":memory:") {
  mkdirSync(dirname(databasePath), { recursive: true });
}

const handle = createDatabase(databasePath);

try {
  seedFoundation({ ...handle, scenario: starterScenario });
  console.log(`Database seed applied: ${databasePath}`);
} finally {
  closeDatabase(handle);
}
