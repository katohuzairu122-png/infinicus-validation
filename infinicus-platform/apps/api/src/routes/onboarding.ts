import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { OnboardingService } from '@infinicus/onboarding';
import { beginOnboardingBodySchema, beginOnboardingResponseSchema, activeOnboardingResponseSchema } from '../schemas/onboarding.js';
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
