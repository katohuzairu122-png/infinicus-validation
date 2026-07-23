import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { PlatformIncidentRepository, type PlatformIncident, type PlatformIncidentUpdate } from '@infinicus/database';
import {
  declareIncidentBodySchema, addIncidentUpdateBodySchema, resolveIncidentBodySchema,
  incidentResponseSchema, incidentListResponseSchema, incidentTimelineResponseSchema,
  incidentUpdateResponseSchema, incidentIdParamsSchema,
} from '../schemas/incidents.js';
import { errorResponseSchema } from '../schemas/common.js';

const incidents = new PlatformIncidentRepository();

function serializeIncident(incident: PlatformIncident) {
  return {
    id: incident.id,
    severity: incident.severity,
    title: incident.title,
    description: incident.description,
    status: incident.status,
    affectedSystems: incident.affectedSystems,
    affectedTenantIds: incident.affectedTenantIds,
    declaredBy: incident.declaredBy,
    postmortemUrl: incident.postmortemUrl,
    declaredAt: incident.declaredAt.toISOString(),
    resolvedAt: incident.resolvedAt?.toISOString() ?? null,
  };
}

function serializeUpdate(update: PlatformIncidentUpdate) {
  return {
    id: update.id,
    incidentId: update.incidentId,
    message: update.message,
    statusAtUpdate: update.statusAtUpdate,
    isCustomerFacing: update.isCustomerFacing,
    postedBy: update.postedBy,
    postedAt: update.postedAt.toISOString(),
  };
}

/**
 * Platform-scoped (no tenant context, no RLS — see PlatformIncidentRepository's
 * own comment) — every route here is gated on platform:admin, the same
 * permission BUILD-25's GET /v1/metrics uses for cross-tenant operational
 * data, since an incident record and its response actions are an
 * operator/on-call concern, not a tenant self-service one.
 */
export default async function incidentRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.post('/v1/incidents', {
    schema: {
      tags: ['incidents'],
      summary: 'Declare a new platform incident',
      body: declareIncidentBodySchema,
      response: { 201: incidentResponseSchema, 401: errorResponseSchema, 403: errorResponseSchema },
    },
    preHandler: [app.authenticate, app.resolveTenantContext, app.requirePermission('platform:admin')],
  }, async (request, reply) => {
    const { incident } = await incidents.declare({
      severity: request.body.severity,
      title: request.body.title,
      description: request.body.description,
      declaredBy: request.session!.user.id,
      affectedSystems: request.body.affectedSystems,
      affectedTenantIds: request.body.affectedTenantIds,
    });
    return reply.status(201).send(serializeIncident(incident));
  });

  server.get('/v1/incidents', {
    schema: {
      tags: ['incidents'],
      summary: 'List currently active (unresolved) incidents',
      response: { 200: incidentListResponseSchema, 401: errorResponseSchema, 403: errorResponseSchema },
    },
    preHandler: [app.authenticate, app.resolveTenantContext, app.requirePermission('platform:admin')],
  }, async (_request, reply) => {
    const list = await incidents.listActive();
    return reply.status(200).send({ incidents: list.map(serializeIncident) });
  });

  server.get('/v1/incidents/:incidentId', {
    schema: {
      tags: ['incidents'],
      summary: 'Get one incident',
      params: incidentIdParamsSchema,
      response: { 200: incidentResponseSchema, 401: errorResponseSchema, 403: errorResponseSchema, 404: errorResponseSchema },
    },
    preHandler: [app.authenticate, app.resolveTenantContext, app.requirePermission('platform:admin')],
  }, async (request, reply) => {
    const incident = await incidents.getById(request.params.incidentId);
    return reply.status(200).send(serializeIncident(incident));
  });

  server.get('/v1/incidents/:incidentId/updates', {
    schema: {
      tags: ['incidents'],
      summary: 'Get an incident\'s full timeline',
      params: incidentIdParamsSchema,
      response: { 200: incidentTimelineResponseSchema, 401: errorResponseSchema, 403: errorResponseSchema, 404: errorResponseSchema },
    },
    preHandler: [app.authenticate, app.resolveTenantContext, app.requirePermission('platform:admin')],
  }, async (request, reply) => {
    await incidents.getById(request.params.incidentId); // 404s if not found, before listing an empty/wrong timeline
    const updates = await incidents.listUpdates(request.params.incidentId);
    return reply.status(200).send({ updates: updates.map(serializeUpdate) });
  });

  server.post('/v1/incidents/:incidentId/updates', {
    schema: {
      tags: ['incidents'],
      summary: 'Post a timeline update to an incident',
      params: incidentIdParamsSchema,
      body: addIncidentUpdateBodySchema,
      response: { 201: incidentUpdateResponseSchema, 401: errorResponseSchema, 403: errorResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
    },
    preHandler: [app.authenticate, app.resolveTenantContext, app.requirePermission('platform:admin')],
  }, async (request, reply) => {
    const update = await incidents.addUpdate(
      request.params.incidentId, request.body.message, request.body.statusAtUpdate,
      request.session!.user.id, request.body.isCustomerFacing
    );
    return reply.status(201).send(serializeUpdate(update));
  });

  server.post('/v1/incidents/:incidentId/resolve', {
    schema: {
      tags: ['incidents'],
      summary: 'Resolve an incident',
      params: incidentIdParamsSchema,
      body: resolveIncidentBodySchema,
      response: { 200: incidentResponseSchema, 401: errorResponseSchema, 403: errorResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
    },
    preHandler: [app.authenticate, app.resolveTenantContext, app.requirePermission('platform:admin')],
  }, async (request, reply) => {
    const incident = await incidents.resolve(request.params.incidentId, request.session!.user.id, request.body.postmortemUrl ?? null);
    return reply.status(200).send(serializeIncident(incident));
  });
}
