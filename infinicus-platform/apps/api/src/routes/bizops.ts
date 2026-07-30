import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { BusinessRepository, BusinessEventRepository } from '@infinicus/database';
import {
  businessIdParamsSchema, logEventBodySchema, logEventResponseSchema,
  eventsSummaryQuerySchema, eventsSummaryResponseSchema,
} from '../schemas/bizops.js';
import { errorResponseSchema } from '../schemas/common.js';

const businesses = new BusinessRepository();
const events = new BusinessEventRepository();

export default async function bizopsRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.post('/v1/businesses/:businessId/events', {
    schema: {
      tags: ['operations'],
      summary: 'Log a business operational event (sale, expense, inventory, customer, or team)',
      params: businessIdParamsSchema,
      body: logEventBodySchema,
      response: { 201: logEventResponseSchema, 401: errorResponseSchema, 403: errorResponseSchema, 404: errorResponseSchema },
    },
    preHandler: [app.authenticate, app.resolveTenantContext, app.requirePermission('bo:write'), app.requireActiveSubscription(), app.requireIdempotencyKey],
  }, async (request, reply) => {
    const { businessId } = request.params;
    await businesses.getById(request.ctx!, businessId); // 404s cleanly if the business doesn't exist/isn't in this tenant
    const event = await events.logEvent(request.ctx!, { businessId, ...request.body });
    return reply.status(201).send({ id: event.id, eventType: event.eventType });
  });

  server.get('/v1/businesses/:businessId/events/summary', {
    schema: {
      tags: ['operations'],
      summary: 'KPI summary (sales, expenses, inventory, customers, team) for a business over a date range',
      params: businessIdParamsSchema,
      querystring: eventsSummaryQuerySchema,
      response: { 200: eventsSummaryResponseSchema, 401: errorResponseSchema, 403: errorResponseSchema, 404: errorResponseSchema },
    },
    preHandler: [app.authenticate, app.resolveTenantContext, app.requirePermission('bo:read')],
  }, async (request, reply) => {
    const { businessId } = request.params;
    const { from, to } = request.query;
    await businesses.getById(request.ctx!, businessId);

    const [sales, expenses, inventory, customers, team] = await Promise.all([
      events.aggregateSales(request.ctx!, businessId, from, to),
      events.aggregateExpenses(request.ctx!, businessId, from, to),
      events.aggregateInventory(request.ctx!, businessId, from, to),
      events.aggregateCustomers(request.ctx!, businessId, from, to),
      events.aggregateTeam(request.ctx!, businessId, from, to),
    ]);

    const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000));
    return reply.status(200).send({
      businessId,
      period: { from: from.toISOString(), to: to.toISOString(), days },
      summary: { sales, expenses, inventory, customers, team },
    });
  });
}
