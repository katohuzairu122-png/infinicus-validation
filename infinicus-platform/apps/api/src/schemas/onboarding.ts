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

export const onboardingIdParamsSchema = z.object({
  onboardingId: z.string().uuid(),
});

// No membership exists yet at this bootstrapping step (this route is what
// creates the first one) — X-Tenant-Id/X-Workspace-Id + resolveTenantContext's
// active-membership check can't be used here the way every other route
// uses them, so tenantId/workspaceId (already known to the caller from
// step 1's own response) are supplied directly in the body instead.
export const assignOwnerBodySchema = z.object({
  tenantId: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

export const setOnboardingBusinessBodySchema = z.object({
  tenantId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  legalName: z.string().min(1).max(500),
  tradingName: z.string().min(1).max(500).optional(),
  businessCode: z.string().min(1).max(255),
  industry: z.string().min(1).max(255).optional(),
  legalStructure: z.string().min(1).max(255).optional(),
  businessModel: z.string().min(1).max(255).optional(),
});

export const setOnboardingBusinessResponseSchema = z.object({
  business: z.object({ id: z.string().uuid(), legalName: z.string(), businessCode: z.string(), status: z.string(), industry: z.string().nullable() }),
  progress: z.object({ id: z.string().uuid(), currentStep: z.string(), status: z.string() }),
});

export const assignOwnerResponseSchema = z.object({
  membership: z.object({ id: z.string().uuid(), tenantId: z.string().uuid(), workspaceId: z.string().uuid(), userId: z.string().uuid(), status: z.string() }),
  progress: z.object({ id: z.string().uuid(), currentStep: z.string(), status: z.string() }),
});

export const activeOnboardingResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  currentStep: z.string(),
  status: z.string(),
}).nullable();
