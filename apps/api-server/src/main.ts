import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import {
  createDatabase,
  PostgresPersistenceAdapter,
  type DatabaseHandle,
  type PersistencePort
} from "../../../packages/db/src/index.js";
import { buildServer } from "./server.js";

const port = Number(process.env.PORT ?? 3000);
const databaseDriver = process.env.DB_DRIVER ?? "sqlite";
const databasePath = process.env.DB_PATH ?? "var/signal-arena.sqlite";
const databaseUrl = process.env.DATABASE_URL;
const configuredAuthMode = process.env.AUTH_MODE ?? "fixture";

if (databaseDriver !== "sqlite" && databaseDriver !== "postgres") {
  throw new Error("DB_DRIVER must be either sqlite or postgres");
}

if (configuredAuthMode !== "fixture" && configuredAuthMode !== "telegram") {
  throw new Error("AUTH_MODE must be either fixture or telegram");
}

if (process.env.NODE_ENV === "production" && configuredAuthMode !== "telegram") {
  throw new Error("Production API requires AUTH_MODE=telegram");
}

if (process.env.NODE_ENV === "production" && databaseDriver !== "postgres") {
  throw new Error("Production API requires DB_DRIVER=postgres");
}

if (databaseDriver === "postgres" && !databaseUrl) {
  throw new Error("DB_DRIVER=postgres requires DATABASE_URL");
}

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
if (configuredAuthMode === "telegram" && !telegramBotToken) {
  throw new Error("AUTH_MODE=telegram requires TELEGRAM_BOT_TOKEN");
}

const corsOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
if (process.env.NODE_ENV === "production" && corsOrigins.length === 0) {
  throw new Error("Production API requires CORS_ORIGINS");
}
if (process.env.NODE_ENV === "production") {
  throw new Error("Production API requires a shared rate-limit store before deployment");
}

let database: DatabaseHandle | undefined;
let persistence: PersistencePort | undefined;
let closePersistence: (() => Promise<void>) | undefined;
let readinessCheck: (() => Promise<void>) | undefined;

if (databaseDriver === "postgres") {
  if (!databaseUrl) {
    throw new Error("DB_DRIVER=postgres requires DATABASE_URL");
  }
  if (process.env.NODE_ENV === "production" && process.env.DB_AUTO_MIGRATE === "true") {
    throw new Error("Production migrations must run through db:migrate:postgres, not API startup");
  }
  const postgres = new PostgresPersistenceAdapter({
    connectionString: databaseUrl
  });
  if (process.env.DB_AUTO_MIGRATE === "true") {
    await postgres.migrate();
  }
  persistence = postgres;
  closePersistence = () => postgres.close();
  readinessCheck = () => postgres.checkReadiness();
} else {
  if (databasePath !== ":memory:") {
    mkdirSync(dirname(databasePath), { recursive: true });
  }
  database = createDatabase(databasePath);
}

const server = buildServer({
  ...(database ? { database } : {}),
  ...(persistence ? { persistence } : {}),
  ...(closePersistence ? { closePersistence } : {}),
  ...(readinessCheck ? { readinessCheck } : {}),
  authMode: configuredAuthMode,
  editorUserIds: (process.env.CONTENT_EDITOR_USER_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean),
  seedFoundation: configuredAuthMode === "fixture" && databaseDriver === "sqlite",
  ...(corsOrigins.length > 0 ? { allowedOrigins: corsOrigins } : {}),
  ...(telegramBotToken ? { telegramBotToken } : {})
});

let shuttingDown = false;
const shutdown = async (exitCode = 0): Promise<void> => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  try {
    await server.close();
  } finally {
    process.exitCode = exitCode;
  }
};

process.once("SIGINT", () => {
  void shutdown(0);
});
process.once("SIGTERM", () => {
  void shutdown(0);
});

try {
  await server.listen({ host: "0.0.0.0", port });
} catch (error) {
  server.log.error(error);
  await shutdown(1);
}
