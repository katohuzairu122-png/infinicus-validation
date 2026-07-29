import type { TenantContext } from '@infinicus/database';
import type { ValidatedSession } from '@infinicus/authentication';

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by the authenticate preHandler once a Bearer session token has been validated. */
    session?: ValidatedSession;
    /** Set by the resolveTenantContext preHandler once the caller's active membership in the requested tenant/workspace has been verified. */
    ctx?: TenantContext;
    /** Set by the requireIdempotencyKey preHandler; used by its onSend companion to record the response for replay. */
    idempotency?: { key: string; route: string };
    correlationId: string;
  }
}
