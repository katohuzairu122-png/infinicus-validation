// Error tracking — BUILD-25. No real APM/error-tracking backend (Sentry,
// Bugsnag, ...) is reachable from this sandboxed development environment
// (the same class of constraint as @infinicus/configuration's
// SecretProvider — see known-limitations-build25.md). ErrorTracker is the
// seam: LoggingErrorTracker is a real, functional implementation (writes
// a structured log line via the platform's own logger); a production
// deployment composes it with (or swaps in) a real backend's SDK without
// changing any call site.
import type { MinimalLogger } from './logger.js';

export interface CapturedError {
  errorName: string;
  message: string;
  correlationId?: string;
  tenantId?: string | null;
  route?: string;
  statusCode?: number;
  context?: Record<string, unknown>;
}

export interface ErrorTracker {
  capture(error: CapturedError): void | Promise<void>;
}

export class LoggingErrorTracker implements ErrorTracker {
  constructor(private readonly logger: MinimalLogger) {}

  capture(error: CapturedError): void {
    this.logger.info(
      {
        errorTracking: {
          errorName: error.errorName,
          correlationId: error.correlationId ?? null,
          tenantId: error.tenantId ?? null,
          route: error.route ?? null,
          statusCode: error.statusCode ?? null,
          context: error.context ?? {},
        },
      },
      error.message
    );
  }
}

/** Composes several ErrorTrackers so a caller can, e.g., both log and persist without changing call sites elsewhere. */
export class CompositeErrorTracker implements ErrorTracker {
  constructor(private readonly trackers: readonly ErrorTracker[]) {}

  async capture(error: CapturedError): Promise<void> {
    await Promise.all(this.trackers.map((tracker) => tracker.capture(error)));
  }
}
