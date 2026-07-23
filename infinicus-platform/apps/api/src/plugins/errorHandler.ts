import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyError } from 'fastify';
import { statusCodeFor } from '../errors.js';

/**
 * Every error response uses one envelope: { error: { code, message, correlationId } }.
 * Anything not recognized by errors.ts's status-code table is logged in
 * full server-side but returned to the client as a generic, redacted 500
 * — never the original message or stack trace (security baseline:
 * "controlled redacted errors", "no secrets in ... errors").
 */
export default fp(async function errorHandlerPlugin(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError & { name?: string }, request, reply) => {
    const correlationId = request.correlationId;

    // Fastify/Zod schema validation failures.
    if (error.validation || error.code === 'FST_ERR_VALIDATION') {
      request.log.info({ err: error, correlationId }, 'request validation failed');
      return reply.status(400).send({
        error: { code: 'validation_error', message: error.message, correlationId },
      });
    }

    const statusCode = statusCodeFor(error.name);
    if (statusCode === 500) {
      request.log.error({ err: error, correlationId }, 'unhandled error');
      return reply.status(500).send({
        error: { code: 'internal_error', message: 'An unexpected error occurred.', correlationId },
      });
    }

    request.log.info({ err: error, correlationId }, 'request failed');
    return reply.status(statusCode).send({
      error: { code: error.name ?? 'error', message: error.message, correlationId },
    });
  });

  app.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      error: { code: 'route_not_found', message: `No route: ${request.method} ${request.url}`, correlationId: request.correlationId },
    });
  });
});
