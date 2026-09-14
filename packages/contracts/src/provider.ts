import { z } from "zod";

const IsoDate = z.string().datetime({ offset: true });
const Decimal = z.string().regex(/^(0|[1-9][0-9]*)(\.[0-9]+)?$/);

export const HistoricalCandleSchema = z.object({
  openTime: IsoDate,
  closeTime: IsoDate,
  open: Decimal,
  high: Decimal,
  low: Decimal,
  close: Decimal,
  volume: Decimal
}).strict();

export const SnapshotProvenanceSchema = z.object({
  sourceReference: z.string().url(),
  observedAt: IsoDate,
  availableAt: IsoDate,
  timezone: z.string().min(1),
  reliability: z.enum(["low", "medium", "high"]),
  contentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  revisionStatus: z.enum(["original", "revised", "superseded"])
}).strict();

export const HistoricalMarketSnapshotSchema = z.object({
  provider: z.literal("binance"),
  symbol: z.string().regex(/^[A-Z0-9]{2,20}$/),
  interval: z.string().min(1),
  asOf: IsoDate,
  candles: z.array(HistoricalCandleSchema).min(1).max(1000),
  provenance: SnapshotProvenanceSchema
}).strict();

export type HistoricalCandle = z.infer<typeof HistoricalCandleSchema>;
export type SnapshotProvenance = z.infer<typeof SnapshotProvenanceSchema>;
export type HistoricalMarketSnapshot = z.infer<typeof HistoricalMarketSnapshotSchema>;
