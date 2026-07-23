import { describe, it, expect, vi } from 'vitest';
import { LoggingErrorTracker, CompositeErrorTracker, type ErrorTracker, type CapturedError } from '../src/index.js';

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

describe('LoggingErrorTracker', () => {
  it('logs the error message and structured errorTracking fields', () => {
    const { logger, calls } = fakeLogger();
    const tracker = new LoggingErrorTracker(logger);
    tracker.capture({ errorName: 'NotFoundError', message: 'business not found', route: '/v1/businesses/x', statusCode: 404 });

    expect(calls).toHaveLength(1);
    expect(calls[0].msg).toBe('business not found');
    const errorTracking = (calls[0].obj as { errorTracking: Record<string, unknown> }).errorTracking;
    expect(errorTracking.errorName).toBe('NotFoundError');
    expect(errorTracking.route).toBe('/v1/businesses/x');
    expect(errorTracking.statusCode).toBe(404);
  });

  it('defaults tenantId/correlationId/context when omitted', () => {
    const { logger, calls } = fakeLogger();
    new LoggingErrorTracker(logger).capture({ errorName: 'X', message: 'x' });
    const errorTracking = (calls[0].obj as { errorTracking: Record<string, unknown> }).errorTracking;
    expect(errorTracking.tenantId).toBeNull();
    expect(errorTracking.correlationId).toBeNull();
    expect(errorTracking.context).toEqual({});
  });
});

describe('CompositeErrorTracker', () => {
  it('forwards a single capture call to every composed tracker', async () => {
    const a: ErrorTracker = { capture: vi.fn() };
    const b: ErrorTracker = { capture: vi.fn() };
    const composite = new CompositeErrorTracker([a, b]);
    const event: CapturedError = { errorName: 'X', message: 'x' };

    await composite.capture(event);

    expect(a.capture).toHaveBeenCalledWith(event);
    expect(b.capture).toHaveBeenCalledWith(event);
  });

  it('awaits async trackers', async () => {
    let resolved = false;
    const asyncTracker: ErrorTracker = {
      async capture() {
        await new Promise((r) => setTimeout(r, 5));
        resolved = true;
      },
    };
    await new CompositeErrorTracker([asyncTracker]).capture({ errorName: 'X', message: 'x' });
    expect(resolved).toBe(true);
  });
});
