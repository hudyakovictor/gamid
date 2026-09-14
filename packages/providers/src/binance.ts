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
  timeoutMs?: number;
  maxResponseBytes?: number;
};

export class ProviderAdapterError extends Error {
  public readonly code:
  | "invalid_provider_configuration"
  | "invalid_request"
  | "provider_http_error"
  | "provider_response_too_large"
  | "provider_invalid_response"
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

function normalizeCandles(
  rows: unknown[][],
  asOfMs: number
): HistoricalCandle[] {
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
  private readonly timeoutMs: number;
  private readonly maxResponseBytes: number;

  constructor(options: BinanceKlinesAdapterOptions = {}) {
    this.fetchImplementation = options.fetchImplementation ?? fetch;
    this.baseUrl = assertBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
    this.now = options.now ?? Date.now;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxResponseBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;

    if (!Number.isSafeInteger(this.timeoutMs) || this.timeoutMs < 1) {
      throw new ProviderAdapterError("invalid_provider_configuration");
    }
    if (!Number.isSafeInteger(this.maxResponseBytes) || this.maxResponseBytes < 1) {
      throw new ProviderAdapterError("invalid_provider_configuration");
    }
  }

  async fetchSnapshot(request: BinanceKlinesRequest): Promise<HistoricalMarketSnapshot> {
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

    const asOf = new Date(asOfMs).toISOString();
    const url = new URL("/api/v3/klines", this.baseUrl);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", request.interval);
    url.searchParams.set("endTime", String(asOfMs));
    url.searchParams.set("limit", String(limit));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetchImplementation(url, {
        method: "GET",
        headers: { accept: "application/json" },
        redirect: "error",
        signal: controller.signal
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new ProviderAdapterError("provider_timeout");
      }
      throw new ProviderAdapterError(
        "provider_http_error",
        error instanceof Error ? error.message : "provider request failed"
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new ProviderAdapterError("provider_http_error");
    }

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

    const candles = normalizeCandles(readBoundedJsonValue(parsed), asOfMs);
    const contentHash = `sha256:${createHash("sha256")
      .update(JSON.stringify(candles))
      .digest("hex")}`;
    const availableAt = new Date(this.now()).toISOString();

    return HistoricalMarketSnapshotSchema.parse({
      provider: "binance",
      symbol,
      interval: request.interval,
      asOf,
      candles,
      provenance: {
        sourceReference: url.toString(),
        observedAt: asOf,
        availableAt,
        timezone: "UTC",
        reliability: "high",
        contentHash,
        revisionStatus: "original"
      }
    });
  }
}
