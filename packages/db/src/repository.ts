import { isDeepStrictEqual } from "node:util";

import {
  DecisionTraceSchema,
  ScenarioPackageSchema,
  type DecisionTrace,
  type ScenarioPackage
} from "../../contracts/src/index.js";
import type { DatabaseHandle } from "./database.js";

export type ScenarioRunState = "started" | "sealed" | "revealed" | "completed";

export type CreateScenarioRunInput = {
  runId: string;
  userId: string;
  scenarioId: string;
  scenarioVersion: string;
  idempotencyKey: string;
};

export type ScenarioRunRecord = CreateScenarioRunInput & {
  state: ScenarioRunState;
  decision: DecisionTrace | null;
  score: unknown | null;
  createdAt: string;
  sealedAt: string | null;
  revealedAt: string | null;
  completedAt: string | null;
};

function parseJson(value: string | null): unknown | null {
  return value === null ? null : JSON.parse(value) as unknown;
}

function readScenarioRunRow(row: {
  runId: string;
  userId: string;
  scenarioId: string;
  scenarioVersion: string;
  state: ScenarioRunState;
  idempotencyKey: string;
  decisionJson: string | null;
  scoreJson: string | null;
  createdAt: string;
  sealedAt: string | null;
  revealedAt: string | null;
  completedAt: string | null;
}): ScenarioRunRecord {
  return {
    runId: row.runId,
    userId: row.userId,
    scenarioId: row.scenarioId,
    scenarioVersion: row.scenarioVersion,
    state: row.state,
    idempotencyKey: row.idempotencyKey,
    decision: row.decisionJson === null
      ? null
      : DecisionTraceSchema.parse(parseJson(row.decisionJson)),
    score: parseJson(row.scoreJson),
    createdAt: row.createdAt,
    sealedAt: row.sealedAt,
    revealedAt: row.revealedAt,
    completedAt: row.completedAt
  };
}

export function getScenarioPackage(
  { sqlite }: DatabaseHandle,
  scenarioId: string,
  version: string
): ScenarioPackage | undefined {
  const record = sqlite.prepare(`
    SELECT package_json AS packageJson
    FROM scenarios
    WHERE scenario_id = ? AND version = ?
  `).get(scenarioId, version) as { packageJson: string } | undefined;

  if (!record) {
    return undefined;
  }

  return ScenarioPackageSchema.parse(JSON.parse(record.packageJson) as unknown);
}

export function getScenarioRun(
  { sqlite }: DatabaseHandle,
  runId: string,
  userId: string
): ScenarioRunRecord | undefined {
  const row = sqlite.prepare(`
    SELECT
      run_id AS runId,
      user_id AS userId,
      scenario_id AS scenarioId,
      scenario_version AS scenarioVersion,
      state,
      idempotency_key AS idempotencyKey,
      decision_json AS decisionJson,
      score_json AS scoreJson,
      created_at AS createdAt,
      sealed_at AS sealedAt,
      revealed_at AS revealedAt,
      completed_at AS completedAt
    FROM scenario_runs
    WHERE run_id = ? AND user_id = ?
  `).get(runId, userId) as {
    runId: string;
    userId: string;
    scenarioId: string;
    scenarioVersion: string;
    state: ScenarioRunState;
    idempotencyKey: string;
    decisionJson: string | null;
    scoreJson: string | null;
    createdAt: string;
    sealedAt: string | null;
    revealedAt: string | null;
    completedAt: string | null;
  } | undefined;

  return row ? readScenarioRunRow(row) : undefined;
}

export function createScenarioRun(
  handle: DatabaseHandle,
  input: CreateScenarioRunInput
): ScenarioRunRecord {
  const { sqlite } = handle;
  const createdAt = new Date().toISOString();
  sqlite.prepare(`
    INSERT INTO scenario_runs (
      run_id,
      user_id,
      scenario_id,
      scenario_version,
      state,
      idempotency_key,
      created_at
    ) VALUES (?, ?, ?, ?, 'started', ?, ?)
    ON CONFLICT(idempotency_key) DO NOTHING
  `).run(
    input.runId,
    input.userId,
    input.scenarioId,
    input.scenarioVersion,
    input.idempotencyKey,
    createdAt
  );

  const record = getScenarioRun(handle, input.runId, input.userId)
    ?? (() => {
      const row = sqlite.prepare(`
        SELECT
          run_id AS runId,
          user_id AS userId,
          scenario_id AS scenarioId,
          scenario_version AS scenarioVersion,
          state,
          idempotency_key AS idempotencyKey,
          decision_json AS decisionJson,
          score_json AS scoreJson,
          created_at AS createdAt,
          sealed_at AS sealedAt,
          revealed_at AS revealedAt,
          completed_at AS completedAt
        FROM scenario_runs
        WHERE idempotency_key = ?
      `).get(input.idempotencyKey) as {
        runId: string;
        userId: string;
        scenarioId: string;
        scenarioVersion: string;
        state: ScenarioRunState;
        idempotencyKey: string;
        decisionJson: string | null;
        scoreJson: string | null;
        createdAt: string;
        sealedAt: string | null;
        revealedAt: string | null;
        completedAt: string | null;
      } | undefined;

      return row ? readScenarioRunRow(row) : undefined;
    })();

  if (!record) {
    throw new Error(`Scenario run was not persisted: ${input.idempotencyKey}`);
  }

  if (
    record.userId !== input.userId
    || record.scenarioId !== input.scenarioId
    || record.scenarioVersion !== input.scenarioVersion
  ) {
    throw new Error(`Idempotency key is bound to a different scenario run: ${input.idempotencyKey}`);
  }

  return record;
}

export function sealScenarioRun(
  handle: DatabaseHandle,
  runId: string,
  userId: string,
  decision: DecisionTrace
): ScenarioRunRecord {
  const { sqlite } = handle;
  const parsedDecision = DecisionTraceSchema.parse(decision);
  const current = getScenarioRun(handle, runId, userId);

  if (!current) {
    throw new Error(`Scenario run was not found: ${runId}`);
  }

  if (current.state !== "started") {
    if (current.decision && isDeepStrictEqual(current.decision, parsedDecision)) {
      return current;
    }
    throw new Error(`Scenario run is already sealed: ${runId}`);
  }

  const sealedAt = new Date().toISOString();
  sqlite.prepare(`
    UPDATE scenario_runs
    SET state = 'sealed', decision_json = ?, sealed_at = ?
    WHERE run_id = ? AND user_id = ? AND state = 'started'
  `).run(JSON.stringify(parsedDecision), sealedAt, runId, userId);

  const sealed = getScenarioRun(handle, runId, userId);
  if (!sealed) {
    throw new Error(`Scenario run disappeared while sealing: ${runId}`);
  }

  if (sealed.state !== "sealed" && sealed.state !== "revealed" && sealed.state !== "completed") {
    throw new Error(`Scenario run was not sealed: ${runId}`);
  }

  return sealed;
}

export function revealScenarioRun(
  handle: DatabaseHandle,
  runId: string,
  userId: string
): ScenarioRunRecord {
  const { sqlite } = handle;
  const current = getScenarioRun(handle, runId, userId);

  if (!current) {
    throw new Error(`Scenario run was not found: ${runId}`);
  }

  if (current.state === "started") {
    throw new Error(`Scenario run must be sealed before reveal: ${runId}`);
  }

  if (current.state === "revealed" || current.state === "completed") {
    return current;
  }

  const revealedAt = new Date().toISOString();
  sqlite.prepare(`
    UPDATE scenario_runs
    SET state = 'revealed', revealed_at = ?
    WHERE run_id = ? AND user_id = ? AND state = 'sealed'
  `).run(revealedAt, runId, userId);

  const revealed = getScenarioRun(handle, runId, userId);
  if (!revealed || (revealed.state !== "revealed" && revealed.state !== "completed")) {
    throw new Error(`Scenario run was not revealed: ${runId}`);
  }

  return revealed;
}
