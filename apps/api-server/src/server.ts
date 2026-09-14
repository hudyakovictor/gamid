import Fastify, { type FastifyInstance } from "fastify";

import { starterScenario } from "../../../packages/content/src/fixtures/starter-scenario.js";
import { toPublicScenarioProjection } from "../../../packages/domain/src/scenario.js";

export function buildServer(): FastifyInstance {
  const server = Fastify({ logger: false });

  server.get("/health", async () => ({
    status: "ok",
    service: "api-server"
  }));

  server.get<{ Params: { scenarioId: string } }>(
    "/api/v1/scenarios/:scenarioId",
    async (request, reply) => {
      if (request.params.scenarioId !== starterScenario.scenarioId) {
        return reply.code(404).send({ error: "scenario_not_found" });
      }

      return {
        data: toPublicScenarioProjection(starterScenario)
      };
    }
  );

  return server;
}
