// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "./App";
import { ApiClient } from "./api/client";
import { starterScenarioFixture as scenario } from "./flow/fixtures";

afterEach(() => { vi.restoreAllMocks(); window.localStorage.clear(); });

it("catalog → scenario brief → start a new run → decision workspace without an existing run", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  window.location.hash = "";
  window.localStorage.clear();
  vi.spyOn(ApiClient.prototype, "me").mockResolvedValue({ userId: "component-user" });
  vi.spyOn(ApiClient.prototype, "getBalance").mockRejectedValue(new Error("optional balance unavailable"));
  vi.spyOn(ApiClient.prototype, "listRuns").mockResolvedValue([]);
  vi.spyOn(ApiClient.prototype, "listScenarios").mockResolvedValue([{
    scenarioId: scenario.scenarioId, version: scenario.version, scenarioLevel: scenario.scenarioLevel,
    mode: scenario.mode, assetClass: scenario.assetClass, assetId: scenario.assetId,
    marketSegment: scenario.marketSegment, decisionPointT0: scenario.decisionPoint.t0, timeframe: scenario.timeframe
  }]);
  const load = vi.spyOn(ApiClient.prototype, "getScenario").mockResolvedValue(scenario);
  const start = vi.spyOn(ApiClient.prototype, "startRun").mockResolvedValue({ scenario, run: {
    runId: "new-run", scenarioId: scenario.scenarioId, scenarioVersion: scenario.version,
    state: "started", createdAt: new Date().toISOString(), sealedAt: null, revealedAt: null, completedAt: null
  } });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const click = async (label: string) => {
    const button = [...container.querySelectorAll("button")].find((node) => node.textContent?.includes(label));
    expect(button, label).toBeDefined();
    await act(async () => button!.click());
  };
  try {
    await act(async () => root.render(createElement(App)));
    await click("Открыть сценарий");
    expect(load).toHaveBeenCalledWith(scenario.scenarioId, scenario.version);
    expect(window.location.hash).toBe("#/scenario_brief");
    expect(start).not.toHaveBeenCalled();
    await click("Начать заход");
    expect(start).toHaveBeenCalledExactlyOnceWith({ scenarioId: scenario.scenarioId, scenarioVersion: scenario.version, idempotencyKey: expect.any(String) });
    expect(window.location.hash).toBe("#/decision_workspace");
    expect(container.textContent).toContain("Зафиксировать решение");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
