import assert from "node:assert/strict";
import test from "node:test";

import {
  ALLOWED_REVIEW_TRANSITIONS,
  assertReviewTransition,
  evaluateReviewTransition,
  isReviewStatus,
  isTerminalReviewStatus,
  listAllowedReviewTransitions,
  ReviewPolicyError,
  REVIEW_STATUSES,
  type ReviewStatus
} from "./review-policy.js";

const EDITOR = { userId: "editor-1", isEditor: true };
const PLAYER = { userId: "player-1", isEditor: false };

// The explicit transition matrix: every allowed edge is enumerated here and
// every other pair must be rejected. This is the executable form of the
// review policy; change it only with product approval.
const EXPECTED_ALLOWED: Record<ReviewStatus, readonly ReviewStatus[]> = {
  draft: ["research"],
  research: ["point_in_time_validation", "draft"],
  point_in_time_validation: ["review", "research"],
  review: ["validated", "point_in_time_validation"],
  validated: ["published", "review"],
  published: []
};

test("frozen review states are exactly the six baseline values", () => {
  assert.deepEqual([...REVIEW_STATUSES], [
    "draft",
    "research",
    "point_in_time_validation",
    "review",
    "validated",
    "published"
  ]);
  assert.deepEqual(ALLOWED_REVIEW_TRANSITIONS, EXPECTED_ALLOWED);
});

test("every allowed transition succeeds for editors", () => {
  for (const from of REVIEW_STATUSES) {
    for (const to of EXPECTED_ALLOWED[from]) {
      const evaluation = evaluateReviewTransition(from, to);
      assert.deepEqual(evaluation, { allowed: true, noop: false });
      assert.deepEqual(assertReviewTransition(from, to, EDITOR), { noop: false });
    }
  }
});

test("every disallowed transition is rejected (full 6x6 matrix)", () => {
  for (const from of REVIEW_STATUSES) {
    for (const to of REVIEW_STATUSES) {
      if (from === to) continue; // no-op path tested separately
      const allowed = EXPECTED_ALLOWED[from].includes(to);
      const evaluation = evaluateReviewTransition(from, to);
      if (allowed) {
        assert.equal(evaluation.allowed, true, `${from} → ${to} must be allowed`);
      } else {
        assert.equal(evaluation.allowed, false, `${from} → ${to} must be rejected`);
        assert.throws(
          () => assertReviewTransition(from, to, EDITOR),
          (error: unknown) =>
            error instanceof ReviewPolicyError
            && (error.code === "invalid_transition" || error.code === "terminal_state")
        );
      }
    }
  }
});

test("skipped stages are rejected even when moving forward", () => {
  const skips: Array<[ReviewStatus, ReviewStatus]> = [
    ["draft", "point_in_time_validation"],
    ["draft", "review"],
    ["draft", "validated"],
    ["draft", "published"],
    ["research", "review"],
    ["research", "validated"],
    ["research", "published"],
    ["point_in_time_validation", "validated"],
    ["point_in_time_validation", "published"],
    ["review", "published"]
  ];
  for (const [from, to] of skips) {
    assert.throws(
      () => assertReviewTransition(from, to, EDITOR),
      (error: unknown) =>
        error instanceof ReviewPolicyError && error.code === "invalid_transition",
      `${from} → ${to} skips required stages`
    );
  }
});

test("backward jumps beyond the immediate predecessor are rejected", () => {
  const jumps: Array<[ReviewStatus, ReviewStatus]> = [
    ["research", "published"],
    ["point_in_time_validation", "draft"],
    ["review", "research"],
    ["review", "draft"],
    ["validated", "point_in_time_validation"],
    ["validated", "draft"]
  ];
  for (const [from, to] of jumps) {
    assert.throws(
      () => assertReviewTransition(from, to, EDITOR),
      (error: unknown) =>
        error instanceof ReviewPolicyError && error.code === "invalid_transition",
      `${from} → ${to} jumps over the immediate predecessor`
    );
  }
});

test("published is terminal and immutable", () => {
  assert.equal(isTerminalReviewStatus("published"), true);
  for (const to of REVIEW_STATUSES) {
    if (to === "published") continue;
    assert.throws(
      () => assertReviewTransition("published", to, EDITOR),
      (error: unknown) =>
        error instanceof ReviewPolicyError && error.code === "terminal_state"
    );
  }
  for (const status of REVIEW_STATUSES) {
    if (status !== "published") {
      assert.equal(isTerminalReviewStatus(status), false);
    }
  }
});

test("same-status requests are idempotent no-ops (still authorized)", () => {
  for (const status of REVIEW_STATUSES) {
    assert.deepEqual(evaluateReviewTransition(status, status), { allowed: true, noop: true });
    assert.deepEqual(assertReviewTransition(status, status, EDITOR), { noop: true });
    // Even no-ops require an authorized editor.
    assert.throws(
      () => assertReviewTransition(status, status, PLAYER),
      (error: unknown) => error instanceof ReviewPolicyError && error.code === "forbidden"
    );
  }
});

test("non-editors are rejected for every transition", () => {
  for (const from of REVIEW_STATUSES) {
    for (const to of REVIEW_STATUSES) {
      assert.throws(
        () => assertReviewTransition(from, to, PLAYER),
        (error: unknown) =>
          error instanceof ReviewPolicyError
          && error.code === "forbidden"
          && error.fromStatus === from
          && error.toStatus === to
      );
    }
  }
});

test("unknown statuses fail closed", () => {
  assert.equal(isReviewStatus("shipped"), false);
  assert.equal(isReviewStatus(""), false);
  assert.equal(isReviewStatus(undefined), false);
  for (const status of REVIEW_STATUSES) {
    assert.equal(isReviewStatus(status), true);
  }
  assert.deepEqual(evaluateReviewTransition("draft", "shipped").allowed, false);
  assert.deepEqual(evaluateReviewTransition("shipped", "draft").allowed, false);
  assert.throws(
    () => assertReviewTransition("draft", "shipped", EDITOR),
    (error: unknown) =>
      error instanceof ReviewPolicyError && error.code === "unknown_status"
  );
});

test("allowed-transition listing matches the matrix", () => {
  for (const status of REVIEW_STATUSES) {
    assert.deepEqual(listAllowedReviewTransitions(status), EXPECTED_ALLOWED[status]);
  }
});

test("policy errors carry machine-readable codes and both statuses", () => {
  try {
    assertReviewTransition("draft", "published", EDITOR);
    assert.fail("must throw");
  } catch (error) {
    assert.ok(error instanceof ReviewPolicyError);
    assert.equal(error.code, "invalid_transition");
    assert.equal(error.fromStatus, "draft");
    assert.equal(error.toStatus, "published");
    assert.match(error.message, /not allowed/);
  }
});
