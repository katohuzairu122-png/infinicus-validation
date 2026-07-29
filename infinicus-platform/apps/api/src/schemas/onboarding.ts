import { z } from 'zod';

export const beginOnboardingBodySchema = z.object({
  tenantName: z.string().min(1).max(255),
  tenantSlug: z.string().min(1).max(255),
  workspaceName: z.string().min(1).max(255),
  workspaceSlug: z.string().min(1).max(255),
  planCode: z.string().max(255).optional(),
});

export const beginOnboardingResponseSchema = z.object({
  tenant: z.object({ id: z.string().uuid(), name: z.string(), slug: z.string(), status: z.string() }),
  workspace: z.object({ id: z.string().uuid(), name: z.string(), slug: z.string(), status: z.string() }),
  progress: z.object({ id: z.string().uuid(), currentStep: z.string(), status: z.string() }),
});

export const activeOnboardingResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  currentStep: z.string(),
  status: z.string(),
}).nullable();
