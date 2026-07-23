import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticationService } from '@infinicus/authentication';

const authService = new AuthenticationService();

function extractBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

/**
 * Populates request.session for any route with { preHandler: app.authenticate }.
 * Fail-closed: a missing or invalid token throws (SessionInvalidError etc,
 * mapped to 401 by the error handler) rather than silently proceeding
 * unauthenticated.
 */
export default fp(async function authPlugin(app: FastifyInstance) {
  app.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply) => {
    const token = extractBearerToken(request);
    if (!token) {
      const err = new Error('Missing or malformed Authorization header (expected: Bearer <token>)');
      err.name = 'SessionInvalidError';
      throw err;
    }
    request.session = await authService.validateSession(token);
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
