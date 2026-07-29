import { z } from 'zod';

export const metricsResponseSchema = z.object({
  timestamp: z.string(),
  process: z.object({
    uptimeSeconds: z.number(),
    memoryRssBytes: z.number(),
  }),
  databasePool: z.object({
    totalCount: z.number(),
    idleCount: z.number(),
    waitingCount: z.number(),
  }),
  errors: z.object({
    last15Minutes: z.number(),
  }),
  outbox: z.object({
    pendingCount: z.number(),
    failedCount: z.number(),
    deadLetteredCount: z.number(),
    oldestPendingAgeSeconds: z.number().nullable(),
  }),
  activeAlertCount: z.number(),
});
