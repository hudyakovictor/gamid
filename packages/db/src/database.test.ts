import assert from "node:assert/strict";
import test from "node:test";

import { starterScenario } from "../../content/src/fixtures/starter-scenario.js";
import {
  applyMigrations,
  closeDatabase,
  createDatabase,
  createScenarioRun,
  getScenarioPackage,
  seedFoundation
} from "./index.js";

test("migrations are idempotent and create the foundation schema", () => {
  const handle = createDatabase();

  handle.sqlite.exec("SELECT 1");
  const before = handle.sqlite
    .prepare("SELECT COUNT(*) AS count FROM _migrations")
    .get() as { count: number };

  applyMigrations(handle.sqlite);
  const after = handle.sqlite
    .prepare("SELECT COUNT(*) AS count FROM _migrations")
    .get() as { count: number };
  const tables = handle.sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all() as Array<{ name: string }>;

  assert.equal(before.count, 1);
  assert.equal(after.count, 1);
  assert.deepEqual(tables.map((table) => table.name), [
    "_migrations",
    "scenario_runs",
    "scenarios",
    "users"
  ]);

  closeDatabase(handle);
});

test("seed is repeatable and stores the full server-side package", () => {
  const handle = createDatabase();

  seedFoundation({
    ...handle,
    scenario: starterScenario
  });
  seedFoundation({
    ...handle,
    scenario: starterScenario
  });
  seedFoundation({
    ...handle,
    scenario: {
      ...starterScenario,
      version: "1.1.0",
      contentVersion: "content-foundation-2"
    }
  });

  const scenario = handle.sqlite.prepare(`
    SELECT scenario_id AS scenarioId, package_json AS packageJson
    FROM scenarios
  `).get() as { scenarioId: string; packageJson: string };
  const parsedPackage = JSON.parse(scenario.packageJson) as {
    hiddenEntities: string[];
    historicalFutureSegment: { contentHash: string };
  };
  const counts = handle.sqlite.prepare(`
    SELECT
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM scenarios) AS scenarios
  `).get() as { users: number; scenarios: number };

  assert.equal(counts.users, 1);
  assert.equal(counts.scenarios, 2);
  assert.deepEqual(parsedPackage.hiddenEntities, ["fake_breakout_phantom"]);
  assert.equal(parsedPackage.historicalFutureSegment.contentHash, "sha256:fixture-future-001");
  assert.deepEqual(
    getScenarioPackage(handle, starterScenario.scenarioId, starterScenario.version),
    starterScenario
  );
  assert.equal(
    getScenarioPackage(handle, starterScenario.scenarioId, "missing"),
    undefined
  );

  closeDatabase(handle);
});

test("scenario run creation is idempotent by idempotency key", () => {
  const handle = createDatabase();
  seedFoundation({
    ...handle,
    scenario: starterScenario
  });

  const first = createScenarioRun(handle, {
    runId: "run-001",
    userId: "seed-user-001",
    scenarioId: starterScenario.scenarioId,
    scenarioVersion: starterScenario.version,
    idempotencyKey: "decision-submit-001"
  });
  const retry = createScenarioRun(handle, {
    runId: "run-002",
    userId: "seed-user-001",
    scenarioId: starterScenario.scenarioId,
    scenarioVersion: starterScenario.version,
    idempotencyKey: "decision-submit-001"
  });

  assert.equal(first.runId, "run-001");
  assert.deepEqual(retry, first);

  const count = handle.sqlite
    .prepare("SELECT COUNT(*) AS count FROM scenario_runs")
    .get() as { count: number };
  assert.equal(count.count, 1);

  closeDatabase(handle);
});

test("scenario runs enforce user and scenario-version foreign keys", () => {
  const handle = createDatabase();
  seedFoundation({ ...handle, scenario: starterScenario });

  assert.throws(() =>
    createScenarioRun(handle, {
      runId: "run-missing-scenario",
      userId: "seed-user-001",
      scenarioId: starterScenario.scenarioId,
      scenarioVersion: "9.9.9",
      idempotencyKey: "missing-scenario-version"
    })
  );

  assert.throws(() =>
    createScenarioRun(handle, {
      runId: "run-missing-user",
      userId: "missing-user",
      scenarioId: starterScenario.scenarioId,
      scenarioVersion: starterScenario.version,
      idempotencyKey: "missing-user"
    })
  );

  closeDatabase(handle);
});
