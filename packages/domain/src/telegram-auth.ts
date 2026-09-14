import { createHmac, timingSafeEqual } from "node:crypto";

import {
  AuthIdentitySchema,
  TelegramUserSchema,
  type AuthIdentity,
  type TelegramUser
} from "../../contracts/src/index.js";

type TelegramAuthVerificationOptions = {
  botToken: string;
  nowMs?: number;
  maxAgeSeconds?: number;
  clockSkewSeconds?: number;
};

export type TelegramAuthOptions = TelegramAuthVerificationOptions & {
  replayGuard: TelegramInitDataReplayGuard;
};

export type TelegramAuthAsyncOptions = TelegramAuthVerificationOptions & {
  replayGuard: TelegramInitDataAsyncReplayGuard;
};

export interface TelegramInitDataReplayGuard {
  consume(key: string, expiresAtMs: number): boolean;
}

export interface TelegramInitDataAsyncReplayGuard {
  consume(key: string, expiresAtMs: number): Promise<boolean>;
}

export type VerifiedTelegramIdentity = {
  identity: AuthIdentity;
  user: TelegramUser;
  hash: string;
  expiresAtMs: number;
};

export type TelegramAuthErrorCode =
  | "invalid_init_data"
  | "expired_init_data"
  | "replayed_init_data";

export class TelegramAuthError extends Error {
  public readonly code: TelegramAuthErrorCode;

  constructor(code: TelegramAuthErrorCode) {
    super(code);
    this.name = "TelegramAuthError";
    this.code = code;
  }
}

function invalidInitData(): never {
  throw new TelegramAuthError("invalid_init_data");
}

function readSingleParameter(params: URLSearchParams, key: string): string {
  const values = params.getAll(key);
  if (values.length !== 1 || !values[0]) {
    return invalidInitData();
  }
  return values[0];
}

function hasValidHash(expectedHash: string, receivedHash: string): boolean {
  const expected = Buffer.from(expectedHash, "hex");
  const received = Buffer.from(receivedHash, "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function prepareVerifiedTelegramIdentity(
  initData: string,
  options: TelegramAuthVerificationOptions
): VerifiedTelegramIdentity {
  if (!options.botToken || !initData.trim()) {
    return invalidInitData();
  }

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return invalidInitData();
  }

  const receivedHash = readSingleParameter(params, "hash");
  if (!/^[a-f0-9]{64}$/i.test(receivedHash)) {
    return invalidInitData();
  }

  const authDateValue = readSingleParameter(params, "auth_date");
  const userValue = readSingleParameter(params, "user");
  if (!/^[0-9]+$/.test(authDateValue)) {
    return invalidInitData();
  }

  const authDateSeconds = Number(authDateValue);
  const nowMs = options.nowMs ?? Date.now();
  const maxAgeSeconds = options.maxAgeSeconds ?? 86_400;
  const clockSkewSeconds = options.clockSkewSeconds ?? 60;
  if (!Number.isSafeInteger(authDateSeconds) || authDateSeconds <= 0) {
    return invalidInitData();
  }

  const authDateMs = authDateSeconds * 1_000;
  const expiresAtMs = authDateMs + maxAgeSeconds * 1_000;
  if (
    authDateMs > nowMs + clockSkewSeconds * 1_000
    || nowMs > expiresAtMs
  ) {
    throw new TelegramAuthError("expired_init_data");
  }

  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData")
    .update(options.botToken)
    .digest();
  const expectedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (!hasValidHash(expectedHash, receivedHash)) {
    return invalidInitData();
  }

  let parsedUser: unknown;
  try {
    parsedUser = JSON.parse(userValue) as unknown;
  } catch {
    return invalidInitData();
  }

  const user = TelegramUserSchema.safeParse(parsedUser);
  if (!user.success) {
    return invalidInitData();
  }

  const identity = AuthIdentitySchema.parse({
    provider: "telegram",
    providerUserId: String(user.data.id),
    authDate: new Date(authDateMs).toISOString()
  });

  return {
    identity,
    user: user.data,
    hash: receivedHash,
    expiresAtMs
  };
}

export function verifyTelegramInitData(
  initData: string,
  options: TelegramAuthOptions
): VerifiedTelegramIdentity {
  const verified = prepareVerifiedTelegramIdentity(initData, options);
  if (!options.replayGuard.consume(verified.hash, verified.expiresAtMs)) {
    throw new TelegramAuthError("replayed_init_data");
  }
  return verified;
}

export async function verifyTelegramInitDataAsync(
  initData: string,
  options: TelegramAuthAsyncOptions
): Promise<VerifiedTelegramIdentity> {
  const verified = prepareVerifiedTelegramIdentity(initData, options);
  if (!(await options.replayGuard.consume(verified.hash, verified.expiresAtMs))) {
    throw new TelegramAuthError("replayed_init_data");
  }
  return verified;
}
