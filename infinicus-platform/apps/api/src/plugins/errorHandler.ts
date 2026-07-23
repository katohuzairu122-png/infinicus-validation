import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyError } from 'fastify';
import { ErrorEventRepository } from '@infinicus/database';
import { EnvSecretProvider, redactSecretValues } from '@infinicus/configuration';
import { statusCodeFor } from '../errors.js';

const errorEventRepo = new ErrorEventRepository();
const secretProvider = new EnvSecretProvider();

/**
 * Every error response uses one envelope: { error: { code, message, correlationId } }.
 * Anything not recognized by errors.ts's status-code table is logged in
 * full server-side but returned to the client as a generic, redacted 500
 * — never the original message or stack trace (security baseline:
 * "controlled redacted errors", "no secrets in ... errors").
 *
 * BUILD-25 — every unhandled (500) error is additionally persisted to
 * observability.error_events via ErrorEventRepository, redacted through
 * redactSecretValues() first (defense-in-depth: a driver-level connection
 * error could otherwise embed a raw DATABASE_URL in its message). This is
 * fire-and-forget (not awaited) — error tracking must never slow down or
 * fail the actual error response, and a persistence failure is itself
 * logged, not thrown.
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
      errorEventRepo
        .record({
          errorName: error.name ?? 'Error',
          message: redactSecretValues(error.message, secretProvider),
          correlationId,
          tenantId: request.ctx?.tenantId ?? null,
          route: request.routeOptions.url ?? request.url,
          statusCode: 500,
        })
        .catch((persistErr) => request.log.error({ err: persistErr }, 'failed to persist error event'));
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
