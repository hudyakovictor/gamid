# Signal Arena API Server

Foundation-only Fastify service.

Current endpoints:

- `GET /health`
- `GET /api/v1/scenarios/:scenarioId` — returns the public ScenarioPackage projection only.

The fixture endpoint intentionally does not expose hidden Entities, historical future, outcome, debrief, rematch logic, or evaluation rules. Persistence, authentication, decision locking, reveal, and scoring submission remain later iterations.
