// Observability — structured logging built on pino. Metrics/tracing are not yet implemented (see known limitations).
import pino, { type Logger, type DestinationStream } from 'pino';
import { SECRET_REDACTION_LOG_PATHS } from '@infinicus/configuration';

export type { Logger } from 'pino';

/**
 * Redacted regardless of value whenever a logged object contains one of
 * these paths — independent of and complementary to
 * @infinicus/configuration's redactSecretValues() (which scrubs a known
 * secret's literal runtime value out of free-form text, e.g. an error
 * message). Always includes @infinicus/configuration's
 * SECRET_REDACTION_LOG_PATHS (BUILD-24's canonical secret-path list) plus
 * a few generic shapes (HTTP auth headers) that aren't configuration-specific.
 */
export const DEFAULT_REDACT_PATHS: readonly string[] = [
  'req.headers.authorization',
  ...SECRET_REDACTION_LOG_PATHS,
];

export interface CreateLoggerOptions {
  name: string;
  level?: string;
  /** Additional pino redact.paths merged with DEFAULT_REDACT_PATHS. */
  redactPaths?: readonly string[];
  /** Overrides pino's write destination — for tests that need to capture output; defaults to stdout. */
  destination?: DestinationStream;
}

export function createLogger(options: CreateLoggerOptions): Logger {
  const paths = [...DEFAULT_REDACT_PATHS, ...(options.redactPaths ?? [])];
  const config = {
    name: options.name,
    level: options.level ?? 'info',
    redact: { paths, censor: '[REDACTED]' },
  };
  return options.destination ? pino(config, options.destination) : pino(config);
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
