import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { OnboardingService } from '@infinicus/onboarding';
import {
  beginOnboardingBodySchema, beginOnboardingResponseSchema, activeOnboardingResponseSchema,
  onboardingIdParamsSchema, assignOwnerBodySchema, assignOwnerResponseSchema,
  setOnboardingBusinessBodySchema, setOnboardingBusinessResponseSchema,
} from '../schemas/onboarding.js';
import { errorResponseSchema } from '../schemas/common.js';

const onboarding = new OnboardingService();

export default async function onboardingRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.post('/v1/onboarding', {
    schema: {
      tags: ['onboarding'],
      summary: 'Begin tenant onboarding: creates the tenant and its first workspace',
      body: beginOnboardingBodySchema,
      response: { 201: beginOnboardingResponseSchema, 401: errorResponseSchema, 409: errorResponseSchema },
    },
    preHandler: [app.authenticate],
    // No Idempotency-Key here: this route runs before any tenant context
    // exists (it *creates* the tenant), and this API's idempotency
    // mechanism is tenant-scoped by design (see plugins/idempotency.ts) —
    // the same bootstrapping constraint documented for
    // TenantRepository/OnboardingProgressRepository in BUILD-19. A
    // duplicate call already gets clear, safe signal via
    // TenantSlugConflictError (409) on the reused tenantSlug.
  }, async (request, reply) => {
    const userId = request.session!.user.id;
    const { tenant, workspace, progress } = await onboarding.beginOnboarding(userId, request.body);
    return reply.status(201).send({
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status },
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug, status: workspace.status },
      progress: { id: progress.id, currentStep: progress.currentStep, status: progress.status },
    });
  });

  // Step 2 — must run before step 3 (assignOwner below): STEP_ORDER
  // enforces strict sequential progression, so a caller cannot skip
  // straight from step 1 (workspace_created) to step 3 (owner_assigned).
  // Superseded for creating *additional* businesses on an
  // already-onboarded tenant by POST /v1/businesses, which needs no
  // onboarding-sequence bookkeeping at all — this route exists
  // specifically to satisfy that ordering for the very first business.
  server.post('/v1/onboarding/:onboardingId/business', {
    schema: {
      tags: ['onboarding'],
      summary: 'Step 2: register the onboarding tenant\'s first business',
      params: onboardingIdParamsSchema,
      body: setOnboardingBusinessBodySchema,
      response: { 201: setOnboardingBusinessResponseSchema, 401: errorResponseSchema, 403: errorResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
    },
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { tenantId, workspaceId, ...input } = request.body;
    const ctx = { tenantId, workspaceId, userId: request.session!.user.id };
    const { business, progress } = await onboarding.setBusiness(ctx, request.params.onboardingId, input);
    return reply.status(201).send({
      business: { id: business.id, legalName: business.legalName, businessCode: business.businessCode, status: business.status, industry: business.industry },
      progress: { id: progress.id, currentStep: progress.currentStep, status: progress.status },
    });
  });

  // Step 3 of OnboardingService's 6-step sequence — was previously
  // implemented in the service layer but never wired to a route, meaning
  // no caller could actually get past step 1 (tenant/workspace creation)
  // via the HTTP API: every subsequent route requires resolveTenantContext,
  // which requires an active membership, which only this step creates.
  // Steps 2 (business creation — superseded by POST /v1/businesses),
  // 4 (settings), 5 (invitations), and 6 (completion) remain unwired;
  // this route unblocks the one step genuinely required for a caller to
  // do anything else in the API at all.
  server.post('/v1/onboarding/:onboardingId/owner', {
    schema: {
      tags: ['onboarding'],
      summary: 'Step 3: create and activate the initiating user\'s membership, granting the owner role',
      params: onboardingIdParamsSchema,
      body: assignOwnerBodySchema,
      response: { 201: assignOwnerResponseSchema, 401: errorResponseSchema, 403: errorResponseSchema, 404: errorResponseSchema },
    },
    // Not resolveTenantContext: no membership exists yet for it to find
    // (this route creates the first one) — see assignOwnerBodySchema's
    // own comment. OnboardingService.assignOwner itself verifies the
    // caller actually initiated this onboarding attempt before granting
    // anything, so a caller supplying someone else's tenantId/workspaceId
    // here gets rejected there, not trusted here.
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const ctx = { tenantId: request.body.tenantId, workspaceId: request.body.workspaceId, userId: request.session!.user.id };
    const { membership, progress } = await onboarding.assignOwner(ctx, request.params.onboardingId);
    return reply.status(201).send({
      membership: { id: membership.id, tenantId: membership.tenantId, workspaceId: membership.workspaceId, userId: membership.userId, status: membership.status },
      progress: { id: progress.id, currentStep: progress.currentStep, status: progress.status },
    });
  });

  server.get('/v1/onboarding/active', {
    schema: {
      tags: ['onboarding'],
      summary: 'Resume: finds the caller\'s own in-progress onboarding attempt, if any',
      response: { 200: activeOnboardingResponseSchema, 401: errorResponseSchema },
    },
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const userId = request.session!.user.id;
    const active = await onboarding.resumeOnboarding(userId);
    if (!active) return reply.status(200).send(null);
    return reply.status(200).send({
      id: active.id, tenantId: active.tenantId, workspaceId: active.workspaceId,
      currentStep: active.currentStep, status: active.status,
    });
  });
}
