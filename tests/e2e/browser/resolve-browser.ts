import { existsSync } from "node:fs";

/**
 * Deterministic, explicit resolution of a Chromium/Chrome executable for the
 * mandatory real-browser smoke test.
 *
 * Resolution order (first hit wins):
 *   1. CHROME_PATH / CHROMIUM_PATH environment override;
 *   2. known Google Chrome paths;
 *   3. known Chromium paths;
 *   4. BLOCKED — a clear error. "Browser unavailable" is NEVER converted into
 *      a passing test; the caller must fail (or, only when explicitly allowed
 *      via ALLOW_BROWSER_SMOKE_SKIP=1 for local dev, report UNVERIFIED).
 *
 * On GitHub-hosted Ubuntu runners, Google Chrome is preinstalled at
 * /usr/bin/google-chrome (or provided by browser-actions/setup-chrome, which
 * exports CHROME_PATH), so no large browser download happens per run.
 */

const KNOWN_CHROME_PATHS = [
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/opt/google/chrome/chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

const KNOWN_CHROMIUM_PATHS = [
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/snap/bin/chromium",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
];

export type BrowserResolution = {
  executablePath: string;
  source: string;
};

export class BrowserUnavailableError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BrowserUnavailableError";
  }
}

export function resolveBrowser(): BrowserResolution {
  const override = process.env.CHROME_PATH ?? process.env.CHROMIUM_PATH;
  if (override && override.trim().length > 0) {
    if (!existsSync(override)) {
      throw new BrowserUnavailableError(
        `CHROME_PATH/CHROMIUM_PATH is set to '${override}' but no file exists there.`
      );
    }
    return { executablePath: override, source: "env:CHROME_PATH/CHROMIUM_PATH" };
  }

  for (const candidate of KNOWN_CHROME_PATHS) {
    if (existsSync(candidate)) {
      return { executablePath: candidate, source: "google-chrome" };
    }
  }

  for (const candidate of KNOWN_CHROMIUM_PATHS) {
    if (existsSync(candidate)) {
      return { executablePath: candidate, source: "chromium" };
    }
  }

  throw new BrowserUnavailableError(
    "BLOCKED: no Chrome/Chromium executable found. Set CHROME_PATH or CHROMIUM_PATH, " +
      "or install Google Chrome / Chromium. Checked: " +
      [...KNOWN_CHROME_PATHS, ...KNOWN_CHROMIUM_PATHS].join(", ")
  );
}
