import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { poolStats, ErrorEventRepository, AlertEventRepository, getOutboxBacklog } from '@infinicus/database';
import { metricsResponseSchema } from '../schemas/observability.js';
import { errorResponseSchema } from '../schemas/common.js';

const errorEventRepo = new ErrorEventRepository();
const alertEventRepo = new AlertEventRepository();

/**
 * Platform-operational metrics for dashboards/SLO reporting (BUILD-25 —
 * "database monitoring", "job/outbox monitoring", "dashboards"). Gated
 * behind platform:admin (the same permission BUILD-18 seeds for the
 * owner role) since this exposes cross-cutting operational data, not a
 * single tenant's business data — reuses the existing
 * authenticate/resolveTenantContext/requirePermission chain rather than
 * inventing a separate platform-level auth path.
 *
 * Note: errors.last15Minutes and outbox.* reflect what's visible under
 * this connection's RLS-restricted role (the caller's own tenant plus
 * tenant-NULL rows) — a true cross-tenant platform aggregate requires an
 * ADMIN_DATABASE_URL connection, the same caveat documented on
 * ErrorEventRepository.countSince and getOutboxBacklog themselves.
 */
export default async function observabilityRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.get('/v1/metrics', {
    schema: {
      tags: ['observability'],
      summary: 'Platform operational metrics: connection pool, error rate, outbox backlog, active alerts',
      response: { 200: metricsResponseSchema, 401: errorResponseSchema, 403: errorResponseSchema },
    },
    preHandler: [app.authenticate, app.resolveTenantContext, app.requirePermission('platform:admin')],
  }, async (_request, reply) => {
    const [errorCount, outboxBacklog, activeAlerts] = await Promise.all([
      errorEventRepo.countSince(15),
      getOutboxBacklog(),
      alertEventRepo.listActive(1000),
    ]);
    const stats = poolStats();

    return reply.status(200).send({
      timestamp: new Date().toISOString(),
      process: {
        uptimeSeconds: process.uptime(),
        memoryRssBytes: process.memoryUsage().rss,
      },
      databasePool: {
        totalCount: stats.totalCount,
        idleCount: stats.idleCount,
        waitingCount: stats.waitingCount,
      },
      errors: { last15Minutes: errorCount },
      outbox: outboxBacklog,
      activeAlertCount: activeAlerts.length,
    });
  });
}
