import { randomUUID } from 'node:crypto';
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

const HEADER = 'x-correlation-id';

export default fp(async function correlationIdPlugin(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    const incoming = request.headers[HEADER];
    const correlationId = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
    request.correlationId = correlationId;
    reply.header('X-Correlation-Id', correlationId);
  });
});
