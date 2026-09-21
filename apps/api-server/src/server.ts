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
  CatalogResponseSchema,
  DecisionTraceSchema,
  LedgerEventPageSchema,
  PurchaseRequestSchema,
  PurchaseSchema,
  ReviewStatusSchema,
  ScenarioRunStartRequestSchema,
  ScenarioRunSummarySchema,
  ScenarioPackageSummarySchema,
  TelegramAuthRequestSchema,
  UserBalanceSchema,
  type PurchaseRequest,
  type ScenarioPackage
} from "../../../packages/contracts/src/index.js";
import { importScenarioPackage } from "../../../packages/content/src/validate.js";
import { FOUNDER_SKUS, COIN_PACKS, STORE_SERVICES } from "../../../packages/domain/src/catalog.js";
import { grantScenarioRewards } from "./economy.js";
import {
  purchaseService,
  purchaseSku,
  refundPurchase,
  StoreError,
  type PurchaseOutcome
} from "./store.js";
import {
  attributeReferral,
  createReferralCode,
  onInviteePurchase,
  ReferralError,
  syncReferralProgress
} from "./referrals.js";
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
  /** Trusted server configuration, never populated from request claims. */
  editorUserIds?: readonly string[];
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

  // Central protection: authenticated mutations inherit CSRF validation.
  // Mutating operations must not use GET (invariant). Reveal is POST.
  server.addHook("preHandler", async (request, reply) => {
    const path = request.url.split("?")[0] ?? "";
    if (!path.startsWith("/api/v1/") || path === "/api/v1/auth/telegram") return;
    const isAdmin = path.startsWith("/api/v1/admin/");
    const mutates = !["GET", "HEAD", "OPTIONS"].includes(request.method);
    if (!isAdmin && !mutates) return;
    const authenticatedUserId = await getAuthenticatedUserId(request, reply);
    if (!authenticatedUserId) return;
    if (isAdmin && !options.editorUserIds?.includes(authenticatedUserId)) {
      return reply.code(403).send({ error: "admin_forbidden" });
    }
    if (mutates && !requireCsrf(request, reply)) return;
  });

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

  server.get("/api/v1/scenarios", async (request, reply) => {
    if (!(await getAuthenticatedUserId(request, reply))) {
      return;
    }

    const scenarios = await persistence.listScenarioPackages();
    return {
      data: {
        scenarios: scenarios.map((summary) =>
          ScenarioPackageSummarySchema.parse(summary)
        )
      }
    };
  });

  server.get<{
    Params: { userId: string };
  }>(
    "/api/v1/users/:userId/balance",
    async (request, reply) => {
      const authenticatedUserId = await getAuthenticatedUserId(request, reply);
      if (!authenticatedUserId) {
        return;
      }

      if (request.params.userId !== authenticatedUserId) {
        return reply.code(404).send({ error: "user_not_found" });
      }

      const balance = await persistence.deriveUserBalance(authenticatedUserId);
      return {
        data: {
          balance: UserBalanceSchema.parse(balance)
        }
      };
    }
  );

  server.get<{
    Params: { userId: string };
    Querystring: { limit?: string };
  }>(
    "/api/v1/users/:userId/ledger",
    async (request, reply) => {
      const authenticatedUserId = await getAuthenticatedUserId(request, reply);
      if (!authenticatedUserId) {
        return;
      }

      if (request.params.userId !== authenticatedUserId) {
        return reply.code(404).send({ error: "user_not_found" });
      }

      const limit = request.query.limit
        ? Math.min(Math.max(Number.parseInt(request.query.limit, 10) || 50, 1), 500)
        : 50;
      const events = await persistence.listLedgerEvents(authenticatedUserId, limit);
      return {
        data: LedgerEventPageSchema.parse({ events, asOf: new Date().toISOString() })
      };
    }
  );

  server.get<{
    Params: { userId: string };
  }>(
    "/api/v1/users/:userId/scenario-runs",
    async (request, reply) => {
      const authenticatedUserId = await getAuthenticatedUserId(request, reply);
      if (!authenticatedUserId) {
        return;
      }

      if (request.params.userId !== authenticatedUserId) {
        return reply.code(404).send({ error: "user_not_found" });
      }

    const runs = await persistence.listScenarioRunsForUser(authenticatedUserId);
    return {
      data: {
        runs: runs.map((summary) => ScenarioRunSummarySchema.parse(summary))
      }
    };
  });

  server.get("/api/v1/users/me", async (request, reply) => {
    const authenticatedUserId = await getAuthenticatedUserId(request, reply);
    if (!authenticatedUserId) {
      return;
    }

    return { data: { userId: authenticatedUserId } };
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

  server.post<{
    Params: { runId: string };
  }>("/api/v1/scenario-runs/:runId/reveal", async (request, reply) => {
    const authenticatedUserId = await getAuthenticatedUserId(request, reply);
    if (!authenticatedUserId || !requireCsrf(request, reply)) {
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
    if (revealed.score) {
      // Server-authoritative, idempotent reward grant (P1-7). Replayed
      // reveals re-run this call; idempotency keys prevent double grants.
      await grantScenarioRewards(persistence, {
        userId: authenticatedUserId,
        runId: revealed.runId,
        scenarioId: revealed.scenarioId,
        mode: scenario.mode,
        score: revealed.score
      });
      // Referral progress is server-driven (3 valid scenarios → activation).
      await syncReferralProgress(persistence, authenticatedUserId);
    }
    return {
      data: {
        run: toRunResponse(revealed, true),
        reveal: toScenarioRevealProjection(scenario)
      }
    };
  });

  server.post<{ Body: unknown }>(
    "/api/v1/admin/scenarios",
    async (request, reply) => {
      const authenticatedUserId = await getAuthenticatedUserId(request, reply);
      if (!authenticatedUserId) {
        return;
      }

      let package_: ScenarioPackage;
      try {
        package_ = importScenarioPackage(request.body);
      } catch (error) {
        return reply.code(422).send({
          error: "invalid_scenario_package",
          message: error instanceof Error ? error.message : "invalid package"
        });
      }

      try {
        const { created } = await persistence.upsertScenarioPackage(package_);
        const body = {
          scenarioId: package_.scenarioId,
          version: package_.version,
          reviewStatus: package_.reviewStatus,
          created
        };
        return created
          ? reply.code(201).send({ data: body })
          : reply.code(200).send({ data: body });
      } catch (error) {
        return reply.code(409).send({
          error: "scenario_conflict",
          message: error instanceof Error ? error.message : "conflict"
        });
      }
    }
  );

  server.post<{
    Params: { scenarioId: string };
    Body: { version?: unknown; status?: unknown };
  }>(
    "/api/v1/admin/scenarios/:scenarioId/review",
    async (request, reply) => {
      const authenticatedUserId = await getAuthenticatedUserId(request, reply);
      if (!authenticatedUserId) {
        return;
      }

      const version = request.body?.version;
      const status = request.body?.status;
      if (typeof version !== "string" || version.length === 0) {
        return reply.code(422).send({ error: "invalid_request" });
      }
      const parsedStatus = ReviewStatusSchema.safeParse(status);
      if (!parsedStatus.success) {
        return reply.code(422).send({ error: "invalid_request" });
      }

      const updated = await persistence.setScenarioReviewStatus(
        request.params.scenarioId,
        version,
        parsedStatus.data
      );
      if (!updated) {
        return reply.code(404).send({ error: "scenario_not_found" });
      }
      return {
        data: {
          scenarioId: request.params.scenarioId,
          version,
          reviewStatus: parsedStatus.data
        }
      };
    }
  );

  server.get("/api/v1/catalog", async (request, reply) => {
    if (!(await getAuthenticatedUserId(request, reply))) {
      return;
    }
    const catalog = CatalogResponseSchema.parse({
      packs: COIN_PACKS,
      services: STORE_SERVICES,
      skus: FOUNDER_SKUS
    });
    return { data: catalog };
  });

  server.post<{ Body: PurchaseRequest }>(
    "/api/v1/purchases",
    async (request, reply) => {
      const authenticatedUserId = await getAuthenticatedUserId(request, reply);
      if (!authenticatedUserId) {
        return;
      }

      const parsed = PurchaseRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(422).send({ error: "invalid_request" });
      }
      const input = parsed.data;

      let outcome: PurchaseOutcome;
      try {
        if (input.kind === "coin_pack") {
          return reply.code(403).send({ error: "verified_payment_required" });
        } else if (input.kind === "service") {
          outcome = await purchaseService(persistence, {
            userId: authenticatedUserId,
            serviceId: input.itemId,
            clientKey: input.clientKey
          });
        } else {
          outcome = await purchaseSku(persistence, {
            userId: authenticatedUserId,
            skuId: input.itemId,
            clientKey: input.clientKey
          });
        }
      } catch (error) {
        if (error instanceof StoreError) {
          const statusCode =
            error.code === "unknown_item"
              ? 404
              : error.code === "supply_exhausted"
                ? 409
                : 422;
          return reply.code(statusCode).send({ error: error.code, message: error.message });
        }
        throw error;
      }

      // The invitee's first confirmed purchase pays the inviter (P1-7b).
      if (outcome.purchase.state === "completed") {
        await onInviteePurchase(persistence, authenticatedUserId);
      }

      return {
        data: {
          purchase: PurchaseSchema.parse(outcome.purchase),
          duplicate: outcome.duplicate,
          balance: UserBalanceSchema.parse(outcome.balance)
        }
      };
    }
  );

  server.post<{
    Params: { purchaseId: string };
    Body: { clientKey?: unknown };
  }>(
    "/api/v1/purchases/:purchaseId/refund",
    async (request, reply) => {
      const authenticatedUserId = await getAuthenticatedUserId(request, reply);
      if (!authenticatedUserId) {
        return;
      }

      try {
        const purchase = await refundPurchase(persistence, {
          userId: authenticatedUserId,
          purchaseId: request.params.purchaseId,
          clientKey:
            typeof request.body?.clientKey === "string" ? request.body.clientKey : "refund"
        });
        return { data: { purchase: PurchaseSchema.parse(purchase) } };
      } catch (error) {
        if (error instanceof StoreError) {
          const statusCode = error.code === "unknown_item" ? 404 : 409;
          return reply.code(statusCode).send({ error: error.code, message: error.message });
        }
        throw error;
      }
    }
  );

  server.post<{ Body: { clientKey?: unknown } }>(
    "/api/v1/referrals",
    async (request, reply) => {
      const authenticatedUserId = await getAuthenticatedUserId(request, reply);
      if (!authenticatedUserId) {
        return;
      }
      const { created, referral } = await createReferralCode(
        persistence,
        authenticatedUserId
      );
      return {
        data: {
          code: referral.code,
          state: referral.state,
          created
        }
      };
    }
  );

  server.post<{ Body: { code?: unknown } }>(
    "/api/v1/referrals/attribute",
    async (request, reply) => {
      const authenticatedUserId = await getAuthenticatedUserId(request, reply);
      if (!authenticatedUserId) {
        return;
      }
      const code = request.body?.code;
      if (typeof code !== "string" || code.length < 3) {
        return reply.code(422).send({ error: "invalid_request" });
      }
      try {
        const referral = await attributeReferral(persistence, {
          code,
          inviteeId: authenticatedUserId
        });
        return {
          data: {
            state: referral.state,
            inviteeRewardPreview: "25 promo Coins after 3 valid solo scenarios"
          }
        };
      } catch (error) {
        if (error instanceof ReferralError) {
          const statusCode =
            error.code === "referral_not_found" ? 404 : 409;
          return reply.code(statusCode).send({ error: error.code, message: error.message });
        }
        throw error;
      }
    }
  );

  return server;
}
