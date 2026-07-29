import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthorizationService } from '@infinicus/authorization';

const authzService = new AuthorizationService();

/**
 * Factory: app.requirePermission('aba:write') returns a preHandler that
 * must run after authenticate + resolveTenantContext. Delegates entirely
 * to AuthorizationService.authorize, which is fail-closed and already
 * records a permission_denied access event on every denial (BUILD-18) —
 * this plugin adds no authorization logic of its own.
 */
export default fp(async function permissionPlugin(app: FastifyInstance) {
  app.decorate('requirePermission', (permissionCode: string) => {
    return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      if (!request.ctx) {
        const err = new Error('requirePermission requires resolveTenantContext to run first');
        err.name = 'PermissionDeniedError';
        throw err;
      }
      await authzService.authorize(request.ctx, permissionCode);
    };
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    requirePermission: (permissionCode: string) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
