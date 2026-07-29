// Observability — structured logging built on pino, error tracking, and
// lightweight in-process tracing (BUILD-25). No real APM/tracing backend
// is connected — see errorTracking.ts/tracing.ts for the documented seam.

export type { Logger } from './logger.js';
export {
  DEFAULT_REDACT_PATHS,
  createLogger,
  withCorrelationId,
  logAuditEntry,
} from './logger.js';
export type { CreateLoggerOptions, MinimalLogger, AuditLogEntry } from './logger.js';

export { LoggingErrorTracker, CompositeErrorTracker } from './errorTracking.js';
export type { ErrorTracker, CapturedError } from './errorTracking.js';

export { startSpan } from './tracing.js';
export type { Span, SpanContext } from './tracing.js';
