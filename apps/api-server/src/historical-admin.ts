import { z } from "zod";
import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest
} from "fastify";

import { HistoricalMarketSnapshotSchema } from "../../../packages/contracts/src/index.js";
import {
  SnapshotCaptureSchema,
  SnapshotLicensingSchema,
  ReviewPolicyError
} from "../../../packages/domain/src/index.js";
import {
  dryRunHistoricalImport,
  getScenarioReadiness,
  HistoricalImportServiceError,
  ImportCountsByKindSchema,
  DryRunReportSchema,
  ImportSummarySchema,
  importHistoricalPackage,
  ScenarioReadinessReportSchema,
  transitionScenarioReviewStatus,
  type HistoricalImportActor,
  type PersistencePort
} from "../../../packages/db/src/index.js";

/**
 * Historical pipeline admin surface (Batch 01 — Backend).
 *
 * Authenticated, editor-only audit/read/import routes. The central preHandler
 * in server.ts already gates `/api/v1/admin/*` (401 + 403 admin_forbidden);
 * every handler re-checks the session and derives `isEditor` from trusted
 * server configuration (never from request claims), and the service layer
 * enforces authorization again (defense in depth).
 *
 * Leak discipline: no route returns full scenario packages (which carry
 * hidden future data), secrets, or stack traces. Readiness reasons, import
 * summaries, and transition audits are structured operator data.
 */

// ---------------------------------------------------------------------------
// Dependencies.
// ---------------------------------------------------------------------------

export type HistoricalAdminDeps = {
  persistence: PersistencePort;
  editorUserIds: readonly string[];
  getAuthenticatedUserId: (
    request: FastifyRequest,
    reply: FastifyReply
  ) => Promise<string | undefined>;
  now: () => number;
};

/** Import envelopes carry candles; allow well above the 16KB global default. */
const IMPORT_BODY_LIMIT_BYTES = 8 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Route-local schemas (wire shapes; service reports reused as subschemas).
// ---------------------------------------------------------------------------

export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

export const PageInfoSchema = z.object({
  limit: z.number().int().min(1),
  offset: z.number().int().min(0),
  total: z.number().int().min(0)
}).strict();

export const HistoricalImportListItemSchema = z.object({
  importId: z.string().min(1),
  importHash: z.string().min(1),
  status: z.enum(["completed", "conflict", "rejected"]),
  createdBy: z.string().nullable(),
  createdAt: z.string().min(1),
  counts: ImportCountsByKindSchema.nullable(),
  summaryCorrupt: z.boolean()
}).strict();

export const HistoricalImportListResponseSchema = z.object({
  data: z.array(HistoricalImportListItemSchema),
  page: PageInfoSchema
}).strict();

export const HistoricalImportDetailResponseSchema = z.object({
  data: z.object({
    importId: z.string().min(1),
    importHash: z.string().min(1),
    status: z.enum(["completed", "conflict", "rejected"]),
    createdBy: z.string().nullable(),
    createdAt: z.string().min(1),
    summary: ImportSummarySchema
  }).strict()
}).strict();

export const HistoricalSnapshotListItemSchema = z.object({
  snapshotId: z.string().min(1),
  contentHash: z.string().min(1),
  provider: z.string().min(1),
  symbol: z.string().min(1),
  interval: z.string().min(1),
  asOf: z.string().min(1),
  candleCount: z.number().int().min(0),
  createdAt: z.string().min(1)
}).strict();

export const HistoricalSnapshotListResponseSchema = z.object({
  data: z.array(HistoricalSnapshotListItemSchema),
  page: PageInfoSchema
}).strict();

export const ScenarioLinkItemSchema = z.object({
  scenarioId: z.string().min(1),
  scenarioVersion: z.string().min(1),
  snapshotId: z.string().min(1),
  sourceId: z.string().min(1),
  snapshotContentHash: z.string().min(1),
  linkRole: z.string().min(1),
  createdAt: z.string().min(1)
}).strict();

export const HistoricalSnapshotDetailResponseSchema = z.object({
  data: z.object({
    snapshot: HistoricalMarketSnapshotSchema,
    metadata: z.object({
      licensing: SnapshotLicensingSchema.nullable(),
      capture: SnapshotCaptureSchema.nullable()
    }).strict().nullable(),
    links: z.array(ScenarioLinkItemSchema)
  }).strict()
}).strict();

export const ScenarioLinksResponseSchema = z.object({
  data: z.array(ScenarioLinkItemSchema)
}).strict();

export const ReviewTransitionItemSchema = z.object({
  transitionId: z.string().min(1),
  scenarioId: z.string().min(1),
  scenarioVersion: z.string().min(1),
  fromStatus: z.string().min(1),
  toStatus: z.string().min(1),
  actorUserId: z.string().min(1),
  reason: z.string().nullable(),
  createdAt: z.string().min(1)
}).strict();

export const ReviewTransitionsResponseSchema = z.object({
  data: z.array(ReviewTransitionItemSchema)
}).strict();

export const ReadinessResponseSchema = z.object({
  data: ScenarioReadinessReportSchema
}).strict();

export const ReviewTransitionRequestSchema = z.object({
  version: z.string().min(1).max(50),
  status: z.string().min(1).max(50),
  reason: z.string().min(1).max(1000).optional()
});

export const ReviewTransitionResponseSchema = z.object({
  data: z.object({
    scenarioId: z.string().min(1),
    version: z.string().min(1),
    reviewStatus: z.string().min(1),
    fromStatus: z.string().min(1),
    transitionId: z.string().min(1).nullable(),
    noop: z.boolean(),
    readiness: ScenarioReadinessReportSchema
  }).strict()
}).strict();

export const DryRunResponseSchema = z.object({
  data: DryRunReportSchema
}).strict();

export const ImportResponseSchema = z.object({
  data: ImportSummarySchema
}).strict();

// ---------------------------------------------------------------------------
// Shared error mapping (codes only; no secrets, no traces).
// ---------------------------------------------------------------------------

export function toHttpError(error: unknown): {
  status: number;
  body: Record<string, unknown>;
} {
  if (error instanceof HistoricalImportServiceError) {
    if (error.code === "forbidden") {
      return { status: 403, body: { error: "admin_forbidden" } };
    }
    if (error.code === "scenario_not_found") {
      return { status: 404, body: { error: "scenario_not_found" } };
    }
    if (error.code === "publication_not_ready") {
      return {
        status: 422,
        body: {
          error: "publication_not_ready",
          reasons: Array.isArray(error.details) ? error.details : []
        }
      };
    }
    return { status: 500, body: { error: "internal_error" } };
  }
  if (error instanceof ReviewPolicyError) {
    if (error.code === "forbidden") {
      return { status: 403, body: { error: "admin_forbidden" } };
    }
    if (error.code === "unknown_status") {
      return { status: 422, body: { error: "invalid_request" } };
    }
    if (error.code === "invalid_transition") {
      return { status: 422, body: { error: "invalid_transition" } };
    }
    if (error.code === "terminal_state") {
      return { status: 409, body: { error: "terminal_state" } };
    }
    return { status: 500, body: { error: "internal_error" } };
  }
  return { status: 500, body: { error: "internal_error" } };
}

/**
 * Strict review-transition handler shared by the admin review route.
 * Enforces the frozen transition matrix, the publication readiness gate,
 * and the audit trail — never a direct status write.
 */
export async function handleReviewTransition(
  persistence: PersistencePort,
  input: {
    scenarioId: string;
    version: string;
    status: string;
    actor: HistoricalImportActor;
    reason?: string | undefined;
    nowIso: string;
  }
): Promise<{ status: number; body: unknown }> {
  try {
    const result = await transitionScenarioReviewStatus(persistence, {
      scenarioId: input.scenarioId,
      scenarioVersion: input.version,
      toStatus: input.status,
      actor: input.actor,
      ...(input.reason === undefined ? {} : { reason: input.reason }),
      nowIso: input.nowIso
    });
    const body = ReviewTransitionResponseSchema.parse({
      data: {
        scenarioId: result.scenarioId,
        version: result.scenarioVersion,
        reviewStatus: result.toStatus,
        fromStatus: result.fromStatus,
        transitionId: result.transitionId,
        noop: result.noop,
        readiness: {
          scenarioId: result.readiness.scenarioId,
          version: result.readiness.version,
          reviewStatus: result.readiness.reviewStatus,
          ready: result.readiness.ready,
          reasons: [...result.readiness.reasons]
        }
      }
    });
    return { status: 200, body };
  } catch (error) {
    return toHttpError(error);
  }
}

// ---------------------------------------------------------------------------
// Route registration.
// ---------------------------------------------------------------------------

export function registerHistoricalAdminRoutes(
  server: FastifyInstance,
  deps: HistoricalAdminDeps
): void {
  const { persistence } = deps;

  async function editorActor(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<HistoricalImportActor | undefined> {
    const authenticatedUserId = await deps.getAuthenticatedUserId(request, reply);
    if (!authenticatedUserId) {
      return undefined;
    }
    // Belt and suspenders: the central preHandler already enforces this, but
    // authorization must never depend on routing configuration alone.
    if (!deps.editorUserIds.includes(authenticatedUserId)) {
      void reply.code(403).send({ error: "admin_forbidden" });
      return undefined;
    }
    return { userId: authenticatedUserId, isEditor: true };
  }

  function pagination(request: FastifyRequest, reply: FastifyReply): {
    limit: number;
    offset: number;
  } | undefined {
    const parsed = PaginationQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      void reply.code(422).send({ error: "invalid_request" });
      return undefined;
    }
    return parsed.data;
  }

  server.post(
    "/api/v1/admin/historical/imports/dry-run",
    { bodyLimit: IMPORT_BODY_LIMIT_BYTES },
    async (request, reply) => {
      const actor = await editorActor(request, reply);
      if (!actor) return;
      try {
        const report = await dryRunHistoricalImport(persistence, request.body, actor);
        return reply.code(200).send(DryRunResponseSchema.parse({ data: report }));
      } catch (error) {
        const mapped = toHttpError(error);
        return reply.code(mapped.status).send(mapped.body);
      }
    }
  );

  server.post(
    "/api/v1/admin/historical/imports",
    { bodyLimit: IMPORT_BODY_LIMIT_BYTES },
    async (request, reply) => {
      const actor = await editorActor(request, reply);
      if (!actor) return;
      try {
        const summary = await importHistoricalPackage(
          persistence,
          request.body,
          actor,
          { nowIso: new Date(deps.now()).toISOString() }
        );
        const body = ImportResponseSchema.parse({ data: summary });
        if (summary.status === "rejected") {
          // Ephemeral report: nothing persisted, issues are actionable.
          return reply.code(422).send(body);
        }
        return reply.code(summary.duplicate ? 200 : 201).send(body);
      } catch (error) {
        const mapped = toHttpError(error);
        return reply.code(mapped.status).send(mapped.body);
      }
    }
  );

  server.get("/api/v1/admin/historical/imports", async (request, reply) => {
    const actor = await editorActor(request, reply);
    if (!actor) return;
    const page = pagination(request, reply);
    if (!page) return;
    const [records, total] = await Promise.all([
      persistence.listHistoricalImports({ limit: page.limit, offset: page.offset }),
      persistence.countHistoricalImports()
    ]);
    const data = records.map((record) => {
      let counts: unknown = null;
      let summaryCorrupt = true;
      try {
        const parsed = ImportSummarySchema.safeParse(JSON.parse(record.summaryJson) as unknown);
        if (parsed.success) {
          counts = parsed.data.counts;
          summaryCorrupt = false;
        }
      } catch {
        counts = null;
        summaryCorrupt = true;
      }
      return HistoricalImportListItemSchema.parse({
        importId: record.importId,
        importHash: record.importHash,
        status: record.status,
        createdBy: record.createdBy,
        createdAt: record.createdAt,
        counts,
        summaryCorrupt
      });
    });
    return reply.code(200).send(HistoricalImportListResponseSchema.parse({
      data,
      page: { ...page, total }
    }));
  });

  server.get<{ Params: { importId: string } }>(
    "/api/v1/admin/historical/imports/:importId",
    async (request, reply) => {
      const actor = await editorActor(request, reply);
      if (!actor) return;
      const record = await persistence.getHistoricalImport(request.params.importId);
      if (!record) {
        return reply.code(404).send({ error: "import_not_found" });
      }
      let summary: unknown;
      try {
        const parsed = ImportSummarySchema.safeParse(JSON.parse(record.summaryJson) as unknown);
        if (!parsed.success) {
          return reply.code(500).send({ error: "internal_error" });
        }
        summary = parsed.data;
      } catch {
        return reply.code(500).send({ error: "internal_error" });
      }
      return reply.code(200).send(HistoricalImportDetailResponseSchema.parse({
        data: {
          importId: record.importId,
          importHash: record.importHash,
          status: record.status,
          createdBy: record.createdBy,
          createdAt: record.createdAt,
          summary
        }
      }));
    }
  );

  server.get("/api/v1/admin/historical/snapshots", async (request, reply) => {
    const actor = await editorActor(request, reply);
    if (!actor) return;
    const page = pagination(request, reply);
    if (!page) return;
    const [records, total] = await Promise.all([
      persistence.listHistoricalSnapshots({ limit: page.limit, offset: page.offset }),
      persistence.countHistoricalSnapshots()
    ]);
    const data = records.map((record) => HistoricalSnapshotListItemSchema.parse({
      snapshotId: record.snapshotId,
      contentHash: record.contentHash,
      provider: record.provider,
      symbol: record.symbol,
      interval: record.interval,
      asOf: record.asOf,
      candleCount: record.candleCount,
      createdAt: record.createdAt
    }));
    return reply.code(200).send(HistoricalSnapshotListResponseSchema.parse({
      data,
      page: { ...page, total }
    }));
  });

  server.get<{ Params: { snapshotId: string } }>(
    "/api/v1/admin/historical/snapshots/:snapshotId",
    async (request, reply) => {
      const actor = await editorActor(request, reply);
      if (!actor) return;
      const record = await persistence.getHistoricalSnapshot(request.params.snapshotId);
      if (!record) {
        return reply.code(404).send({ error: "snapshot_not_found" });
      }
      const snapshot = HistoricalMarketSnapshotSchema.safeParse(record.snapshot);
      if (!snapshot.success) {
        return reply.code(500).send({ error: "internal_error" });
      }
      const [metadata, links] = await Promise.all([
        persistence.getSnapshotMetadata(record.snapshotId),
        persistence.listLinksForSnapshot(record.snapshotId)
      ]);
      let licensing: unknown = null;
      let capture: unknown = null;
      if (metadata?.licensingJson) {
        try {
          const parsed = SnapshotLicensingSchema.safeParse(JSON.parse(metadata.licensingJson) as unknown);
          licensing = parsed.success ? parsed.data : null;
        } catch {
          licensing = null;
        }
      }
      if (metadata?.captureJson) {
        try {
          const parsed = SnapshotCaptureSchema.safeParse(JSON.parse(metadata.captureJson) as unknown);
          capture = parsed.success ? parsed.data : null;
        } catch {
          capture = null;
        }
      }
      return reply.code(200).send(HistoricalSnapshotDetailResponseSchema.parse({
        data: {
          snapshot: snapshot.data,
          metadata: metadata ? { licensing, capture } : null,
          links: links.map((link) => ScenarioLinkItemSchema.parse({ ...link }))
        }
      }));
    }
  );

  server.get<{ Params: { scenarioId: string; version: string } }>(
    "/api/v1/admin/historical/scenarios/:scenarioId/versions/:version/readiness",
    async (request, reply) => {
      const actor = await editorActor(request, reply);
      if (!actor) return;
      try {
        const readiness = await getScenarioReadiness(
          persistence,
          request.params.scenarioId,
          request.params.version
        );
        return reply.code(200).send(ReadinessResponseSchema.parse({
          data: {
            scenarioId: readiness.scenarioId,
            version: readiness.version,
            reviewStatus: readiness.reviewStatus,
            ready: readiness.ready,
            reasons: [...readiness.reasons]
          }
        }));
      } catch (error) {
        const mapped = toHttpError(error);
        return reply.code(mapped.status).send(mapped.body);
      }
    }
  );

  server.get<{ Params: { scenarioId: string; version: string } }>(
    "/api/v1/admin/historical/scenarios/:scenarioId/versions/:version/links",
    async (request, reply) => {
      const actor = await editorActor(request, reply);
      if (!actor) return;
      const column = await persistence.getScenarioReviewStatusColumn(
        request.params.scenarioId,
        request.params.version
      );
      if (column === undefined) {
        return reply.code(404).send({ error: "scenario_not_found" });
      }
      const links = await persistence.listScenarioSnapshotLinks(
        request.params.scenarioId,
        request.params.version
      );
      return reply.code(200).send(ScenarioLinksResponseSchema.parse({
        data: links.map((link) => ScenarioLinkItemSchema.parse({ ...link }))
      }));
    }
  );

  server.get<{ Params: { scenarioId: string; version: string } }>(
    "/api/v1/admin/historical/scenarios/:scenarioId/versions/:version/transitions",
    async (request, reply) => {
      const actor = await editorActor(request, reply);
      if (!actor) return;
      const column = await persistence.getScenarioReviewStatusColumn(
        request.params.scenarioId,
        request.params.version
      );
      if (column === undefined) {
        return reply.code(404).send({ error: "scenario_not_found" });
      }
      const transitions = await persistence.listReviewTransitions(
        request.params.scenarioId,
        request.params.version
      );
      return reply.code(200).send(ReviewTransitionsResponseSchema.parse({
        data: transitions.map((row) => ReviewTransitionItemSchema.parse({ ...row }))
      }));
    }
  );
}
