// Observability — structured logging built on pino. Metrics/tracing are not yet implemented (see known limitations).
import pino, { type Logger } from 'pino';

export type { Logger } from 'pino';

export interface CreateLoggerOptions {
  name: string;
  level?: string;
}

export function createLogger(options: CreateLoggerOptions): Logger {
  return pino({ name: options.name, level: options.level ?? 'info' });
}

/**
 * The minimal logging shape every function below actually needs — deliberately
 * narrower than pino.Logger so a framework's own request-scoped logger (e.g.
 * Fastify's FastifyBaseLogger, which is structurally close to but not
 * type-identical to pino.Logger) can be passed in directly without a cast.
 */
export interface MinimalLogger {
  info(obj: object, msg?: string): void;
  child(bindings: Record<string, unknown>): MinimalLogger;
}

/** Attaches a correlation id to every subsequent log line from the returned child logger. */
export function withCorrelationId(logger: MinimalLogger, correlationId: string): MinimalLogger {
  return logger.child({ correlationId });
}

/** Structured audit-log line for a request — a lighter-weight complement to audit.access_events (BUILD-18), which only covers a fixed set of security event types. */
export interface AuditLogEntry {
  correlationId: string;
  tenantId: string | null;
  userId: string | null;
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
}

export function logAuditEntry(logger: MinimalLogger, entry: AuditLogEntry): void {
  logger.info({ audit: entry }, `${entry.method} ${entry.route} -> ${entry.statusCode}`);
}
