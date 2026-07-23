/**
 * Live PostgreSQL 16 integration tests for BUILD-25's error-tracking
 * requirement: ErrorEventRepository / observability.error_events.
 *
 * Requires:
 *   DATABASE_URL — app_test_user (RLS enforced — error_events has a
 *     nullable-tenant policy, see the repository's own comment). All
 *     cases here use a null tenantId (no tenant fixture required) since
 *     the tenant-scoped RLS path is already covered by
 *     AccessEventRepository's tests using the identical pattern.
 *
 * Guard pattern: describe.runIf(!!process.env.DATABASE_URL)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createPool, closePool, ErrorEventRepository } from '../src/index.js';
import { randomUUID } from 'node:crypto';

const run = !!process.env.DATABASE_URL;

describe.runIf(run)('ErrorEventRepository — live PostgreSQL', () => {
  const repo = new ErrorEventRepository();

  beforeAll(() => {
    createPool({ connectionString: process.env.DATABASE_URL! });
  });

  afterAll(async () => {
    await closePool();
  });

  it('records an error event with no tenant (pre-auth error)', async () => {
    const event = await repo.record({ errorName: 'ValidationError', message: 'missing field: email' });
    expect(event.tenantId).toBeNull();
    expect(event.level).toBe('error');
    expect(event.errorName).toBe('ValidationError');
  });

  it('defaults level to error but accepts warning', async () => {
    const event = await repo.record({ errorName: 'DeprecationWarning', message: 'old route used', level: 'warning' });
    expect(event.level).toBe('warning');
  });

  it('rejects an invalid level value', async () => {
    await expect(
      repo.record({ errorName: 'X', message: 'x', level: 'nonexistent-level' as never })
    ).rejects.toThrow();
  });

  it('records route, statusCode, correlationId, and context', async () => {
    const correlationId = randomUUID();
    const event = await repo.record({
      errorName: 'NotFoundError', message: 'business not found', route: '/v1/businesses/x',
      statusCode: 404, correlationId, context: { businessId: 'x' },
    });
    expect(event.route).toBe('/v1/businesses/x');
    expect(event.statusCode).toBe(404);
    expect(event.correlationId).toBe(correlationId);
    expect(event.context).toEqual({ businessId: 'x' });
  });

  it('countSince counts only events within the window', async () => {
    const before = await repo.countSince(60);
    await repo.record({ errorName: 'CountTest', message: 'x' });
    const after = await repo.countSince(60);
    expect(after).toBe(before + 1);
  });

  it('countSince with a 0-minute window excludes everything', async () => {
    await repo.record({ errorName: 'ZeroWindowTest', message: 'x' });
    const count = await repo.countSince(0);
    expect(count).toBe(0);
  });

  it('listRecent returns most recent first', async () => {
    const first = await repo.record({ errorName: 'OrderTest', message: 'first' });
    await new Promise((r) => setTimeout(r, 10));
    const second = await repo.record({ errorName: 'OrderTest', message: 'second' });

    const list = await repo.listRecent(5);
    const ids = list.map((e) => e.id);
    expect(ids.indexOf(second.id)).toBeLessThan(ids.indexOf(first.id));
  });
});

describe.skipIf(run)('ErrorEventRepository — live PostgreSQL (skipped, no DATABASE_URL)', () => {
  it('skips live tests when DATABASE_URL is not set', () => {
    expect(run).toBe(false);
  });
});
