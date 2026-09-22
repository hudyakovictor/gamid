import assert from "node:assert/strict";
import test from "node:test";

import {
  BinanceKlinesAdapter,
  ProviderAdapterError
} from "./binance.js";

const NOW_MS = Date.parse("2026-09-14T12:00:00.000Z");

function response(payload: unknown, headers: Record<string, string> = {
  "content-type": "application/json"
}): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers
  });
}

function kline(openMs: number, closeMs: number, close = "101"): unknown[] {
  return [
    String(openMs),
    "100",
    "102",
    "99",
    close,
    "42.5",
    String(closeMs),
    "0",
    1,
    "0",
    "0",
    "0"
  ];
}

test("Binance adapter normalizes bounded historical klines with provenance hash", async () => {
  const adapter = new BinanceKlinesAdapter({
    now: () => NOW_MS,
    fetchImplementation: async (input) => {
      assert.equal(new URL(input.toString()).hostname, "api.binance.com");
      return response([
        kline(Date.parse("2026-09-14T10:00:00.000Z"), Date.parse("2026-09-14T10:59:59.999Z")),
        kline(Date.parse("2026-09-14T11:00:00.000Z"), Date.parse("2026-09-14T11:59:59.999Z"), "103")
      ]);
    }
  });

  const snapshot = await adapter.fetchSnapshot({
    symbol: "btcusdt",
    interval: "1h",
    asOf: "2026-09-14T12:00:00.000Z"
  });

  assert.equal(snapshot.provider, "binance");
  assert.equal(snapshot.symbol, "BTCUSDT");
  assert.equal(snapshot.candles.length, 2);
  assert.match(snapshot.provenance.contentHash, /^sha256:[a-f0-9]{64}$/);
  assert.match(snapshot.provenance.sourceReference, /symbol=BTCUSDT/);
});

test("Binance adapter rejects future candles and non-allowlisted provider URLs", async () => {
  const adapter = new BinanceKlinesAdapter({
    fetchImplementation: async () => response([
      kline(Date.parse("2026-09-14T11:00:00.000Z"), Date.parse("2026-09-14T12:00:00.001Z"))
    ])
  });

  await assert.rejects(
    () => adapter.fetchSnapshot({
      symbol: "BTCUSDT",
      interval: "1h",
      asOf: "2026-09-14T12:00:00.000Z"
    }),
    (error: unknown) => error instanceof ProviderAdapterError
      && error.code === "provider_invalid_response"
  );

  assert.throws(
    () => new BinanceKlinesAdapter({ baseUrl: "http://api.binance.com" }),
    (error: unknown) => error instanceof ProviderAdapterError
      && error.code === "invalid_provider_configuration"
  );
  assert.throws(
    () => new BinanceKlinesAdapter({ baseUrl: "https://example.com" }),
    (error: unknown) => error instanceof ProviderAdapterError
      && error.code === "invalid_provider_configuration"
  );
});

test("Binance adapter retries 429/5xx with backoff and honors Retry-After", async () => {
  const sleeps: number[] = [];
  let calls = 0;
  const adapter = new BinanceKlinesAdapter({
    now: () => NOW_MS,
    sleep: async (ms: number) => {
      sleeps.push(ms);
    },
    retryBaseMs: 100,
    retryMaxMs: 10_000,
    fetchImplementation: async () => {
      calls += 1;
      if (calls === 1) {
        return new Response("{}", { status: 429, headers: { "retry-after": "2" } });
      }
      if (calls === 2) {
        return new Response("boom", { status: 503 });
      }
      return response([
        kline(Date.parse("2026-09-14T10:00:00.000Z"), Date.parse("2026-09-14T10:59:59.999Z"))
      ]);
    }
  });

  const snapshot = await adapter.fetchSnapshot({
    symbol: "BTCUSDT",
    interval: "1h",
    asOf: "2026-09-14T12:00:00.000Z"
  });
  assert.equal(calls, 3);
  assert.equal(snapshot.candles.length, 1);
  // Retry-After: 2s honored for the 429; exponential backoff for the 503.
  assert.deepEqual(sleeps, [2000, 200]);
});

test("Binance adapter surfaces rate limiting distinctly after retries exhaust", async () => {
  let calls = 0;
  const adapter = new BinanceKlinesAdapter({
    now: () => NOW_MS,
    sleep: async () => {},
    retryBaseMs: 0,
    maxAttempts: 2,
    fetchImplementation: async () => {
      calls += 1;
      return new Response("{}", { status: 429 });
    }
  });
  await assert.rejects(
    () => adapter.fetchSnapshot({ symbol: "BTCUSDT", interval: "1h", asOf: "2026-09-14T12:00:00.000Z" }),
    (error: unknown) => error instanceof ProviderAdapterError
      && error.code === "provider_rate_limited"
      && error.message === "provider_rate_limited"
  );
  assert.equal(calls, 2);
});

test("Binance adapter never retries deterministic failures (4xx, invalid body, oversize)", async () => {
  for (const behavior of ["http-400", "invalid-json", "too-large"] as const) {
    let calls = 0;
    const adapter = new BinanceKlinesAdapter({
      now: () => NOW_MS,
      sleep: async () => {},
      maxResponseBytes: behavior === "too-large" ? 8 : 2_000_000,
      fetchImplementation: async () => {
        calls += 1;
        if (behavior === "http-400") return new Response("nope", { status: 400 });
        if (behavior === "too-large") return response([[`row-${"x".repeat(64)}`]]);
        return response({ not: "an-array" });
      }
    });
    await assert.rejects(
      () => adapter.fetchSnapshot({ symbol: "BTCUSDT", interval: "1h", asOf: "2026-09-14T12:00:00.000Z" }),
      (error: unknown) => error instanceof ProviderAdapterError
        && (behavior === "too-large"
          ? error.code === "provider_response_too_large"
          : behavior === "http-400"
            ? error.code === "provider_http_error"
            : error.code === "provider_invalid_response")
    );
    assert.equal(calls, 1, behavior);
  }
});

test("Binance adapter rejects more rows than requested and sanitizes transport errors", async () => {
  const overLimit = new BinanceKlinesAdapter({
    now: () => NOW_MS,
    fetchImplementation: async () => response([
      kline(Date.parse("2026-09-14T10:00:00.000Z"), Date.parse("2026-09-14T10:59:59.999Z")),
      kline(Date.parse("2026-09-14T11:00:00.000Z"), Date.parse("2026-09-14T11:59:59.999Z"))
    ])
  });
  await assert.rejects(
    () => overLimit.fetchSnapshot({ symbol: "BTCUSDT", interval: "1h", asOf: "2026-09-14T12:00:00.000Z", limit: 1 }),
    (error: unknown) => error instanceof ProviderAdapterError
      && error.code === "provider_invalid_response"
  );

  const leaky = new BinanceKlinesAdapter({
    now: () => NOW_MS,
    sleep: async () => {},
    maxAttempts: 1,
    fetchImplementation: async () => {
      throw new Error("getaddrinfo ENOTFOUND internal-proxy.corp:8080 for https://api.binance.com/api/v3/klines?symbol=BTCUSDT");
    }
  });
  await assert.rejects(
    () => leaky.fetchSnapshot({ symbol: "BTCUSDT", interval: "1h", asOf: "2026-09-14T12:00:00.000Z" }),
    (error: unknown) => error instanceof ProviderAdapterError
      && error.code === "provider_http_error"
      && error.message === "provider_http_error"
      && !String(error.stack).includes("internal-proxy")
  );
});

test("Binance adapter honors external cancellation (queued, in-flight, backing off)", async () => {
  // Already-aborted signal fails before any fetch.
  let calls = 0;
  const preCancelled = new BinanceKlinesAdapter({
    fetchImplementation: async () => {
      calls += 1;
      return response([]);
    }
  });
  const aborted = new AbortController();
  aborted.abort();
  await assert.rejects(
    () => preCancelled.fetchSnapshot(
      { symbol: "BTCUSDT", interval: "1h", asOf: "2026-09-14T12:00:00.000Z" },
      { signal: aborted.signal }
    ),
    (error: unknown) => error instanceof ProviderAdapterError && error.code === "provider_cancelled"
  );
  assert.equal(calls, 0);

  // Abort while a fetch is in flight surfaces cancellation, not timeout.
  const inFlight = new AbortController();
  const hanging = new BinanceKlinesAdapter({
    timeoutMs: 60_000,
    fetchImplementation: async (_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    })
  });
  const pending = inFlight.signal;
  const flight = hanging.fetchSnapshot(
    { symbol: "BTCUSDT", interval: "1h", asOf: "2026-09-14T12:00:00.000Z" },
    { signal: pending }
  );
  inFlight.abort();
  await assert.rejects(
    () => flight,
    (error: unknown) => error instanceof ProviderAdapterError && error.code === "provider_cancelled"
  );

  // Abort during backoff stops retrying promptly.
  let backoffCalls = 0;
  const backoff = new AbortController();
  const retrying = new BinanceKlinesAdapter({
    now: () => NOW_MS,
    retryBaseMs: 60_000,
    fetchImplementation: async () => {
      backoffCalls += 1;
      backoff.abort();
      return new Response("{}", { status: 429 });
    }
  });
  await assert.rejects(
    () => retrying.fetchSnapshot(
      { symbol: "BTCUSDT", interval: "1h", asOf: "2026-09-14T12:00:00.000Z" },
      { signal: backoff.signal }
    ),
    (error: unknown) => error instanceof ProviderAdapterError && error.code === "provider_cancelled"
  );
  assert.equal(backoffCalls, 1);
});

test("Binance adapter spaces requests under client-side rate limiting", async () => {
  let clock = NOW_MS;
  const starts: number[] = [];
  const adapter = new BinanceKlinesAdapter({
    now: () => clock,
    sleep: async (ms: number) => {
      clock += ms;
    },
    minIntervalMs: 500,
    fetchImplementation: async () => {
      starts.push(clock);
      return response([
        kline(Date.parse("2026-09-14T10:00:00.000Z"), Date.parse("2026-09-14T10:59:59.999Z"))
      ]);
    }
  });
  const request = { symbol: "BTCUSDT", interval: "1h", asOf: "2026-09-14T12:00:00.000Z" };
  await Promise.all([
    adapter.fetchSnapshot(request),
    adapter.fetchSnapshot(request),
    adapter.fetchSnapshot(request)
  ]);
  assert.deepEqual(starts, [NOW_MS, NOW_MS + 500, NOW_MS + 1000]);
});

test("Binance adapter validates retry/rate-limit configuration", async () => {
  for (const options of [
    { maxAttempts: 0 },
    { retryBaseMs: -1 },
    { retryMaxMs: -5 },
    { minIntervalMs: -10 },
    { maxAttempts: 2.5 }
  ]) {
    assert.throws(
      () => new BinanceKlinesAdapter(options),
      (error: unknown) => error instanceof ProviderAdapterError
        && error.code === "invalid_provider_configuration"
    );
  }
});

test("Binance adapter rejects oversized and non-JSON responses", async () => {
  const oversized = new BinanceKlinesAdapter({
    maxResponseBytes: 8,
    fetchImplementation: async () => response([["too-large-payload"]])
  });
  await assert.rejects(
    () => oversized.fetchSnapshot({
      symbol: "BTCUSDT",
      interval: "1h",
      asOf: "2026-09-14T12:00:00.000Z"
    }),
    (error: unknown) => error instanceof ProviderAdapterError
      && error.code === "provider_response_too_large"
  );

  const html = new BinanceKlinesAdapter({
    fetchImplementation: async () => response("<html>error</html>", {
      "content-type": "text/html"
    })
  });
  await assert.rejects(
    () => html.fetchSnapshot({
      symbol: "BTCUSDT",
      interval: "1h",
      asOf: "2026-09-14T12:00:00.000Z"
    }),
    (error: unknown) => error instanceof ProviderAdapterError
      && error.code === "provider_invalid_response"
  );
});
