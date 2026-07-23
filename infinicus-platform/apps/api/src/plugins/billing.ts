import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { EntitlementService } from '@infinicus/billing';
import type { UsageMetric } from '@infinicus/database';

const entitlements = new EntitlementService();

/**
 * app.requireActiveSubscription and app.enforceUsageLimit(metric) are
 * preHandler factories, mirroring permission.ts's app.requirePermission —
 * both must run after resolveTenantContext. Delegate entirely to
 * EntitlementService, which is fail-closed (BUILD-28's server-side
 * billing/entitlement enforcement requirement): a route with either
 * decorator in its preHandler chain genuinely cannot be reached by a
 * suspended/canceled tenant, or one that has exhausted its plan's usage
 * limit for that metric.
 */
export default fp(async function billingPlugin(app: FastifyInstance) {
  app.decorate('requireActiveSubscription', () => {
    return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      if (!request.ctx) {
        const err = new Error('requireActiveSubscription requires resolveTenantContext to run first');
        err.name = 'PermissionDeniedError';
        throw err;
      }
      await entitlements.enforceActiveSubscription(request.ctx);
    };
  });

  app.decorate('enforceUsageLimit', (metric: UsageMetric) => {
    return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      if (!request.ctx) {
        const err = new Error('enforceUsageLimit requires resolveTenantContext to run first');
        err.name = 'PermissionDeniedError';
        throw err;
      }
      await entitlements.recordUsageAndEnforceLimit(request.ctx, metric, 1);
    };
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    requireActiveSubscription: () => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    enforceUsageLimit: (metric: UsageMetric) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
