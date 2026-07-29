import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MembershipRepository } from '@infinicus/database';

const memberships = new MembershipRepository();

/**
 * Populates request.ctx for any route with { preHandler: [app.authenticate, app.resolveTenantContext] }.
 * A validated session only proves WHO the caller is — it says nothing
 * about WHICH tenant/workspace they're acting in (a user can belong to
 * more than one). The caller must supply X-Tenant-Id and X-Workspace-Id
 * headers; this preHandler then verifies the authenticated user actually
 * has an ACTIVE membership in that exact tenant/workspace before
 * attaching request.ctx — this is real authorization enforcement, not a
 * placeholder (unlike apps/web's BUILD-20 query-parameter mechanism,
 * which trusted the caller's claimed identity outright).
 */
export default fp(async function tenantContextPlugin(app: FastifyInstance) {
  app.decorate('resolveTenantContext', async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.session) {
      const err = new Error('resolveTenantContext requires authenticate to run first');
      err.name = 'SessionInvalidError';
      throw err;
    }
    const tenantId = headerString(request, 'x-tenant-id');
    const workspaceId = headerString(request, 'x-workspace-id');
    if (!tenantId || !workspaceId) {
      const err = new Error('Missing required X-Tenant-Id / X-Workspace-Id headers');
      err.name = 'PermissionDeniedError';
      throw err;
    }

    const userId = request.session.user.id;
    const membership = await memberships.getByUserAndWorkspace({ tenantId, workspaceId, userId }, userId);
    if (membership.status !== 'active') {
      const err = new Error(`Membership is not active (status: ${membership.status})`);
      err.name = 'MembershipNotActiveError';
      throw err;
    }

    request.ctx = { tenantId, workspaceId, userId };
  });
});

function headerString(request: FastifyRequest, name: string): string | null {
  const value = request.headers[name];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

declare module 'fastify' {
  interface FastifyInstance {
    resolveTenantContext: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
