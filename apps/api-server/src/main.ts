import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { closeDatabase, createDatabase } from "../../../packages/db/src/index.js";
import { buildServer } from "./server.js";

const port = Number(process.env.PORT ?? 3000);
const databasePath = process.env.DB_PATH ?? "var/signal-arena.sqlite";

if (databasePath !== ":memory:") {
  mkdirSync(dirname(databasePath), { recursive: true });
}

const database = createDatabase(databasePath);
const server = buildServer({ database });

try {
  await server.listen({ host: "0.0.0.0", port });
} catch (error) {
  server.log.error(error);
  closeDatabase(database);
  process.exitCode = 1;
}
