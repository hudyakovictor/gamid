import { describe, expect, it } from "vitest";

import { createIdempotencyKey, createRunStorage } from "./persistence";

class MemoryStorage implements Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  private readonly map = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }

  public setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }

  public removeItem(key: string): void {
    this.map.delete(key);
  }
}

const saved = {
  scenarioId: "foundation-false-breakout-001",
  scenarioVersion: "1.0.0",
  runId: "run-1",
  idempotencyKey: "run:abc",
  phase: "workspace",
  savedAt: "2026-09-21T10:00:00.000Z"
} as const;

describe("run persistence", () => {
  it("round-trips a saved run", () => {
    const storage = createRunStorage(new MemoryStorage());
    expect(storage.load()).toBeNull();
    storage.save({ ...saved });
    expect(storage.load()).toEqual({ ...saved });
  });

  it("ignores corrupted storage instead of throwing", () => {
    const memory = new MemoryStorage();
    memory.setItem("sa.client.prototype.run.v1", "{not json");
    const storage = createRunStorage(memory);
    expect(storage.load()).toBeNull();
  });

  it("ignores payloads with the wrong schema version or shape", () => {
    const memory = new MemoryStorage();
    memory.setItem(
      "sa.client.prototype.run.v1",
      JSON.stringify({ version: 99, savedRun: { ...saved } })
    );
    expect(createRunStorage(memory).load()).toBeNull();

    memory.setItem(
      "sa.client.prototype.run.v1",
      JSON.stringify({ version: 1, savedRun: { ...saved, phase: "exploded" } })
    );
    expect(createRunStorage(memory).load()).toBeNull();

    memory.setItem(
      "sa.client.prototype.run.v1",
      JSON.stringify({ version: 1, savedRun: null })
    );
    expect(createRunStorage(memory).load()).toBeNull();
  });

  it("clears the saved run", () => {
    const storage = createRunStorage(new MemoryStorage());
    storage.save({ ...saved });
    storage.clear();
    expect(storage.load()).toBeNull();
  });

  it("degrades gracefully when storage access throws", () => {
    const throwing = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      }
    };
    const storage = createRunStorage(throwing);
    expect(() => storage.load()).not.toThrow();
    expect(() => storage.save({ ...saved })).not.toThrow();
    expect(() => storage.clear()).not.toThrow();
    expect(storage.load()).toBeNull();
  });
});

describe("idempotency keys", () => {
  it("produces unique keys bounded to the contract limit", () => {
    const keys = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      const key = createIdempotencyKey();
      keys.add(key);
      expect(key.length).toBeLessThanOrEqual(200);
    }
    expect(keys.size).toBe(50);
  });
});
