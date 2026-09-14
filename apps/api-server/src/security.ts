export type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export interface RateLimitStore {
  consume(key: string, limit: number, windowMs: number, nowMs: number): RateLimitDecision;
}

type RateLimitEntry = {
  count: number;
  resetAtMs: number;
};

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly entries = new Map<string, RateLimitEntry>();

  consume(
    key: string,
    limit: number,
    windowMs: number,
    nowMs: number
  ): RateLimitDecision {
    const current = this.entries.get(key);
    const entry = current && current.resetAtMs > nowMs
      ? current
      : { count: 0, resetAtMs: nowMs + windowMs };

    entry.count += 1;
    this.entries.set(key, entry);

    if (entry.count > limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAtMs - nowMs) / 1_000))
      };
    }

    return { allowed: true, retryAfterSeconds: 0 };
  }
}
