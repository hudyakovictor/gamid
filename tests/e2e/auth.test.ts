import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import type { OutgoingHttpHeaders } from "node:http";
import test from "node:test";

import { buildServer } from "../../apps/api-server/src/server.js";
import { createDatabase } from "../../packages/db/src/index.js";

const BOT_TOKEN = "123456:development-only-test-token";
const NOW_MS = Date.parse("2026-09-14T12:00:00.000Z");
const AUTH_DATE_SECONDS = Math.floor(NOW_MS / 1_000) - 120;

function signedInitData({
  userId = 777001,
  authDateSeconds = AUTH_DATE_SECONDS
}: {
  userId?: number;
  authDateSeconds?: number;
} = {}): string {
  const params = new URLSearchParams({
    auth_date: String(authDateSeconds),
    query_id: `AAH-e2e-${userId}`,
    user: JSON.stringify({
      id: userId,
      first_name: "Signal",
      username: "signal_tester",
      language_code: "en"
    })
  });
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData")
    .update(BOT_TOKEN)
    .digest();
  const hash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");
  params.set("hash", hash);
  return params.toString();
}

function cookieFrom(
  response: { headers: OutgoingHttpHeaders },
  name: string
): string {
  const rawHeader = response.headers["set-cookie"];
  const rawCookies = Array.isArray(rawHeader)
    ? rawHeader
    : typeof rawHeader === "string" ? [rawHeader] : [];
  const rawCookie = rawCookies.find((cookie) => cookie.startsWith(`${name}=`));
  if (!rawCookie) {
    throw new Error(`auth response should set a ${name} cookie`);
  }
  return rawCookie.split(";", 1)[0] ?? "";
}

test("Telegram auth fails closed when the bot token is not configured", async () => {
  const server = buildServer({ authMode: "telegram", now: () => NOW_MS });
  const response = await server.inject({
    method: "POST",
    url: "/api/v1/auth/telegram",
    payload: { initData: signedInitData() }
  });

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.json(), { error: "auth_not_configured" });
  await server.close();
});

test("Telegram auth creates one internal identity and a hashed HttpOnly session", async () => {
  const database = createDatabase();
  const server = buildServer({
    database,
    authMode: "telegram",
    telegramBotToken: BOT_TOKEN,
    sessionSecure: false,
    now: () => NOW_MS
  });
  const initData = signedInitData();
  const response = await server.inject({
    method: "POST",
    url: "/api/v1/auth/telegram",
    payload: { initData }
  });
  const body = response.json<{
    data: { identity: { provider: string; providerUserId: string }; sessionExpiresAt: string };
  }>();
  const sessionCookie = cookieFrom(response, "sa_session");
  const csrfCookie = cookieFrom(response, "sa_csrf");
  const csrfToken = csrfCookie.slice("sa_csrf=".length);
  const cookie = `${sessionCookie}; ${csrfCookie}`;
  const sessionToken = sessionCookie.slice("sa_session=".length);

  assert.equal(response.statusCode, 201);
  assert.deepEqual(body.data.identity, {
    provider: "telegram",
    providerUserId: "777001",
    authDate: "2026-09-14T11:58:00.000Z"
  });
  assert.equal(JSON.stringify(body).includes(sessionToken), false);
  assert.match(response.headers["set-cookie"]?.toString() ?? "", /HttpOnly/);
  assert.match(response.headers["set-cookie"]?.toString() ?? "", /SameSite=Lax/);
  assert.match(response.headers["set-cookie"]?.toString() ?? "", /sa_csrf=/);

  const identity = database.sqlite.prepare(`
    SELECT user_id AS userId
    FROM user_identities
    WHERE provider = 'telegram' AND provider_user_id = '777001'
  `).get() as { userId: string } | undefined;
  assert.ok(identity);

  const session = database.sqlite.prepare(`
    SELECT user_id AS userId, token_hash AS tokenHash
    FROM auth_sessions
  `).get() as { userId: string; tokenHash: string } | undefined;
  assert.ok(session);
  assert.equal(session.userId, identity.userId);
  assert.equal(session.tokenHash, `sha256:${createHash("sha256").update(sessionToken).digest("hex")}`);
  assert.notEqual(session.tokenHash, sessionToken);

  const protectedResponse = await server.inject({
    method: "GET",
    url: "/api/v1/scenarios/foundation-false-breakout-001",
    headers: { cookie }
  });
  assert.equal(protectedResponse.statusCode, 200);

  const unauthenticatedResponse = await server.inject({
    method: "GET",
    url: "/api/v1/scenarios/foundation-false-breakout-001"
  });
  assert.equal(unauthenticatedResponse.statusCode, 401);
  assert.match(protectedResponse.headers["x-request-id"]?.toString() ?? "", /^req-/);
  assert.match(protectedResponse.headers["content-security-policy"]?.toString() ?? "", /frame-ancestors 'none'/);

  const missingCsrfResponse = await server.inject({
    method: "POST",
    url: "/api/v1/scenario-runs",
    headers: { cookie },
    payload: {
      scenarioId: "foundation-false-breakout-001",
      scenarioVersion: "1.0.0",
      idempotencyKey: "csrf-missing-001"
    }
  });
  assert.equal(missingCsrfResponse.statusCode, 403);

  const startResponse = await server.inject({
    method: "POST",
    url: "/api/v1/scenario-runs",
    headers: { cookie, "x-sa-csrf": csrfToken },
    payload: {
      scenarioId: "foundation-false-breakout-001",
      scenarioVersion: "1.0.0",
      idempotencyKey: "csrf-valid-001"
    }
  });
  assert.equal(startResponse.statusCode, 201);

  const logoutResponse = await server.inject({
    method: "POST",
    url: "/api/v1/auth/logout",
    headers: { cookie, "x-sa-csrf": csrfToken }
  });
  assert.equal(logoutResponse.statusCode, 204);
  assert.match(logoutResponse.headers["set-cookie"]?.toString() ?? "", /Max-Age=0/);

  const revokedResponse = await server.inject({
    method: "GET",
    url: "/api/v1/scenarios/foundation-false-breakout-001",
    headers: { cookie }
  });
  assert.equal(revokedResponse.statusCode, 401);

  const revokedSession = database.sqlite.prepare(`
    SELECT revoked_at AS revokedAt
    FROM auth_sessions
    WHERE token_hash = ?
  `).get(`sha256:${createHash("sha256").update(sessionToken).digest("hex")}`) as {
    revokedAt: string | null;
  } | undefined;
  assert.ok(revokedSession?.revokedAt);

  await server.close();
});

test("Telegram auth rejects replayed, tampered and expired initialization data", async () => {
  const createAuthServer = () => buildServer({
    authMode: "telegram",
    telegramBotToken: BOT_TOKEN,
    now: () => NOW_MS
  });

  const replayServer = createAuthServer();
  const initData = signedInitData();
  const firstResponse = await replayServer.inject({
    method: "POST",
    url: "/api/v1/auth/telegram",
    payload: { initData }
  });
  const replayResponse = await replayServer.inject({
    method: "POST",
    url: "/api/v1/auth/telegram",
    payload: { initData }
  });
  assert.equal(firstResponse.statusCode, 201);
  assert.equal(replayResponse.statusCode, 401);
  assert.equal(replayResponse.json<{ error: string }>().error, "replayed_init_data");
  await replayServer.close();

  const tamperedServer = createAuthServer();
  const tampered = initData.replace(/hash=[^&]+/, `hash=${"0".repeat(64)}`);
  const tamperedResponse = await tamperedServer.inject({
    method: "POST",
    url: "/api/v1/auth/telegram",
    payload: { initData: tampered }
  });
  assert.equal(tamperedResponse.statusCode, 401);
  assert.equal(tamperedResponse.json<{ error: string }>().error, "invalid_init_data");
  await tamperedServer.close();

  const expiredServer = createAuthServer();
  const expiredResponse = await expiredServer.inject({
    method: "POST",
    url: "/api/v1/auth/telegram",
    payload: { initData: signedInitData({ authDateSeconds: AUTH_DATE_SECONDS - 86_401 }) }
  });
  assert.equal(expiredResponse.statusCode, 401);
  assert.equal(expiredResponse.json<{ error: string }>().error, "expired_init_data");
  await expiredServer.close();
});

test("Telegram auth rate limit is enforced per server boundary", async () => {
  const server = buildServer({
    authMode: "telegram",
    telegramBotToken: BOT_TOKEN,
    authRateLimitPerMinute: 1,
    now: () => NOW_MS
  });

  const firstResponse = await server.inject({
    method: "POST",
    url: "/api/v1/auth/telegram",
    payload: { initData: "not-used" }
  });
  const secondResponse = await server.inject({
    method: "POST",
    url: "/api/v1/auth/telegram",
    payload: { initData: signedInitData({ userId: 777002 }) }
  });

  assert.equal(firstResponse.statusCode, 401);
  assert.equal(secondResponse.statusCode, 429);
  assert.equal(secondResponse.json<{ error: string }>().error, "rate_limited");
  assert.ok(secondResponse.headers["retry-after"]);
  await server.close();
});
