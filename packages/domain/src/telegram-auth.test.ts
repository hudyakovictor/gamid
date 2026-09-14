import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import {
  TelegramAuthError,
  type TelegramInitDataReplayGuard,
  verifyTelegramInitData,
  verifyTelegramInitDataAsync
} from "./telegram-auth.js";

const BOT_TOKEN = "123456:development-only-test-token";
const NOW_MS = Date.parse("2026-09-14T12:00:00.000Z");
const AUTH_DATE_SECONDS = Math.floor(NOW_MS / 1_000) - 120;

class MemoryReplayGuard implements TelegramInitDataReplayGuard {
  private readonly consumed = new Set<string>();

  consume(key: string): boolean {
    if (this.consumed.has(key)) {
      return false;
    }
    this.consumed.add(key);
    return true;
  }
}

function signedInitData(overrides: Record<string, string> = {}): string {
  const params = new URLSearchParams({
    auth_date: String(AUTH_DATE_SECONDS),
    query_id: "AAH-test-query",
    user: JSON.stringify({
      id: 777001,
      first_name: "Signal",
      username: "signal_tester",
      language_code: "en"
    }),
    ...overrides
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

function verify(initData: string, replayGuard = new MemoryReplayGuard()) {
  return verifyTelegramInitData(initData, {
    botToken: BOT_TOKEN,
    nowMs: NOW_MS,
    replayGuard
  });
}

test("verifies Telegram init data and returns a platform-neutral identity", () => {
  const result = verify(signedInitData());

  assert.deepEqual(result.identity, {
    provider: "telegram",
    providerUserId: "777001",
    authDate: "2026-09-14T11:58:00.000Z"
  });
  assert.equal(result.user.first_name, "Signal");
  assert.equal(result.hash.length, 64);
});

test("rejects a tampered hash without exposing the bot token", () => {
  const tampered = `${signedInitData()}0`;

  assert.throws(
    () => verify(tampered),
    (error: unknown) => error instanceof TelegramAuthError && error.code === "invalid_init_data"
  );
});

test("rejects expired init data before replay consumption", () => {
  const replayGuard = new MemoryReplayGuard();
  const initData = signedInitData();

  assert.throws(
    () => verifyTelegramInitData(initData, {
      botToken: BOT_TOKEN,
      nowMs: NOW_MS + 86_401_000,
      replayGuard
    }),
    (error: unknown) => error instanceof TelegramAuthError && error.code === "expired_init_data"
  );
  assert.doesNotThrow(() => verify(initData, replayGuard));
});

test("rejects replayed init data through the required replay guard", () => {
  const replayGuard = new MemoryReplayGuard();
  const initData = signedInitData();

  assert.doesNotThrow(() => verify(initData, replayGuard));
  assert.throws(
    () => verify(initData, replayGuard),
    (error: unknown) => error instanceof TelegramAuthError && error.code === "replayed_init_data"
  );
});

test("rejects malformed user payload even when the signature is valid", () => {
  const initData = signedInitData({ user: "not-json" });

  assert.throws(
    () => verify(initData),
    (error: unknown) => error instanceof TelegramAuthError && error.code === "invalid_init_data"
  );
});

test("async Telegram verification supports a shared replay store", async () => {
  const initData = signedInitData();
  const consumed: string[] = [];
  const result = await verifyTelegramInitDataAsync(initData, {
    botToken: BOT_TOKEN,
    nowMs: NOW_MS,
    replayGuard: {
      consume: async (key) => {
        consumed.push(key);
        return true;
      }
    }
  });

  assert.equal(result.identity.providerUserId, "777001");
  assert.deepEqual(consumed, [result.hash]);
});
