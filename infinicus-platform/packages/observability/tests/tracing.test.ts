import { describe, it, expect } from 'vitest';
import { startSpan } from '../src/index.js';

function fakeLogger() {
  const calls: Array<{ obj: object; msg?: string }> = [];
  return {
    logger: {
      info(obj: object, msg?: string) {
        calls.push({ obj, msg });
      },
      child() {
        return this;
      },
    },
    calls,
  };
}

describe('startSpan', () => {
  it('logs a started event immediately with a fresh traceId when no parent is given', () => {
    const { logger, calls } = fakeLogger();
    const span = startSpan(logger, 'workflow.evaluate');

    expect(calls).toHaveLength(1);
    const trace = (calls[0].obj as { trace: Record<string, unknown> }).trace;
    expect(trace.phase).toBe('started');
    expect(trace.name).toBe('workflow.evaluate');
    expect(trace.parentSpanId).toBeNull();
    expect(span.traceId).toBe(trace.traceId);
    expect(span.spanId).toBe(trace.spanId);
  });

  it('nests a child span under the same traceId when given a parent context', () => {
    const { logger } = fakeLogger();
    const parent = startSpan(logger, 'parent-op');
    const child = startSpan(logger, 'child-op', { traceId: parent.traceId, spanId: parent.spanId });

    expect(child.traceId).toBe(parent.traceId);
    expect(child.parentSpanId).toBe(parent.spanId);
    expect(child.spanId).not.toBe(parent.spanId);
  });

  it('end() logs a completed event with a non-negative duration', async () => {
    const { logger, calls } = fakeLogger();
    const span = startSpan(logger, 'op');
    await new Promise((r) => setTimeout(r, 5));
    span.end();

    expect(calls).toHaveLength(2);
    const trace = (calls[1].obj as { trace: Record<string, unknown> }).trace;
    expect(trace.phase).toBe('completed');
    expect(typeof trace.durationMs).toBe('number');
    expect(trace.durationMs as number).toBeGreaterThanOrEqual(0);
  });

  it('end() merges extra fields into the completed log line', () => {
    const { logger, calls } = fakeLogger();
    const span = startSpan(logger, 'op');
    span.end({ resultCount: 3 });

    const trace = (calls[1].obj as { trace: Record<string, unknown> }).trace;
    expect(trace.resultCount).toBe(3);
  });

  it('end() is idempotent — a second call logs nothing further', () => {
    const { logger, calls } = fakeLogger();
    const span = startSpan(logger, 'op');
    span.end();
    span.end();
    expect(calls).toHaveLength(2);
  });
});
