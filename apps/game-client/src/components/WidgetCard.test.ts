// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";

import { WidgetCard, type WidgetSpec } from "@signal-arena/ui-game";

/**
 * Regression tests for the featured Hub CTA (WidgetCard).
 *
 * The previous implementation nested a native <button> inside an <article>
 * that ALSO had `tabIndex={0}` and an `onKeyDown` handler for Enter/Space.
 * That created two problems:
 *   1. two focus targets for a single action (the article and the button);
 *   2. keyboard events from the button bubbling to the article and invoking
 *      `onAction` a second time.
 *
 * The fix keeps the native <button> as the single interactive control and
 * removes the parent key handler and parent focusability. These tests lock in
 * exact-once activation and the absence of the duplicate control.
 *
 * happy-dom does not synthesize a native button click from Enter/Space key
 * events, so keyboard activation against *real* browser event semantics is
 * verified authoritatively by the headless-Chromium smoke test
 * (tests/e2e/browser-smoke.test.ts). Here we (a) prove the removed parent key
 * handler is truly gone (raw key events must not call onAction), and (b) model
 * the browser's native <button> activation to assert exact-once counts.
 */

const featuredSpec: WidgetSpec = {
  id: "featured",
  title: "Ликвидность перед импульсом",
  eyebrow: "FEATURED SCENARIO",
  description: "Гипотеза строится на evidence, инвалидация — до действия.",
  icon: "◈",
  footprint: "hero",
  tone: "teal",
  action: "Открыть брифинг"
};

let root: ReturnType<typeof createRoot> | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) {
    await act(async () => root!.unmount());
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
  vi.restoreAllMocks();
});

function mount(spec: WidgetSpec, onAction?: () => void): void {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  // React act runs synchronously here because WidgetCard has no async effects.
  void act(() => {
    root!.render(createElement(WidgetCard, { spec, onAction }));
  });
}

function renderCard(spec: WidgetSpec, onAction?: () => void): HTMLButtonElement {
  mount(spec, onAction);
  const button = container!.querySelector<HTMLButtonElement>(".widget button");
  if (!button) {
    throw new Error("WidgetCard CTA button not found");
  }
  return button;
}

/**
 * Model the browser's native activation of a <button>:
 * - Enter activates on keydown (unless the keydown default was prevented);
 * - Space activates on keyup (unless the key default was prevented);
 * - the activation dispatches a real click.
 * Because the fixed WidgetCard installs no key handlers, nothing prevents the
 * default and exactly one click is produced per key press.
 */
function pressKey(button: HTMLButtonElement, key: "Enter" | " "): void {
  const down = new window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  button.dispatchEvent(down);
  if (key === "Enter") {
    if (!down.defaultPrevented) {
      button.click();
    }
    return;
  }
  const up = new window.KeyboardEvent("keyup", { key, bubbles: true, cancelable: true });
  button.dispatchEvent(up);
  if (!down.defaultPrevented && !up.defaultPrevented) {
    button.click();
  }
}

it("renders exactly one interactive control and no duplicate focus target", () => {
  const button = renderCard(featuredSpec, () => {});
  const article = container!.querySelector("article.widget")!;
  // The article is a passive card, not a second control.
  expect(article.getAttribute("tabindex")).toBeNull();
  expect(article.getAttribute("role")).toBeNull();
  // Only the footer CTA is interactive/focusable.
  expect(container!.querySelectorAll("button").length).toBe(1);
  expect(button.tagName).toBe("BUTTON");
});

it("mouse click invokes the action exactly once", () => {
  const onAction = vi.fn();
  const button = renderCard(featuredSpec, onAction);
  button.click();
  expect(onAction).toHaveBeenCalledTimes(1);
});

it("Enter on the CTA invokes the action exactly once (native button semantics)", () => {
  const onAction = vi.fn();
  const button = renderCard(featuredSpec, onAction);
  pressKey(button, "Enter");
  expect(onAction).toHaveBeenCalledTimes(1);
});

it("Space on the CTA invokes the action exactly once (native button semantics)", () => {
  const onAction = vi.fn();
  const button = renderCard(featuredSpec, onAction);
  pressKey(button, " ");
  expect(onAction).toHaveBeenCalledTimes(1);
});

it("raw key events do not trigger onAction through a parent handler (removed duplicate activation)", () => {
  const onAction = vi.fn();
  const button = renderCard(featuredSpec, onAction);
  // Dispatch bubbling key events WITHOUT emulating native activation. The old
  // implementation's parent <article onKeyDown> would have fired onAction here;
  // the fixed implementation has no such handler, so nothing fires.
  button.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  button.dispatchEvent(new window.KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true }));
  button.dispatchEvent(new window.KeyboardEvent("keyup", { key: " ", bubbles: true, cancelable: true }));
  expect(onAction).not.toHaveBeenCalled();
});

it("a non-action widget renders no interactive control", () => {
  const passiveSpec: WidgetSpec = { ...featuredSpec, id: "insight", action: undefined };
  mount(passiveSpec, undefined);
  expect(container!.querySelectorAll("button").length).toBe(0);
  const article = container!.querySelector("article.widget")!;
  expect(article.getAttribute("tabindex")).toBeNull();
});
