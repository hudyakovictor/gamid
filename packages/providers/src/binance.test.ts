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
