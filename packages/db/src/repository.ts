import {
  ScenarioPackageSchema,
  type ScenarioPackage
} from "../../contracts/src/scenario.js";
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
  createdAt: string;
};

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

export function createScenarioRun(
  { sqlite }: DatabaseHandle,
  input: CreateScenarioRunInput
): ScenarioRunRecord {
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

  const record = sqlite.prepare(`
    SELECT
      run_id AS runId,
      user_id AS userId,
      scenario_id AS scenarioId,
      scenario_version AS scenarioVersion,
      state,
      idempotency_key AS idempotencyKey,
      created_at AS createdAt
    FROM scenario_runs
    WHERE idempotency_key = ?
  `).get(input.idempotencyKey) as ScenarioRunRecord | undefined;

  if (!record) {
    throw new Error(`Scenario run was not persisted: ${input.idempotencyKey}`);
  }

  return record;
}
