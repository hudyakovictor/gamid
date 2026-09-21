/**
 * Local persistence for refresh recovery.
 *
 * Stores only the reference to the authoritative server-side run
 * (runId + idempotency key + coarse phase). Scenario truth, hidden
 * future and scores always come back from the API.
 */

export type SavedRun = {
  scenarioId: string;
  scenarioVersion: string;
  runId: string;
  idempotencyKey: string;
  phase: "workspace" | "sealed" | "reveal";
  savedAt: string;
};

const STORAGE_KEY = "sa.client.prototype.run.v1";
const SCHEMA_VERSION = 1;

export type RunStorage = {
  load(): SavedRun | null;
  save(run: SavedRun): void;
  clear(): void;
};

export function createRunStorage(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">
): RunStorage {
  function safeGet(): string | null {
    try {
      return storage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  return {
    load(): SavedRun | null {
      const raw = safeGet();
      if (!raw) {
        return null;
      }
      try {
        const parsed = JSON.parse(raw) as {
          version?: unknown;
          savedRun?: unknown;
        };
        if (parsed.version !== SCHEMA_VERSION) {
          return null;
        }
        const saved = parsed.savedRun;
        if (
          typeof saved !== "object" ||
          saved === null
        ) {
          return null;
        }
        const candidate = saved as Record<string, unknown>;
        const valid =
          typeof candidate.scenarioId === "string" &&
          typeof candidate.scenarioVersion === "string" &&
          typeof candidate.runId === "string" &&
          typeof candidate.idempotencyKey === "string" &&
          typeof candidate.savedAt === "string" &&
          (candidate.phase === "workspace" ||
            candidate.phase === "sealed" ||
            candidate.phase === "reveal");
        if (!valid) {
          return null;
        }
        return candidate as unknown as SavedRun;
      } catch {
        return null;
      }
    },
    save(run: SavedRun): void {
      try {
        storage.setItem(
          STORAGE_KEY,
          JSON.stringify({ version: SCHEMA_VERSION, savedRun: run })
        );
      } catch {
        // storage may be unavailable (private mode); recovery degrades gracefully
      }
    },
    clear(): void {
      try {
        storage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  };
}

export function createIdempotencyKey(prefix = "run"): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${random}`.slice(0, 200);
}
