import assert from "node:assert/strict";
import test from "node:test";

import { closePanel, openPanel, panels, shiftRail, type InterfaceShellState } from "./interface-shell.js";

const initialState: InterfaceShellState = {
  screen: "home",
  step: 1,
  rails: [{ id: "academy", index: 0, count: 3, keyboard: true, swipe: true }],
  reducedMotion: false,
  viewport: "mobile"
};

test("typed shell opens and closes a panel without mutating the previous state", () => {
  const opened = openPanel(initialState, "cards");
  const closed = closePanel(opened);

  assert.equal(opened.activePanel, "cards");
  assert.equal(closed.activePanel, undefined);
  assert.equal(initialState.activePanel, undefined);
  assert.equal(panels.some((panel) => panel.id === "cards"), true);
});

test("typed rail navigation clamps to available items", () => {
  const rail = initialState.rails[0];
  assert.ok(rail);
  assert.equal(shiftRail(rail, -1).index, 0);
  assert.equal(shiftRail(rail, 99).index, 2);
});
