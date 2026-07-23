import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { serializerCompiler, validatorCompiler, jsonSchemaTransform } from 'fastify-type-provider-zod';
import type { InfinicusConfig } from '@infinicus/configuration';
import { createLogger, logAuditEntry } from '@infinicus/observability';
import correlationIdPlugin from './plugins/correlationId.js';
import errorHandlerPlugin from './plugins/errorHandler.js';
import authPlugin from './plugins/auth.js';
import tenantContextPlugin from './plugins/tenantContext.js';
import permissionPlugin from './plugins/permission.js';
import idempotencyPlugin from './plugins/idempotency.js';
import authRoutes from './routes/auth.js';
import onboardingRoutes from './routes/onboarding.js';
import businessRoutes from './routes/businesses.js';
import './types.js';

export async function buildApp(config: InfinicusConfig): Promise<FastifyInstance> {
  // A separate observability-owned logger for structured audit entries
  // (below), decoupled from Fastify's own request/response logger — this
  // avoids depending on pino.Logger being structurally identical to
  // Fastify's internal logger type, and keeps @infinicus/observability
  // usable by any future non-Fastify caller too.
  const auditLogger = createLogger({ name: 'infinicus-api-audit', level: config.logLevel });

  const app = Fastify({ logger: { level: config.logLevel }, disableRequestLogging: true });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(correlationIdPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(authPlugin);
  await app.register(tenantContextPlugin);
  await app.register(permissionPlugin);
  await app.register(idempotencyPlugin);

  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindowMs,
  });

  await app.register(swagger, {
    openapi: {
      info: { title: 'INFINICUS Governed Application API', version: '1' },
      servers: [{ url: '/' }],
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: '/documentation' });

  app.addHook('onResponse', async (request, reply) => {
    logAuditEntry(auditLogger, {
      correlationId: request.correlationId,
      tenantId: request.ctx?.tenantId ?? null,
      userId: request.session?.user.id ?? null,
      method: request.method,
      route: request.routeOptions.url ?? request.url,
      statusCode: reply.statusCode,
      durationMs: reply.elapsedTime,
    });
  });

  app.get('/v1/health', { schema: { hide: true } }, async () => ({ status: 'ok' }));

  await app.register(authRoutes);
  await app.register(onboardingRoutes);
  await app.register(businessRoutes);

  return app;
}
