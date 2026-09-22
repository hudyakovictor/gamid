import { z } from "zod";

import { ReviewStatusSchema } from "../../contracts/src/scenario.js";

/**
 * Server-side review-state transition policy (Batch 01 — Backend).
 *
 * Uses ONLY the frozen review states. No new shared status values.
 * All transition logic lives here (domain layer); route handlers call
 * `assertReviewTransition` and never reimplement the matrix.
 *
 * Canonical pipeline (forward):
 *
 *   draft → research → point_in_time_validation → review → validated → published
 *
 * Backward (rework) edges return to the immediate predecessor, plus
 * validated → review (unpublish-to-rework). Skips in either direction are
 * rejected. `published` is terminal and immutable.
 */

export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

export const REVIEW_STATUSES: readonly ReviewStatus[] = [
  "draft",
  "research",
  "point_in_time_validation",
  "review",
  "validated",
  "published"
] as const;

export const ALLOWED_REVIEW_TRANSITIONS: Record<ReviewStatus, readonly ReviewStatus[]> = {
  draft: ["research"],
  research: ["point_in_time_validation", "draft"],
  point_in_time_validation: ["review", "research"],
  review: ["validated", "point_in_time_validation"],
  validated: ["published", "review"],
  published: []
};

export type ReviewTransitionActor = {
  readonly userId: string;
  readonly isEditor: boolean;
};

export type ReviewPolicyViolationCode =
  | "unknown_status"
  | "forbidden"
  | "terminal_state"
  | "invalid_transition";

export class ReviewPolicyError extends Error {
  public readonly code: ReviewPolicyViolationCode;
  public readonly fromStatus: string;
  public readonly toStatus: string;

  public constructor(
    code: ReviewPolicyViolationCode,
    fromStatus: string,
    toStatus: string,
    message: string
  ) {
    super(message);
    this.name = "ReviewPolicyError";
    this.code = code;
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
  }
}

export function isReviewStatus(value: unknown): value is ReviewStatus {
  return ReviewStatusSchema.safeParse(value).success;
}

export function isTerminalReviewStatus(status: ReviewStatus): boolean {
  return ALLOWED_REVIEW_TRANSITIONS[status].length === 0;
}

export function listAllowedReviewTransitions(from: ReviewStatus): readonly ReviewStatus[] {
  return ALLOWED_REVIEW_TRANSITIONS[from];
}

export type ReviewTransitionEvaluation =
  | { readonly allowed: true; readonly noop: boolean }
  | { readonly allowed: false; readonly code: Exclude<ReviewPolicyViolationCode, "forbidden">; readonly message: string };

export function evaluateReviewTransition(
  fromStatus: string,
  toStatus: string
): ReviewTransitionEvaluation {
  if (!isReviewStatus(fromStatus) || !isReviewStatus(toStatus)) {
    return {
      allowed: false,
      code: "unknown_status",
      message: `Unknown review status transition ${JSON.stringify(fromStatus)} → ${JSON.stringify(toStatus)}`
    };
  }
  if (fromStatus === toStatus) {
    // Idempotent no-op: same-status re-requests succeed without a new
    // transition record. Authorization is still enforced by the caller.
    return { allowed: true, noop: true };
  }
  if (isTerminalReviewStatus(fromStatus)) {
    return {
      allowed: false,
      code: "terminal_state",
      message: `Review status ${fromStatus} is terminal and immutable`
    };
  }
  if (!ALLOWED_REVIEW_TRANSITIONS[fromStatus].includes(toStatus)) {
    return {
      allowed: false,
      code: "invalid_transition",
      message: `Review transition ${fromStatus} → ${toStatus} is not allowed (allowed: ${ALLOWED_REVIEW_TRANSITIONS[fromStatus].join(", ") || "none"})`
    };
  }
  return { allowed: true, noop: false };
}

/**
 * Assert a transition is allowed for the given actor.
 * Returns `{ noop: boolean }` so callers can skip persistence on no-ops.
 * Throws ReviewPolicyError (machine-readable `code`) otherwise.
 */
export function assertReviewTransition(
  fromStatus: string,
  toStatus: string,
  actor: ReviewTransitionActor
): { noop: boolean } {
  if (!actor.isEditor) {
    throw new ReviewPolicyError(
      "forbidden",
      String(fromStatus),
      String(toStatus),
      `Actor ${actor.userId} is not authorized to transition review state`
    );
  }
  const evaluation = evaluateReviewTransition(fromStatus, toStatus);
  if (!evaluation.allowed) {
    throw new ReviewPolicyError(
      evaluation.code,
      String(fromStatus),
      String(toStatus),
      evaluation.message
    );
  }
  return { noop: evaluation.noop };
}
