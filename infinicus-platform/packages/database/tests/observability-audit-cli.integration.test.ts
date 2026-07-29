/**
 * Live PostgreSQL 16 test for BUILD-25's observability-audit.cjs CLI:
 * check-outbox-lag, check-error-rate, trigger-alert/resolve-alert, and
 * summary. Runs the real CLI script, not a reimplementation.
 *
 * Requires:
 *   DATABASE_URL — a real, reachable Postgres connection string
 *     (ADMIN_DATABASE_URL preferred — see the script's own comment on
 *     outbox/error-count RLS visibility).
 *
 * Guard pattern: describe.runIf(!!process.env.DATABASE_URL)
 */
import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';

const execFileAsync = promisify(execFile);
const run = !!process.env.DATABASE_URL;

const AUDIT_CLI = resolve(__dirname, '../../../infrastructure/deployment/scripts/observability-audit.cjs');
const env = { ...process.env, DATABASE_URL: process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL! };

function run_(...args: string[]) {
  return execFileAsync('node', [AUDIT_CLI, ...args], { env });
}

describe.runIf(run)('observability-audit.cjs — live PostgreSQL', () => {
  it('check-outbox-lag passes with generous thresholds', async () => {
    const { stdout } = await run_('check-outbox-lag', '10000000', '999999999');
    expect(stdout).toContain('Outbox lag within thresholds');
  });

  it('check-outbox-lag fails (non-zero exit) with a zero pending-count threshold', async () => {
    await expect(run_('check-outbox-lag', '-1', '999999999')).rejects.toThrow();
  });

  it('check-error-rate passes with a generous threshold', async () => {
    const { stdout } = await run_('check-error-rate', '60', '1000000');
    expect(stdout).toContain('Error rate within threshold');
  });

  it('check-error-rate fails (non-zero exit) with a zero threshold given any recorded error', async () => {
    await expect(run_('check-error-rate', '600', '-1')).rejects.toThrow();
  });

  it('trigger-alert prints a new alert id, resolve-alert accepts it', async () => {
    const { stdout } = await run_('trigger-alert', 'cli-test-alert', 'warning', 'test alert from CLI integration test');
    const id = stdout.trim();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);

    await expect(run_('resolve-alert', id)).resolves.toBeDefined();
  });

  it('summary prints real computed JSON with errors/outbox/activeAlertCount', async () => {
    const { stdout } = await run_('summary', '60');
    const parsed = JSON.parse(stdout);
    expect(typeof parsed.errors.count).toBe('number');
    expect(typeof parsed.outbox.pendingCount).toBe('number');
    expect(typeof parsed.activeAlertCount).toBe('number');
  });
});

describe.skipIf(run)('observability-audit.cjs — live PostgreSQL (skipped, no DATABASE_URL)', () => {
  it('skips live tests when DATABASE_URL is not set', () => {
    expect(run).toBe(false);
  });
});
