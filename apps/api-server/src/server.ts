import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual
} from "node:crypto";

import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest
} from "fastify";

import { starterScenario } from "../../../packages/content/src/fixtures/starter-scenario.js";
import {
  InMemoryRateLimitStore,
  type RateLimitStore
} from "./security.js";
import {
  DecisionTraceSchema,
  ScenarioRunStartRequestSchema,
  TelegramAuthRequestSchema
} from "../../../packages/contracts/src/index.js";
import {
  closeDatabase,
  createDatabase,
  seedFoundation,
  SqlitePersistenceAdapter,
  type DatabaseHandle,
  type PersistencePort,
  type ScenarioRunRecord
} from "../../../packages/db/src/index.js";
import {
  assertDecisionTraceAllowed,
  TelegramAuthError,
  evaluateFoundationDecision,
  toPublicScenarioProjection,
  toScenarioRevealProjection,
  verifyTelegramInitDataAsync
} from "../../../packages/domain/src/index.js";

const FOUNDATION_USER_ID = "seed-user-001";

export type AuthMode = "fixture" | "telegram";

export type BuildServerOptions = {
  database?: DatabaseHandle;
  persistence?: PersistencePort;
  closePersistence?: () => Promise<void>;
  readinessCheck?: () => Promise<void>;
  userId?: string;
  authMode?: AuthMode;
  seedFoundation?: boolean;
  telegramBotToken?: string;
  sessionTtlSeconds?: number;
  sessionSecure?: boolean;
  allowedOrigins?: readonly string[];
  rateLimitStore?: RateLimitStore;
  authRateLimitPerMinute?: number;
  now?: () => number;
};

function hashSessionToken(token: string): string {
  return `sha256:${createHash("sha256").update(token).digest("hex")}`;
}

function serializeCookie(
  name: string,
  token: string,
  maxAgeSeconds: number,
  secure: boolean,
  httpOnly: boolean
): string {
  return [
    `${name}=${token}`,
    "Path=/",
    ...(httpOnly ? ["HttpOnly"] : []),
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
    ...(secure ? ["Secure"] : [])
  ].join("; ");
}

function serializeSessionCookie(
  token: string,
  maxAgeSeconds: number,
  secure: boolean
): string {
  return serializeCookie("sa_session", token, maxAgeSeconds, secure, true);
}

function serializeCsrfCookie(
  token: string,
  maxAgeSeconds: number,
  secure: boolean
): string {
  return serializeCookie("sa_csrf", token, maxAgeSeconds, secure, false);
}

function readCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) {
      continue;
    }

    if (part.slice(0, separator).trim() === name) {
      const value = part.slice(separator + 1).trim();
      return value || undefined;
    }
  }

  return undefined;
}

function readSessionToken(cookieHeader: string | undefined): string | undefined {
  return readCookie(cookieHeader, "sa_session");
}

function toRunResponse(
  run: ScenarioRunRecord,
  includeScore = false
): Record<string, unknown> {
  const response: Record<string, unknown> = {
    runId: run.runId,
    scenarioId: run.scenarioId,
    scenarioVersion: run.scenarioVersion,
    state: run.state,
    createdAt: run.createdAt,
    sealedAt: run.sealedAt,
    revealedAt: run.revealedAt,
    completedAt: run.completedAt
  };

  if (run.decision) {
    response.decision = run.decision;
  }

  if (includeScore && run.score) {
    response.score = run.score;
  }

  return response;
}

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const database = options.database ?? (options.persistence ? undefined : createDatabase());
  const persistence = options.persistence ?? (
    database ? new SqlitePersistenceAdapter(database) : (() => {
      throw new Error("A persistence adapter or database is required");
    })()
  );
  const userId = options.userId ?? FOUNDATION_USER_ID;
  const authMode = options.authMode ?? "fixture";
  const now = options.now ?? Date.now;
  const sessionTtlSeconds = options.sessionTtlSeconds ?? 604_800;
  const sessionSecure = options.sessionSecure ?? process.env.NODE_ENV === "production";
  const allowedOrigins = options.allowedOrigins ?? [];
  const rateLimitStore = options.rateLimitStore ?? new InMemoryRateLimitStore();
  const authRateLimitPerMinute = options.authRateLimitPerMinute ?? 10;
  const authRateLimitWindowMs = 60_000;
  const readinessCheck = options.readinessCheck ?? (async () => undefined);

  if (options.seedFoundation ?? !options.persistence) {
    if (!database) {
      throw new Error("Foundation seed requires a SQLite database");
    }
    seedFoundation({
      ...database,
      scenario: starterScenario,
      userId,
      externalId: `fixture:${userId}`
    });
  }

  const server = Fastify({
    logger: false,
    bodyLimit: 16_384
  });

  server.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
    reply.header("x-content-type-options", "nosniff");
    reply.header("referrer-policy", "strict-origin-when-cross-origin");
    reply.header("permissions-policy", "accelerometer=(), camera=(), geolocation=(), microphone=()");
    reply.header("content-security-policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    if (sessionSecure) {
      reply.header("strict-transport-security", "max-age=31536000; includeSubDomains");
    }

    const origin = request.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) {
      return reply.code(403).send({ error: "origin_not_allowed" });
    }
    if (origin) {
      reply.header("access-control-allow-origin", origin);
      reply.header("access-control-allow-credentials", "true");
      reply.header("access-control-allow-methods", "GET,POST,OPTIONS");
      reply.header("access-control-allow-headers", "content-type, x-sa-csrf");
      reply.header("vary", "Origin");
    }
    if (request.method === "OPTIONS") {
      return reply.code(204).send();
    }
  });

  server.addHook("onClose", async () => {
    if (options.closePersistence) {
      await options.closePersistence();
    } else if (database) {
      closeDatabase(database);
    }
  });

  function requireCsrf(request: FastifyRequest, reply: FastifyReply): boolean {
    if (authMode === "fixture") {
      return true;
    }

    const cookieToken = readCookie(request.headers.cookie, "sa_csrf");
    const headerToken = request.headers["x-sa-csrf"];
    if (!cookieToken || typeof headerToken !== "string") {
      void reply.code(403).send({ error: "csrf_failed" });
      return false;
    }

    const expected = Buffer.from(cookieToken);
    const received = Buffer.from(headerToken);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      void reply.code(403).send({ error: "csrf_failed" });
      return false;
    }

    return true;
  }

  async function getAuthenticatedUserId(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<string | undefined> {
    if (authMode === "fixture") {
      return userId;
    }

    const sessionToken = readSessionToken(request.headers.cookie);
    if (!sessionToken) {
      void reply.code(401).send({ error: "auth_required" });
      return undefined;
    }

    const session = await persistence.getActiveAuthSession(
      hashSessionToken(sessionToken),
      new Date(now()).toISOString()
    );
    if (!session) {
      void reply.code(401).send({ error: "auth_required" });
      return undefined;
    }

    return session.userId;
  }

  server.post<{ Body: unknown }>("/api/v1/auth/telegram", async (request, reply) => {
    const rateLimit = rateLimitStore.consume(
      `auth:telegram:${request.ip}`,
      authRateLimitPerMinute,
      authRateLimitWindowMs,
      now()
    );
    if (!rateLimit.allowed) {
      reply.header("retry-after", rateLimit.retryAfterSeconds);
      return reply.code(429).send({ error: "rate_limited" });
    }

    if (!options.telegramBotToken) {
      return reply.code(503).send({ error: "auth_not_configured" });
    }

    const parsedRequest = TelegramAuthRequestSchema.safeParse(request.body);
    if (!parsedRequest.success) {
      return reply.code(400).send({ error: "invalid_request" });
    }

    try {
      const verified = await verifyTelegramInitDataAsync(parsedRequest.data.initData, {
        botToken: options.telegramBotToken,
        nowMs: now(),
        replayGuard: {
          consume: (key, expiresAtMs) => persistence.consumeAuthReplayKey(
            key,
            expiresAtMs,
            now()
          )
        }
      });
      const internalUser = await persistence.getOrCreateUserForIdentity({
        provider: "telegram",
        providerUserId: verified.identity.providerUserId
      });
      const sessionToken = randomBytes(32).toString("base64url");
      const csrfToken = randomBytes(32).toString("base64url");
      const createdAt = new Date(now()).toISOString();
      const expiresAt = new Date(now() + sessionTtlSeconds * 1_000).toISOString();

      await persistence.createAuthSession({
        sessionId: randomUUID(),
        userId: internalUser.userId,
        tokenHash: hashSessionToken(sessionToken),
        createdAt,
        expiresAt
      });

      reply.header("set-cookie", [
        serializeSessionCookie(sessionToken, sessionTtlSeconds, sessionSecure),
        serializeCsrfCookie(csrfToken, sessionTtlSeconds, sessionSecure)
      ]);
      return reply.code(201).send({
        data: {
          identity: verified.identity,
          sessionExpiresAt: expiresAt
        }
      });
    } catch (error) {
      if (error instanceof TelegramAuthError) {
        return reply.code(401).send({ error: error.code });
      }
      return reply.code(500).send({ error: "auth_failed" });
    }
  });

  server.post("/api/v1/auth/logout", async (request, reply) => {
    const sessionToken = readSessionToken(request.headers.cookie);
    if (sessionToken && !requireCsrf(request, reply)) {
      return;
    }
    if (sessionToken) {
      const session = await persistence.getActiveAuthSession(
        hashSessionToken(sessionToken),
        new Date(now()).toISOString()
      );
      if (session) {
        await persistence.revokeAuthSession(session.sessionId, new Date(now()).toISOString());
      }
    }

    reply.header("set-cookie", [
      serializeSessionCookie("", 0, sessionSecure),
      serializeCsrfCookie("", 0, sessionSecure)
    ]);
    return reply.code(204).send();
  });

  server.get("/health", async () => ({
    status: "ok",
    service: "api-server"
  }));

  server.get("/ready", async (_request, reply) => {
    try {
      await readinessCheck();
      return { status: "ready", service: "api-server" };
    } catch {
      return reply.code(503).send({ status: "not_ready", service: "api-server" });
    }
  });

  server.get<{
    Params: { scenarioId: string };
    Querystring: { version?: string };
  }>(
    "/api/v1/scenarios/:scenarioId",
    async (request, reply) => {
      if (!(await getAuthenticatedUserId(request, reply))) {
        return;
      }

      const version = request.query.version ?? starterScenario.version;
      const scenario = await persistence.getScenarioPackage(request.params.scenarioId, version);

      if (!scenario) {
        return reply.code(404).send({ error: "scenario_not_found" });
      }

      return {
        data: toPublicScenarioProjection(scenario)
      };
    }
  );

  server.post<{
    Body: unknown;
  }>("/api/v1/scenario-runs", async (request, reply) => {
    const authenticatedUserId = await getAuthenticatedUserId(request, reply);
    if (!authenticatedUserId || !requireCsrf(request, reply)) {
      return;
    }

    const parsed = ScenarioRunStartRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_request",
        issues: parsed.error.issues
      });
    }

    const scenario = await persistence.getScenarioPackage(
      parsed.data.scenarioId,
      parsed.data.scenarioVersion
    );
    if (!scenario) {
      return reply.code(404).send({ error: "scenario_not_found" });
    }

    try {
      const run = await persistence.createScenarioRun({
        runId: randomUUID(),
        userId: authenticatedUserId,
        scenarioId: parsed.data.scenarioId,
        scenarioVersion: parsed.data.scenarioVersion,
        idempotencyKey: parsed.data.idempotencyKey
      });

      return reply.code(201).send({
        data: {
          run: toRunResponse(run),
          scenario: toPublicScenarioProjection(scenario)
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "scenario_run_failed";
      return reply.code(409).send({ error: "scenario_run_conflict", message });
    }
  });

  server.post<{
    Params: { runId: string };
    Body: unknown;
  }>("/api/v1/scenario-runs/:runId/seal", async (request, reply) => {
    const authenticatedUserId = await getAuthenticatedUserId(request, reply);
    if (!authenticatedUserId || !requireCsrf(request, reply)) {
      return;
    }

    const decision = DecisionTraceSchema.safeParse(request.body);
    if (!decision.success) {
      return reply.code(400).send({
        error: "invalid_decision",
        issues: decision.error.issues
      });
    }

    const current = await persistence.getScenarioRun(request.params.runId, authenticatedUserId);
    if (!current) {
      return reply.code(404).send({ error: "scenario_run_not_found" });
    }

    const scenario = await persistence.getScenarioPackage(
      current.scenarioId,
      current.scenarioVersion
    );
    if (!scenario) {
      return reply.code(500).send({ error: "scenario_package_missing" });
    }

    try {
      assertDecisionTraceAllowed(scenario, decision.data);
      const score = evaluateFoundationDecision(scenario, decision.data);
      const sealed = await persistence.sealScenarioRun(
        request.params.runId,
        authenticatedUserId,
        decision.data,
        score
      );

      return {
        data: {
          run: toRunResponse(sealed)
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "scenario_seal_failed";
      const statusCode = message.includes("already sealed") ? 409 : 422;
      return reply.code(statusCode).send({
        error: statusCode === 409 ? "scenario_run_already_sealed" : "invalid_decision",
        message
      });
    }
  });

  server.get<{
    Params: { runId: string };
  }>("/api/v1/scenario-runs/:runId/reveal", async (request, reply) => {
    const authenticatedUserId = await getAuthenticatedUserId(request, reply);
    if (!authenticatedUserId) {
      return;
    }

    const current = await persistence.getScenarioRun(request.params.runId, authenticatedUserId);
    if (!current) {
      return reply.code(404).send({ error: "scenario_run_not_found" });
    }

    if (current.state === "started") {
      return reply.code(409).send({ error: "scenario_run_not_sealed" });
    }

    const scenario = await persistence.getScenarioPackage(
      current.scenarioId,
      current.scenarioVersion
    );
    if (!scenario) {
      return reply.code(500).send({ error: "scenario_package_missing" });
    }

    const revealed = await persistence.revealScenarioRun(request.params.runId, authenticatedUserId);
    return {
      data: {
        run: toRunResponse(revealed, true),
        reveal: toScenarioRevealProjection(scenario)
      }
    };
  });

  return server;
}
