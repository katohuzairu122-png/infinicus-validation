import { z } from 'zod';

export const businessIdParamsSchema = z.object({
  businessId: z.string().uuid(),
});

export const twinResponseSchema = z.object({
  twin: z.object({
    businessId: z.string().uuid(),
    snapshotAt: z.string(),
    windowDays: z.number(),
    financial: z.object({
      profit30d: z.number(),
      revenue30d: z.number(),
      salesCount30d: z.number(),
      expenses30d: z.number(),
      burnRatePerDay: z.number(),
    }),
    customers: z.object({
      new30d: z.number(),
      returning30d: z.number(),
      churned30d: z.number(),
      churnRatePct: z.number(),
    }),
    operations: z.object({
      netInventoryUnits30d: z.number(),
    }),
    team: z.object({
      hired30d: z.number(),
      terminated30d: z.number(),
      netHeadcountDelta: z.number(),
    }),
  }),
  cached: z.boolean(),
});
