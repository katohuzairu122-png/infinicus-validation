/**
 * Live PostgreSQL 16 integration tests for BUILD-25's alerting
 * requirement: AlertEventRepository / observability.alert_events.
 *
 * Requires:
 *   DATABASE_URL — app_test_user (RLS enforced; not that it matters here,
 *     since alert_events has no RLS — see the repository's own comment).
 *
 * Guard pattern: describe.runIf(!!process.env.DATABASE_URL)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createPool, closePool, AlertEventRepository, AlertEventNotFoundError } from '../src/index.js';

const run = !!process.env.DATABASE_URL;

describe.runIf(run)('AlertEventRepository — live PostgreSQL', () => {
  const repo = new AlertEventRepository();

  beforeAll(() => {
    createPool({ connectionString: process.env.DATABASE_URL! });
  });

  afterAll(async () => {
    await closePool();
  });

  it('triggers an alert, unresolved by default', async () => {
    const alert = await repo.trigger({ alertName: 'outbox-lag', severity: 'warning', message: 'backlog exceeds threshold' });
    expect(alert.resolvedAt).toBeNull();
    expect(alert.severity).toBe('warning');
  });

  it('rejects an invalid severity value', async () => {
    await expect(
      repo.trigger({ alertName: 'x', severity: 'nonexistent-severity' as never, message: 'x' })
    ).rejects.toThrow();
  });

  it('resolves an alert, setting resolvedAt', async () => {
    const alert = await repo.trigger({ alertName: 'error-rate', severity: 'critical', message: 'error rate spike' });
    const resolved = await repo.resolve(alert.id);
    expect(resolved.resolvedAt).not.toBeNull();
  });

  it('resolving a missing alert throws AlertEventNotFoundError', async () => {
    await expect(repo.resolve('00000000-0000-0000-0000-000000000000')).rejects.toThrow(AlertEventNotFoundError);
  });

  it('listActive excludes resolved alerts', async () => {
    const alertName = `list-active-test-${Date.now()}`;
    const stillActive = await repo.trigger({ alertName, severity: 'warning', message: 'active' });
    const toResolve = await repo.trigger({ alertName, severity: 'warning', message: 'will resolve' });
    await repo.resolve(toResolve.id);

    const active = await repo.listActive(50);
    const ids = active.map((a) => a.id);
    expect(ids).toContain(stillActive.id);
    expect(ids).not.toContain(toResolve.id);
  });

  it('listForAlertName returns only that alert name, most recent first', async () => {
    const alertName = `list-name-test-${Date.now()}`;
    const first = await repo.trigger({ alertName, severity: 'warning', message: 'first' });
    await new Promise((r) => setTimeout(r, 10));
    const second = await repo.trigger({ alertName, severity: 'warning', message: 'second' });

    const list = await repo.listForAlertName(alertName, 5);
    const ids = list.map((a) => a.id);
    expect(ids.indexOf(second.id)).toBeLessThan(ids.indexOf(first.id));
    expect(list.every((a) => a.alertName === alertName)).toBe(true);
  });

  it('retains metadata as recorded', async () => {
    const alert = await repo.trigger({ alertName: 'meta-test', severity: 'warning', message: 'x', metadata: { pendingCount: 42 } });
    expect(alert.metadata).toEqual({ pendingCount: 42 });
  });
});

describe.skipIf(run)('AlertEventRepository — live PostgreSQL (skipped, no DATABASE_URL)', () => {
  it('skips live tests when DATABASE_URL is not set', () => {
    expect(run).toBe(false);
  });
});
