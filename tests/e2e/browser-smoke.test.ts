import assert from "node:assert/strict";
import test from "node:test";

import puppeteer, { type Browser, type ConsoleMessage, type HTTPResponse, type Page } from "puppeteer-core";

import { resolveBrowser, BrowserUnavailableError } from "./browser/resolve-browser.js";
import { startHarness, type Harness } from "./browser/harness.js";

/**
 * Mandatory real-browser lifecycle smoke test.
 *
 * Runs a headless Chromium/Chrome through the full Foundation lifecycle against
 * the canonical fixture, an isolated test API and an isolated temporary SQLite
 * database:
 *
 *   Hub/catalog
 *   → activate the featured-card "Открыть брифинг" CTA (keyboard: Enter)
 *   → scenario brief
 *   → start run
 *   → decision workspace
 *   → choose evidence
 *   → enter invalidation
 *   → choose action
 *   → immutable seal
 *   → POST reveal
 *   → Process Score
 *   → persisted history / readback
 *
 * It fails on uncaught page errors, unexpected console errors, unexpected
 * failed API responses; verifies reveal uses POST (not GET); verifies hidden
 * future/outcome data is unavailable before reveal; verifies Process Score
 * appears only after reveal; and verifies persisted run history after the flow.
 *
 * Browser resolution is explicit (CHROME_PATH/CHROMIUM_PATH → known Chrome →
 * known Chromium → BLOCKED). "Browser unavailable" is never converted into a
 * PASS in CI. For local developer convenience only, ALLOW_BROWSER_SMOKE_SKIP=1
 * downgrades an unavailable browser to a skipped test (never set in CI).
 */

const NAV_TIMEOUT_MS = 15_000;

type ApiObservation = {
  method: string;
  url: string;
  status: number;
};

let browserResolutionError: Error | null = null;
let executablePath = "";
let browserSource = "";
try {
  const resolution = resolveBrowser();
  executablePath = resolution.executablePath;
  browserSource = resolution.source;
} catch (error) {
  browserResolutionError = error as Error;
}

const allowSkip = process.env.ALLOW_BROWSER_SMOKE_SKIP === "1";

test("real-browser Foundation lifecycle smoke", async (t) => {
  if (browserResolutionError) {
    if (allowSkip && browserResolutionError instanceof BrowserUnavailableError) {
      t.skip(
        `UNVERIFIED (local): ${browserResolutionError.message}. ` +
          "In CI a browser must be present; this skip is disabled without ALLOW_BROWSER_SMOKE_SKIP=1."
      );
      return;
    }
    throw browserResolutionError;
  }

  const harness: Harness = await startHarness();
  let browser: Browser | undefined;

  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const apiObservations: ApiObservation[] = [];

  try {
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page: Page = await browser.newPage();
    page.setDefaultTimeout(NAV_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);

    page.on("pageerror", (error: unknown) => {
      pageErrors.push(error instanceof Error ? error.message : String(error));
    });
    page.on("console", (message: ConsoleMessage) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });
    page.on("response", (response: HTTPResponse) => {
      const url = response.url();
      if (url.includes("/api/")) {
        apiObservations.push({
          method: response.request().method(),
          url,
          status: response.status(),
        });
      }
    });

    // --- Hub / catalog ---
    await page.goto(harness.clientUrl, { waitUntil: "networkidle0" });
    await page.waitForSelector(".widget button", { timeout: NAV_TIMEOUT_MS });

    // Guard: the public catalog/brief must NOT expose hidden future/outcome
    // data before reveal. The whole loaded document is inspected.
    const preRevealBody = await page.evaluate(() => document.body.innerText);
    assert.ok(
      !preRevealBody.includes("fake_breakout_phantom"),
      "hidden entity leaked into the pre-reveal client"
    );
    assert.ok(
      !preRevealBody.includes("The breakout failed after the decision point"),
      "historical outcome summary leaked before reveal"
    );
    assert.ok(
      !preRevealBody.includes("sha256:fixture-future-001"),
      "hidden future segment hash leaked before reveal"
    );
    // Process Score must not be present before reveal.
    assert.ok(
      !preRevealBody.includes("Process Score"),
      "Process Score visible before reveal"
    );

    // --- Activate featured-card CTA via the KEYBOARD (Enter) ---
    // This exercises real browser native <button> keyboard semantics, proving
    // the CTA activates exactly once (a double activation would still navigate,
    // but the unit tests assert exact-once; here we assert the CTA works with
    // the keyboard against a real engine).
    const featuredButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".widget button"));
      return buttons.find((b) => (b.textContent ?? "").includes("Открыть брифинг")) ?? null;
    });
    const featuredElement = featuredButton.asElement();
    assert.ok(featuredElement, "featured CTA button not found in Hub");
    await (featuredElement as import("puppeteer-core").ElementHandle<HTMLButtonElement>).focus();
    await page.keyboard.press("Enter");

    await page.waitForFunction(() => window.location.hash === "#/scenario_brief", {
      timeout: NAV_TIMEOUT_MS,
    });
    await page.waitForFunction(
      () => document.body.innerText.includes("Начать заход"),
      { timeout: NAV_TIMEOUT_MS }
    );

    // --- Start run ---
    await clickByText(page, "button", "Начать заход");
    await page.waitForFunction(() => window.location.hash === "#/decision_workspace", {
      timeout: NAV_TIMEOUT_MS,
    });
    await page.waitForSelector(".evidence-panel input[type=checkbox]", { timeout: NAV_TIMEOUT_MS });

    // --- Choose evidence (first source) ---
    await page.click(".evidence-panel input[type=checkbox]");

    // --- Enter invalidation ---
    await page.click(".invalidation-panel textarea");
    await page.type(
      ".invalidation-panel textarea",
      "Закрытие ниже уровня ложного пробоя отменяет сетап."
    );

    // --- Choose action (first allowed action) ---
    await page.click(".action-panel .action-btn");

    // --- Immutable seal ---
    await clickByText(page, "button", "Зафиксировать решение");
    await page.waitForFunction(
      () => document.body.innerText.includes("Решение зафиксировано"),
      { timeout: NAV_TIMEOUT_MS }
    );

    // Score must still not be visible after seal but before reveal.
    const postSealBody = await page.evaluate(() => document.body.innerText);
    assert.ok(
      !postSealBody.includes("Process Score"),
      "Process Score visible after seal but before reveal"
    );

    // --- POST reveal ---
    await clickByText(page, "button", "Показать исход");
    await page.waitForFunction(() => window.location.hash === "#/historical_reveal", {
      timeout: NAV_TIMEOUT_MS,
    });
    await page.waitForFunction(
      () => document.body.innerText.includes("Process Score"),
      { timeout: NAV_TIMEOUT_MS }
    );

    // --- After reveal: hidden data and Process Score are now present ---
    const revealBody = await page.evaluate(() => document.body.innerText);
    assert.ok(revealBody.includes("Process Score"), "Process Score missing after reveal");
    assert.ok(
      revealBody.includes("fake_breakout_phantom"),
      "canonical hidden entity missing after reveal"
    );

    // Reveal must have been requested with POST, not GET.
    const revealRequests = apiObservations.filter((o) => o.url.includes("/reveal"));
    assert.ok(revealRequests.length > 0, "no reveal request observed");
    for (const r of revealRequests) {
      assert.equal(r.method, "POST", `reveal must use POST, saw ${r.method} ${r.url}`);
    }
    assert.ok(
      revealRequests.every((r) => r.status >= 200 && r.status < 300),
      `reveal request did not succeed: ${JSON.stringify(revealRequests)}`
    );

    // --- Persisted history / readback ---
    await clickByText(page, "button", "В хаб");
    await page.waitForFunction(() => window.location.hash === "#/arena_hub", {
      timeout: NAV_TIMEOUT_MS,
    });
    // The Hub re-fetches run history for the user; the completed run must show.
    await page.waitForSelector(".run-history", { timeout: NAV_TIMEOUT_MS });
    const historyText = await page.evaluate(
      () => document.querySelector(".run-history")?.textContent ?? ""
    );
    assert.ok(
      historyText.includes("foundation-false-breakout-001"),
      "persisted run not present in Hub history readback"
    );

    // Verify the readback also came from the API.
    const historyRequests = apiObservations.filter((o) =>
      /\/api\/v1\/users\/.+\/scenario-runs/.test(o.url)
    );
    assert.ok(historyRequests.length > 0, "no run-history readback request observed");

    // --- Global error / network assertions ---
    assert.deepEqual(pageErrors, [], `uncaught page errors: ${pageErrors.join(" | ")}`);
    assert.deepEqual(consoleErrors, [], `unexpected console errors: ${consoleErrors.join(" | ")}`);

    // No mutating GET reveal must ever appear.
    const badReveal = apiObservations.filter(
      (o) => o.url.includes("/reveal") && o.method === "GET"
    );
    assert.equal(badReveal.length, 0, "a GET reveal request was observed (must be POST)");

    // No unexpected failed API responses. Some 4xx are legitimate during boot
    // (e.g. optional balance before seed completes) but the lifecycle-critical
    // endpoints must all succeed.
    const criticalFailures = apiObservations.filter((o) => {
      const isCritical =
        o.url.includes("/scenario-runs") ||
        o.url.includes("/scenarios") ||
        o.url.includes("/users/me");
      return isCritical && o.status >= 400;
    });
    assert.deepEqual(
      criticalFailures,
      [],
      `unexpected failed API responses on critical endpoints: ${JSON.stringify(criticalFailures)}`
    );

    t.diagnostic(`browser: ${browserSource} @ ${executablePath}`);
    t.diagnostic(`reveal requests: ${JSON.stringify(revealRequests)}`);
  } finally {
    if (browser) {
      await browser.close();
    }
    await harness.stop();
  }
});

async function clickByText(page: Page, selector: string, text: string): Promise<void> {
  const handle = await page.evaluateHandle(
    (sel: string, needle: string) => {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>(sel));
      return nodes.find((n) => (n.textContent ?? "").includes(needle)) ?? null;
    },
    selector,
    text
  );
  const element = handle.asElement();
  if (!element) {
    throw new Error(`No <${selector}> containing text "${text}" found`);
  }
  await (element as import("puppeteer-core").ElementHandle<Element>).click();
}
