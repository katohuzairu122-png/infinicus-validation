import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { TwinComputationService } from '@infinicus/workflow';
import { BusinessRepository } from '@infinicus/database';
import { businessIdParamsSchema, twinResponseSchema } from '../schemas/twin.js';
import { errorResponseSchema } from '../schemas/common.js';

const twins = new TwinComputationService();
const businesses = new BusinessRepository();

export default async function twinRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.get('/v1/businesses/:businessId/twin', {
    schema: {
      tags: ['twin'],
      summary: 'Get the business\'s Digital Twin snapshot (cached up to 1 hour, recomputed from the event ledger on cache miss)',
      params: businessIdParamsSchema,
      response: { 200: twinResponseSchema, 401: errorResponseSchema, 403: errorResponseSchema, 404: errorResponseSchema },
    },
    preHandler: [app.authenticate, app.resolveTenantContext, app.requirePermission('dt:read')],
  }, async (request, reply) => {
    const { businessId } = request.params;
    await businesses.getById(request.ctx!, businessId);
    const result = await twins.getOrComputeTwin(request.ctx!, businessId);
    return reply.status(200).send(result);
  });

  server.post('/v1/businesses/:businessId/twin/refresh', {
    schema: {
      tags: ['twin'],
      summary: 'Force-recompute the business\'s Digital Twin snapshot from the current event ledger',
      params: businessIdParamsSchema,
      response: { 200: twinResponseSchema, 401: errorResponseSchema, 403: errorResponseSchema, 404: errorResponseSchema },
    },
    preHandler: [app.authenticate, app.resolveTenantContext, app.requirePermission('dt:write'), app.requireActiveSubscription(), app.requireIdempotencyKey],
  }, async (request, reply) => {
    const { businessId } = request.params;
    await businesses.getById(request.ctx!, businessId);
    const result = await twins.getOrComputeTwin(request.ctx!, businessId, { forceRefresh: true });
    return reply.status(200).send(result);
  });
}
