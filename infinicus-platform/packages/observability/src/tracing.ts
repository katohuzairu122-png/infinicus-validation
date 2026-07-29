// Distributed tracing — BUILD-25. No real tracing backend (Jaeger,
// Tempo, an APM vendor's collector) is reachable from this sandboxed
// environment. startSpan() is a genuinely functional, in-process
// span/duration recorder — every span is logged as a structured event
// (trace.span, with start/end timestamps and duration) via the
// platform's own logger, and correlationId/parentSpanId propagation
// lets separate log lines be reassembled into a call tree after the
// fact. This is the seam an OpenTelemetry SDK integration attaches to
// later (see known-limitations-build25.md) — it would export the same
// span data to a real collector instead of (or in addition to) logging it.
import { randomUUID } from 'node:crypto';
import type { MinimalLogger } from './logger.js';

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  name: string;
  /** Ends the span, logging its duration. Idempotent: calling more than once has no further effect. */
  end(fields?: Record<string, unknown>): void;
}

export interface SpanContext {
  traceId: string;
  spanId: string;
}

/**
 * Starts a span. Pass the parent's SpanContext (from a prior
 * startSpan()'s return value) to nest it in the same trace; omit it to
 * start a new trace.
 */
export function startSpan(logger: MinimalLogger, name: string, parent?: SpanContext): Span {
  const traceId = parent?.traceId ?? randomUUID();
  const spanId = randomUUID();
  const parentSpanId = parent?.spanId ?? null;
  const startedAt = Date.now();
  let ended = false;

  logger.info({ trace: { traceId, spanId, parentSpanId, name, phase: 'started' } }, `span started: ${name}`);

  return {
    traceId,
    spanId,
    parentSpanId,
    name,
    end(fields = {}) {
      if (ended) return;
      ended = true;
      const durationMs = Date.now() - startedAt;
      logger.info(
        { trace: { traceId, spanId, parentSpanId, name, phase: 'completed', durationMs, ...fields } },
        `span completed: ${name} (${durationMs}ms)`
      );
    },
  };
}
