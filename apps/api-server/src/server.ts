import { randomUUID } from "node:crypto";

import Fastify, { type FastifyInstance } from "fastify";

import { starterScenario } from "../../../packages/content/src/fixtures/starter-scenario.js";
import {
  DecisionTraceSchema,
  ScenarioRunStartRequestSchema
} from "../../../packages/contracts/src/index.js";
import {
  closeDatabase,
  createDatabase,
  createScenarioRun,
  getScenarioPackage,
  getScenarioRun,
  revealScenarioRun,
  sealScenarioRun,
  seedFoundation,
  type DatabaseHandle,
  type ScenarioRunRecord
} from "../../../packages/db/src/index.js";
import {
  assertDecisionTraceAllowed,
  toPublicScenarioProjection,
  toScenarioRevealProjection
} from "../../../packages/domain/src/index.js";

const FOUNDATION_USER_ID = "seed-user-001";

export type BuildServerOptions = {
  database?: DatabaseHandle;
  userId?: string;
};

function toRunResponse(run: ScenarioRunRecord): Record<string, unknown> {
  const response: Record<string, unknown> = {
    runId: run.runId,
    scenarioId: run.scenarioId,
    scenarioVersion: run.scenarioVersion,
    state: run.state,
    createdAt: run.createdAt,
    sealedAt: run.sealedAt,
    revealedAt: run.revealedAt,
    completedAt: run.completedAt
  };

  if (run.decision) {
    response.decision = run.decision;
  }

  return response;
}

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const database = options.database ?? createDatabase();
  const userId = options.userId ?? FOUNDATION_USER_ID;

  seedFoundation({
    ...database,
    scenario: starterScenario,
    userId,
    externalId: `fixture:${userId}`
  });

  const server = Fastify({ logger: false });

  server.addHook("onClose", async () => {
    closeDatabase(database);
  });

  server.get("/health", async () => ({
    status: "ok",
    service: "api-server"
  }));

  server.get<{
    Params: { scenarioId: string };
    Querystring: { version?: string };
  }>(
    "/api/v1/scenarios/:scenarioId",
    async (request, reply) => {
      const version = request.query.version ?? starterScenario.version;
      const scenario = getScenarioPackage(database, request.params.scenarioId, version);

      if (!scenario) {
        return reply.code(404).send({ error: "scenario_not_found" });
      }

      return {
        data: toPublicScenarioProjection(scenario)
      };
    }
  );

  server.post<{
    Body: unknown;
  }>("/api/v1/scenario-runs", async (request, reply) => {
    const parsed = ScenarioRunStartRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_request",
        issues: parsed.error.issues
      });
    }

    const scenario = getScenarioPackage(
      database,
      parsed.data.scenarioId,
      parsed.data.scenarioVersion
    );
    if (!scenario) {
      return reply.code(404).send({ error: "scenario_not_found" });
    }

    try {
      const run = createScenarioRun(database, {
        runId: randomUUID(),
        userId,
        scenarioId: parsed.data.scenarioId,
        scenarioVersion: parsed.data.scenarioVersion,
        idempotencyKey: parsed.data.idempotencyKey
      });

      return reply.code(201).send({
        data: {
          run: toRunResponse(run),
          scenario: toPublicScenarioProjection(scenario)
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "scenario_run_failed";
      return reply.code(409).send({ error: "scenario_run_conflict", message });
    }
  });

  server.post<{
    Params: { runId: string };
    Body: unknown;
  }>("/api/v1/scenario-runs/:runId/seal", async (request, reply) => {
    const decision = DecisionTraceSchema.safeParse(request.body);
    if (!decision.success) {
      return reply.code(400).send({
        error: "invalid_decision",
        issues: decision.error.issues
      });
    }

    const current = getScenarioRun(database, request.params.runId, userId);
    if (!current) {
      return reply.code(404).send({ error: "scenario_run_not_found" });
    }

    const scenario = getScenarioPackage(
      database,
      current.scenarioId,
      current.scenarioVersion
    );
    if (!scenario) {
      return reply.code(500).send({ error: "scenario_package_missing" });
    }

    try {
      assertDecisionTraceAllowed(scenario, decision.data);
      const sealed = sealScenarioRun(
        database,
        request.params.runId,
        userId,
        decision.data
      );

      return {
        data: {
          run: toRunResponse(sealed)
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "scenario_seal_failed";
      const statusCode = message.includes("already sealed") ? 409 : 422;
      return reply.code(statusCode).send({
        error: statusCode === 409 ? "scenario_run_already_sealed" : "invalid_decision",
        message
      });
    }
  });

  server.get<{
    Params: { runId: string };
  }>("/api/v1/scenario-runs/:runId/reveal", async (request, reply) => {
    const current = getScenarioRun(database, request.params.runId, userId);
    if (!current) {
      return reply.code(404).send({ error: "scenario_run_not_found" });
    }

    if (current.state === "started") {
      return reply.code(409).send({ error: "scenario_run_not_sealed" });
    }

    const scenario = getScenarioPackage(
      database,
      current.scenarioId,
      current.scenarioVersion
    );
    if (!scenario) {
      return reply.code(500).send({ error: "scenario_package_missing" });
    }

    const revealed = revealScenarioRun(database, request.params.runId, userId);
    return {
      data: {
        run: toRunResponse(revealed),
        reveal: toScenarioRevealProjection(scenario)
      }
    };
  });

  return server;
}
