/**
 * Live PostgreSQL 16 test for BUILD-24's secret-expiration requirement:
 * infrastructure/deployment/scripts/secret-rotation-audit.cjs — both its
 * `record` and `check-expiration` commands. Runs the real CLI script,
 * not a reimplementation.
 *
 * Requires:
 *   DATABASE_URL — a real, reachable Postgres connection string.
 *
 * Guard pattern: describe.runIf(!!process.env.DATABASE_URL)
 */
import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';

const execFileAsync = promisify(execFile);
const run = !!process.env.DATABASE_URL;

const AUDIT_CLI = resolve(__dirname, '../../../infrastructure/deployment/scripts/secret-rotation-audit.cjs');

function record(secretName: string, environment: string, rotatedBy: string, expiresAt: string, notes: string) {
  return execFileAsync('node', [AUDIT_CLI, 'record', secretName, environment, rotatedBy, expiresAt, notes], {
    env: { ...process.env },
  });
}

function checkExpiration(secretName: string, environment: string, warnDays: string) {
  return execFileAsync('node', [AUDIT_CLI, 'check-expiration', secretName, environment, warnDays], {
    env: { ...process.env },
  });
}

function daysFromNowIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

describe.runIf(run)('secret-rotation-audit.cjs — live PostgreSQL', () => {
  it('records a rotation and prints the new event id', async () => {
    const { stdout } = await record(`cli-test-${Date.now()}`, 'test', 'cli-test', daysFromNowIso(90), 'ok');
    expect(stdout.trim()).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('check-expiration passes for a never-rotated secret', async () => {
    const { stdout } = await checkExpiration(`never-rotated-${Date.now()}`, 'test', '30');
    expect(stdout).toContain('nothing to check');
  });

  it('check-expiration passes when the latest rotation is well outside the warning window', async () => {
    const secretName = `cli-safe-${Date.now()}`;
    await record(secretName, 'test', 'cli-test', daysFromNowIso(90), 'ok');
    const { stdout } = await checkExpiration(secretName, 'test', '30');
    expect(stdout).toContain('outside the 30-day warning window');
  });

  it('check-expiration fails (non-zero exit) when the latest rotation is within the warning window', async () => {
    const secretName = `cli-warn-${Date.now()}`;
    await record(secretName, 'test', 'cli-test', daysFromNowIso(5), 'expires soon');
    await expect(checkExpiration(secretName, 'test', '30')).rejects.toThrow();
  });

  it('check-expiration fails (non-zero exit) when the latest rotation has no recorded expiry', async () => {
    const secretName = `cli-no-expiry-${Date.now()}`;
    await record(secretName, 'test', 'cli-test', '-', 'no expiry');
    await expect(checkExpiration(secretName, 'test', '30')).rejects.toThrow();
  });
});

describe.skipIf(run)('secret-rotation-audit.cjs — live PostgreSQL (skipped, no DATABASE_URL)', () => {
  it('skips live tests when DATABASE_URL is not set', () => {
    expect(run).toBe(false);
  });
});
