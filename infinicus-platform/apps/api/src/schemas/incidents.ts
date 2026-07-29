import { z } from 'zod';

export const declareIncidentBodySchema = z.object({
  severity: z.enum(['sev1', 'sev2', 'sev3', 'sev4']),
  title: z.string().min(1).max(255),
  description: z.string().min(1).max(10_000),
  affectedSystems: z.array(z.string().max(255)).max(50).optional(),
  affectedTenantIds: z.array(z.string().uuid()).max(1000).optional(),
});

export const addIncidentUpdateBodySchema = z.object({
  message: z.string().min(1).max(10_000),
  statusAtUpdate: z.enum(['investigating', 'identified', 'monitoring', 'resolved']),
  isCustomerFacing: z.boolean().default(false),
});

export const resolveIncidentBodySchema = z.object({
  postmortemUrl: z.string().url().max(2048).optional(),
});

export const incidentResponseSchema = z.object({
  id: z.string().uuid(),
  severity: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.string(),
  affectedSystems: z.array(z.string()),
  affectedTenantIds: z.array(z.string()),
  declaredBy: z.string(),
  postmortemUrl: z.string().nullable(),
  declaredAt: z.string(),
  resolvedAt: z.string().nullable(),
});

export const incidentListResponseSchema = z.object({
  incidents: z.array(incidentResponseSchema),
});

export const incidentUpdateResponseSchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid(),
  message: z.string(),
  statusAtUpdate: z.string(),
  isCustomerFacing: z.boolean(),
  postedBy: z.string(),
  postedAt: z.string(),
});

export const incidentTimelineResponseSchema = z.object({
  updates: z.array(incidentUpdateResponseSchema),
});

export const incidentIdParamsSchema = z.object({
  incidentId: z.string().uuid(),
});
