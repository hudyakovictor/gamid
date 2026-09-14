import assert from "node:assert/strict";
import test from "node:test";

import { buildServer } from "../../apps/api-server/src/server.js";

test("API applies security headers and an exact CORS allowlist", async () => {
  const server = buildServer({
    allowedOrigins: ["https://allowed.example"],
    sessionSecure: true
  });

  const allowed = await server.inject({
    method: "GET",
    url: "/health",
    headers: { origin: "https://allowed.example" }
  });
  assert.equal(allowed.statusCode, 200);
  assert.equal(allowed.headers["access-control-allow-origin"], "https://allowed.example");
  assert.equal(allowed.headers["access-control-allow-credentials"], "true");
  assert.equal(allowed.headers["x-content-type-options"], "nosniff");
  assert.equal(allowed.headers["strict-transport-security"], "max-age=31536000; includeSubDomains");
  assert.match(allowed.headers["content-security-policy"]?.toString() ?? "", /default-src 'none'/);

  const denied = await server.inject({
    method: "GET",
    url: "/health",
    headers: { origin: "https://not-allowed.example" }
  });
  assert.equal(denied.statusCode, 403);
  assert.deepEqual(denied.json(), { error: "origin_not_allowed" });

  const preflight = await server.inject({
    method: "OPTIONS",
    url: "/api/v1/scenario-runs",
    headers: { origin: "https://allowed.example" }
  });
  assert.equal(preflight.statusCode, 204);
  await server.close();
});
