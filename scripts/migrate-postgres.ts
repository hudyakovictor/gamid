import {
  PostgresPersistenceAdapter
} from "../packages/db/src/index.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required for PostgreSQL migrations");
}

const adapter = new PostgresPersistenceAdapter({ connectionString });
try {
  await adapter.migrate();
  console.log("PostgreSQL migrations applied");
} finally {
  await adapter.close();
}
