import { spawn, type ChildProcess } from "node:child_process";
import {
  createServer,
  request as httpRequest,
  type Server,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { createReadStream, existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(HERE, "../../..");
const CLIENT_DIR = join(REPO_ROOT, "apps/game-client");
const CLIENT_DIST = join(CLIENT_DIR, "dist");

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

export type Harness = {
  clientUrl: string;
  apiPort: number;
  clientPort: number;
  /** Resolves the temporary SQLite database path (for hygiene assertions). */
  tempDbPath: string;
  stop: () => Promise<void>;
};

const STARTUP_TIMEOUT_MS = 30_000;

async function waitForHttpOk(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      await new Promise<void>((resolvePromise, rejectPromise) => {
        const req = httpRequest(url, { method: "GET", timeout: 2_000 }, (res) => {
          res.resume();
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
            resolvePromise();
          } else {
            rejectPromise(new Error(`status ${res.statusCode ?? "?"}`));
          }
        });
        req.on("error", rejectPromise);
        req.on("timeout", () => {
          req.destroy(new Error("request timeout"));
        });
        req.end();
      });
      return;
    } catch (error) {
      lastError = error;
      await delay(200);
    }
  }
  throw new Error(`Timed out waiting for ${url}: ${String(lastError)}`);
}

function proxyToApi(req: IncomingMessage, res: ServerResponse, apiPort: number): void {
  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  req.on("end", () => {
    const body = Buffer.concat(chunks);
    const headers = { ...req.headers };
    // Same-origin server-side call: the local API boundary rejects unknown
    // Origins, so strip it (the vite dev proxy does the same).
    delete headers.origin;
    delete headers.host;
    const proxyReq = httpRequest(
      {
        host: "127.0.0.1",
        port: apiPort,
        method: req.method,
        path: req.url,
        headers,
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );
    proxyReq.on("error", () => {
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "proxy_failed" }));
    });
    if (body.length > 0) {
      proxyReq.write(body);
    }
    proxyReq.end();
  });
}

function serveStatic(req: IncomingMessage, res: ServerResponse): void {
  const urlPath = (req.url ?? "/").split("?")[0] ?? "/";
  let filePath = join(CLIENT_DIST, normalize(urlPath));
  // Prevent path traversal outside the dist dir.
  if (!filePath.startsWith(CLIENT_DIST)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    // SPA fallback: serve index.html for client-side (hash) routes.
    filePath = join(CLIENT_DIST, "index.html");
  }
  const ext = filePath.slice(filePath.lastIndexOf("."));
  res.writeHead(200, { "content-type": CONTENT_TYPES[ext] ?? "application/octet-stream" });
  createReadStream(filePath).pipe(res);
}

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolvePromise) => server.listen(0, "127.0.0.1", resolvePromise));
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Failed to bind static server to a port");
  }
  return address.port;
}

/**
 * Start an isolated API server (fixture auth, temp SQLite DB) and a static
 * server that serves the built client and proxies /api + /health to the API.
 * The built client must already exist (run `pnpm client:build` first).
 */
export async function startHarness(): Promise<Harness> {
  if (!existsSync(join(CLIENT_DIST, "index.html"))) {
    throw new Error(
      `Client build not found at ${CLIENT_DIST}. Run 'pnpm client:build' before the browser smoke test.`
    );
  }

  const tempDir = mkdtempSync(join(tmpdir(), "sa-browser-smoke-"));
  const tempDbPath = join(tempDir, "smoke.sqlite");

  // Start the API on a fixed local port using an isolated temp SQLite DB.
  const apiPort = 30000 + Math.floor(Math.random() * 20000);
  const apiProcess: ChildProcess = spawn(
    process.execPath,
    ["--import", "tsx", join(REPO_ROOT, "apps/api-server/src/main.ts")],
    {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        PORT: String(apiPort),
        DB_DRIVER: "sqlite",
        DB_PATH: tempDbPath,
        AUTH_MODE: "fixture",
        NODE_ENV: "test",
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  const apiLogs: string[] = [];
  apiProcess.stdout?.on("data", (d: Buffer) => apiLogs.push(d.toString()));
  apiProcess.stderr?.on("data", (d: Buffer) => apiLogs.push(d.toString()));

  const staticServer = createServer((req, res) => {
    const url = req.url ?? "/";
    if (url.startsWith("/api/") || url.startsWith("/health") || url.startsWith("/ready")) {
      proxyToApi(req, res, apiPort);
      return;
    }
    serveStatic(req, res);
  });

  let clientPort = 0;

  const stop = async (): Promise<void> => {
    await new Promise<void>((resolvePromise) => staticServer.close(() => resolvePromise()));
    if (!apiProcess.killed) {
      apiProcess.kill("SIGTERM");
      // Give it a moment to exit, then force-kill.
      const exited = await Promise.race([
        new Promise<boolean>((r) => apiProcess.once("exit", () => r(true))),
        delay(3_000).then(() => false),
      ]);
      if (!exited) {
        apiProcess.kill("SIGKILL");
      }
    }
    rmSync(tempDir, { recursive: true, force: true });
  };

  try {
    clientPort = await listen(staticServer);
    // Wait for the API to be ready via the proxied health endpoint.
    await waitForHttpOk(`http://127.0.0.1:${clientPort}/health`, STARTUP_TIMEOUT_MS);
  } catch (error) {
    await stop();
    throw new Error(
      `Harness startup failed: ${String(error)}\n--- API logs ---\n${apiLogs.join("")}`
    );
  }

  return {
    clientUrl: `http://127.0.0.1:${clientPort}/`,
    apiPort,
    clientPort,
    tempDbPath,
    stop,
  };
}
