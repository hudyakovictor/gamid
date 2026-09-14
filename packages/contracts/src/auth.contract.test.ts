import assert from "node:assert/strict";
import test from "node:test";

import {
  AuthIdentitySchema,
  TelegramAuthRequestSchema,
  TelegramUserSchema
} from "./auth.js";

test("Telegram auth request is bounded and strict", () => {
  assert.deepEqual(
    TelegramAuthRequestSchema.parse({ initData: "auth_date=1&hash=test" }),
    { initData: "auth_date=1&hash=test" }
  );
  assert.throws(() => TelegramAuthRequestSchema.parse({ initData: "" }));
  assert.throws(() => TelegramAuthRequestSchema.parse({ initData: "x", userId: "client" }));
});

test("Telegram user and platform-neutral identity schemas validate canonical fields", () => {
  const user = TelegramUserSchema.parse({
    id: 777001,
    first_name: "Signal",
    language_code: "en",
    futureTelegramField: true
  });
  const identity = AuthIdentitySchema.parse({
    provider: "telegram",
    providerUserId: String(user.id),
    authDate: "2026-09-14T12:00:00.000Z"
  });

  assert.equal(user.id, 777001);
  assert.equal(identity.providerUserId, "777001");
});
