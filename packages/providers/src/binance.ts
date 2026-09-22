import { createHash } from "node:crypto";

import {
  HistoricalMarketSnapshotSchema,
  type HistoricalCandle,
  type HistoricalMarketSnapshot
} from "../../contracts/src/index.js";

const BINANCE_HOST = "api.binance.com";
const DEFAULT_BASE_URL = "https://api.binance.com";
const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_RESPONSE_BYTES = 2_000_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_BASE_MS = 250;
const DEFAULT_RETRY_MAX_MS = 5_000;
const ALLOWED_INTERVALS = new Set([
  "1s",
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "6h",
  "8h",
  "12h",
  "1d",
  "3d",
  "1w",
  "1M"
]);

type FetchImplementation = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export type BinanceKlinesRequest = {
  symbol: string;
  interval: string;
  asOf: string;
  limit?: number;
};

export type BinanceKlinesAdapterOptions = {
  fetchImplementation?: FetchImplementation;
  baseUrl?: string;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
  maxResponseBytes?: number;
  /** Total attempts per fetch (1 = no retries). Default 3. */
  maxAttempts?: number;
  /** Base backoff between attempts (doubles per attempt). Default 250ms. */
  retryBaseMs?: number;
  /** Cap for any single backoff/Retry-After wait. Default 5000ms. */
  retryMaxMs?: number;
  /**
   * Minimum spacing between request starts (client-side rate limiting).
   * Default 0 (disabled). Concurrent callers are serialized FIFO.
   */
  minIntervalMs?: number;
};

export type BinanceFetchOptions = {
  /** External cancellation signal (operator abort). */
  signal?: AbortSignal | undefined;
};

export class ProviderAdapterError extends Error {
  public readonly code:
  | "invalid_provider_configuration"
  | "invalid_request"
  | "provider_http_error"
  | "provider_rate_limited"
  | "provider_response_too_large"
  | "provider_invalid_response"
  | "provider_cancelled"
  | "provider_timeout";

  constructor(
    code: ProviderAdapterError["code"],
    message: string = code
  ) {
    super(message);
    this.name = "ProviderAdapterError";
    this.code = code;
  }
}

function assertBaseUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ProviderAdapterError("invalid_provider_configuration");
  }

  if (url.protocol !== "https:" || url.hostname !== BINANCE_HOST || url.port) {
    throw new ProviderAdapterError("invalid_provider_configuration");
  }

  return url;
}

function readInteger(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new ProviderAdapterError("provider_invalid_response");
  }
  return number;
}

function readDecimal(value: unknown): string {
  const decimal = String(value);
  if (!/^(0|[1-9][0-9]*)(\.[0-9]+)?$/u.test(decimal)) {
    throw new ProviderAdapterError("provider_invalid_response");
  }
  return decimal;
}

function readBoundedJsonValue(value: unknown): unknown[][] {
  if (!Array.isArray(value)) {
    throw new ProviderAdapterError("provider_invalid_response");
  }

  return value.map((row) => {
    if (!Array.isArray(row) || row.length < 7) {
      throw new ProviderAdapterError("provider_invalid_response");
    }
    return row;
  });
}

async function readBoundedText(
  response: Response,
  maxBytes: number
): Promise<string> {
  if (!response.body) {
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > maxBytes) {
      throw new ProviderAdapterError("provider_response_too_large");
    }
    return text;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const result = await reader.read();
      if (result.done) {
        break;
      }

      totalBytes += result.value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new ProviderAdapterError("provider_response_too_large");
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new ProviderAdapterError("provider_cancelled");
  }
}

/**
 * Parse a Retry-After value (delay seconds or HTTP date) into a bounded
 * millisecond wait. Returns undefined when absent/unparseable so the caller
 * falls back to exponential backoff.
 */
function parseRetryAfterMs(value: string | null, nowMs: number, capMs: number): number | undefined {
  if (value === null) return undefined;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    return Math.min(Number(trimmed) * 1000, capMs);
  }
  const dateMs = Date.parse(trimmed);
  if (Number.isSafeInteger(dateMs)) {
    return Math.min(Math.max(dateMs - nowMs, 0), capMs);
  }
  return undefined;
}

function normalizeCandles(
  rows: unknown[][],
  asOfMs: number,
  limit: number
): HistoricalCandle[] {
  // Defensive bound: the provider must not return more rows than requested.
  if (rows.length > limit) {
    throw new ProviderAdapterError("provider_invalid_response");
  }
  const candles: HistoricalCandle[] = [];
  let previousOpenMs = -1;

  for (const row of rows) {
    const openMs = readInteger(row[0]);
    const closeMs = readInteger(row[6]);
    if (openMs <= previousOpenMs || closeMs < openMs || closeMs > asOfMs) {
      throw new ProviderAdapterError("provider_invalid_response");
    }
    previousOpenMs = openMs;

    candles.push({
      openTime: new Date(openMs).toISOString(),
      closeTime: new Date(closeMs).toISOString(),
      open: readDecimal(row[1]),
      high: readDecimal(row[2]),
      low: readDecimal(row[3]),
      close: readDecimal(row[4]),
      volume: readDecimal(row[5])
    });
  }

  if (candles.length === 0) {
    throw new ProviderAdapterError("provider_invalid_response");
  }
  return candles;
}

export class BinanceKlinesAdapter {
  private readonly fetchImplementation: FetchImplementation;
  private readonly baseUrl: URL;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly timeoutMs: number;
  private readonly maxResponseBytes: number;
  private readonly maxAttempts: number;
  private readonly retryBaseMs: number;
  private readonly retryMaxMs: number;
  private readonly minIntervalMs: number;
  private slotChain: Promise<void> = Promise.resolve();
  private nextAllowedAt = 0;

  constructor(options: BinanceKlinesAdapterOptions = {}) {
    this.fetchImplementation = options.fetchImplementation ?? fetch;
    this.baseUrl = assertBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
    this.now = options.now ?? Date.now;
    this.sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    }));
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxResponseBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.retryBaseMs = options.retryBaseMs ?? DEFAULT_RETRY_BASE_MS;
    this.retryMaxMs = options.retryMaxMs ?? DEFAULT_RETRY_MAX_MS;
    this.minIntervalMs = options.minIntervalMs ?? 0;

    if (!Number.isSafeInteger(this.timeoutMs) || this.timeoutMs < 1) {
      throw new ProviderAdapterError("invalid_provider_configuration");
    }
    if (!Number.isSafeInteger(this.maxResponseBytes) || this.maxResponseBytes < 1) {
      throw new ProviderAdapterError("invalid_provider_configuration");
    }
    if (!Number.isSafeInteger(this.maxAttempts) || this.maxAttempts < 1) {
      throw new ProviderAdapterError("invalid_provider_configuration");
    }
    if (!Number.isSafeInteger(this.retryBaseMs) || this.retryBaseMs < 0) {
      throw new ProviderAdapterError("invalid_provider_configuration");
    }
    if (!Number.isSafeInteger(this.retryMaxMs) || this.retryMaxMs < 0) {
      throw new ProviderAdapterError("invalid_provider_configuration");
    }
    if (!Number.isSafeInteger(this.minIntervalMs) || this.minIntervalMs < 0) {
      throw new ProviderAdapterError("invalid_provider_configuration");
    }
  }

  /**
   * Abortable wait that always releases its queue slot. Used for backoff and
   * rate-limit spacing; never swallows cancellation.
   */
  private async delay(ms: number, signal: AbortSignal | undefined): Promise<void> {
    throwIfAborted(signal);
    if (ms <= 0) return;
    await new Promise<void>((resolve, reject) => {
      const onAbort = (): void => {
        signal?.removeEventListener("abort", onAbort);
        reject(new ProviderAdapterError("provider_cancelled"));
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      this.sleep(ms).then(
        () => {
          signal?.removeEventListener("abort", onAbort);
          resolve();
        },
        (error: unknown) => {
          signal?.removeEventListener("abort", onAbort);
          reject(error instanceof Error ? error : new Error("sleep failed"));
        }
      );
    });
  }

  /** FIFO request spacing for client-side rate limiting (noop when disabled). */
  private async waitForSlot(signal: AbortSignal | undefined): Promise<void> {
    throwIfAborted(signal);
    if (this.minIntervalMs <= 0) return;
    const previous = this.slotChain;
    let release = (): void => {};
    this.slotChain = new Promise<void>((resolve) => {
      release = resolve;
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const onAbort = (): void => {
          signal?.removeEventListener("abort", onAbort);
          reject(new ProviderAdapterError("provider_cancelled"));
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        previous.then(
          () => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
          },
          () => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
          }
        );
      });
      const waitMs = this.nextAllowedAt - this.now();
      if (waitMs > 0) {
        await this.delay(waitMs, signal);
      }
      this.nextAllowedAt = this.now() + this.minIntervalMs;
    } finally {
      release();
    }
  }

  private async attemptFetch(url: URL, signal: AbortSignal | undefined): Promise<Response> {
    const controller = new AbortController();
    const onExternalAbort = (): void => controller.abort();
    signal?.addEventListener("abort", onExternalAbort, { once: true });
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetchImplementation(url, {
        method: "GET",
        headers: { accept: "application/json" },
        redirect: "error",
        signal: controller.signal
      });
    } catch {
      // Sanitized: never propagate fetch internals (URLs, DNS/proxy detail).
      if (signal?.aborted) {
        throw new ProviderAdapterError("provider_cancelled");
      }
      if (controller.signal.aborted) {
        throw new ProviderAdapterError("provider_timeout");
      }
      throw new ProviderAdapterError("provider_http_error");
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onExternalAbort);
    }
  }

  async fetchSnapshot(
    request: BinanceKlinesRequest,
    fetchOptions: BinanceFetchOptions = {}
  ): Promise<HistoricalMarketSnapshot> {
    const symbol = request.symbol.toUpperCase();
    const asOfMs = Date.parse(request.asOf);
    const limit = request.limit ?? 500;
    if (
      !/^[A-Z0-9]{2,20}$/u.test(symbol)
      || !ALLOWED_INTERVALS.has(request.interval)
      || !Number.isSafeInteger(asOfMs)
      || !Number.isSafeInteger(limit)
      || limit < 1
      || limit > 1_000
    ) {
      throw new ProviderAdapterError("invalid_request");
    }
    const signal = fetchOptions.signal;
    throwIfAborted(signal);

    const asOf = new Date(asOfMs).toISOString();
    const url = new URL("/api/v3/klines", this.baseUrl);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", request.interval);
    url.searchParams.set("endTime", String(asOfMs));
    url.searchParams.set("limit", String(limit));

    await this.waitForSlot(signal);

    let attempt = 0;
    let lastError: ProviderAdapterError = new ProviderAdapterError("provider_http_error");
    while (attempt < this.maxAttempts) {
      attempt += 1;
      throwIfAborted(signal);
      let response: Response;
      try {
        response = await this.attemptFetch(url, signal);
      } catch (error) {
        if (!(error instanceof ProviderAdapterError)) throw error;
        // Timeouts and transport failures are retryable (idempotent GET);
        // cancellation is terminal.
        if (error.code === "provider_cancelled" || attempt >= this.maxAttempts) {
          throw error;
        }
        lastError = error;
        await this.delay(Math.min(this.retryBaseMs * 2 ** (attempt - 1), this.retryMaxMs), signal);
        continue;
      }

      if (response.status === 429) {
        lastError = new ProviderAdapterError("provider_rate_limited");
        if (attempt >= this.maxAttempts) {
          throw lastError;
        }
        const retryAfterMs = parseRetryAfterMs(
          response.headers.get("retry-after"),
          this.now(),
          this.retryMaxMs
        ) ?? Math.min(this.retryBaseMs * 2 ** (attempt - 1), this.retryMaxMs);
        await response.body?.cancel().catch(() => {});
        await this.delay(retryAfterMs, signal);
        continue;
      }

      if (response.status >= 500 && response.status <= 599) {
        lastError = new ProviderAdapterError("provider_http_error");
        if (attempt >= this.maxAttempts) {
          throw lastError;
        }
        await response.body?.cancel().catch(() => {});
        await this.delay(Math.min(this.retryBaseMs * 2 ** (attempt - 1), this.retryMaxMs), signal);
        continue;
      }

      if (!response.ok) {
        // Other 4xx/3xx: deterministic failure, never retried.
        throw new ProviderAdapterError("provider_http_error");
      }

      return await this.readSnapshot(response, { symbol, interval: request.interval, asOf, asOfMs, limit, url });
    }
    throw lastError;
  }

  /** Parse + validate a 200 response (never retried: bytes already bounded). */
  private async readSnapshot(
    response: Response,
    context: {
      symbol: string;
      interval: string;
      asOf: string;
      asOfMs: number;
      limit: number;
      url: URL;
    }
  ): Promise<HistoricalMarketSnapshot> {

    const contentType = response.headers.get("content-type");
    if (contentType && !contentType.toLowerCase().includes("application/json")) {
      throw new ProviderAdapterError("provider_invalid_response");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(await readBoundedText(response, this.maxResponseBytes)) as unknown;
    } catch (error) {
      if (error instanceof ProviderAdapterError) {
        throw error;
      }
      throw new ProviderAdapterError("provider_invalid_response");
    }

    const candles = normalizeCandles(readBoundedJsonValue(parsed), context.asOfMs, context.limit);
    const contentHash = `sha256:${createHash("sha256")
      .update(JSON.stringify(candles))
      .digest("hex")}`;
    const availableAt = new Date(this.now()).toISOString();

    return HistoricalMarketSnapshotSchema.parse({
      provider: "binance",
      symbol: context.symbol,
      interval: context.interval,
      asOf: context.asOf,
      candles,
      provenance: {
        sourceReference: context.url.toString(),
        observedAt: context.asOf,
        availableAt,
        timezone: "UTC",
        reliability: "high",
        contentHash,
        revisionStatus: "original"
      }
    });
  }
}
