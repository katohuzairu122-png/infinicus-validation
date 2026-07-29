/**
 * Live PostgreSQL 16 test for BUILD-23's promotion-gate requirement:
 * infrastructure/deployment/scripts/deployment-audit.cjs's
 * `check-promotion` command — the actual enforcement behind deploy.sh's
 * "staging requires a prior succeeded test deployment of this exact
 * version; production requires a prior succeeded staging deployment"
 * rule. Runs the real CLI script, not a reimplementation.
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
import { createPool, closePool, DeploymentEventRepository } from '../src/index.js';

const execFileAsync = promisify(execFile);
const run = !!process.env.DATABASE_URL;

const AUDIT_CLI = resolve(__dirname, '../../../infrastructure/deployment/scripts/deployment-audit.cjs');

function runCheck(version: string, environment: string) {
  return execFileAsync('node', [AUDIT_CLI, 'check-promotion', version, environment], {
    env: { ...process.env },
  });
}

describe.runIf(run)('deployment-audit.cjs check-promotion — live PostgreSQL', () => {
  it('has no prerequisite for local or test', async () => {
    const { stdout } = await runCheck('any-version', 'local');
    expect(stdout).toContain('No promotion prerequisite');
    const { stdout: stdout2 } = await runCheck('any-version', 'test');
    expect(stdout2).toContain('No promotion prerequisite');
  });

  it('rejects promotion to staging for a version never deployed to test', async () => {
    const version = `promotion-gate-test-never-${Date.now()}`;
    await expect(runCheck(version, 'staging')).rejects.toThrow();
  });

  it('rejects promotion to production for a version never deployed to staging', async () => {
    const version = `promotion-gate-test-never-${Date.now()}`;
    await expect(runCheck(version, 'production')).rejects.toThrow();
  });

  it('allows promotion to staging once the same version succeeded in test', async () => {
    createPool({ connectionString: process.env.DATABASE_URL! });
    const repo = new DeploymentEventRepository();
    const version = `promotion-gate-test-ok-${Date.now()}`;
    const event = await repo.start({ version, environment: 'test', gitSha: 'testsha' });
    await repo.markSucceeded(event.id);
    await closePool();

    const { stdout } = await runCheck(version, 'staging');
    expect(stdout).toContain('Promotion gate satisfied');
  });

  it('still rejects staging if the test deployment of the same version failed (not succeeded)', async () => {
    createPool({ connectionString: process.env.DATABASE_URL! });
    const repo = new DeploymentEventRepository();
    const version = `promotion-gate-test-failed-${Date.now()}`;
    const event = await repo.start({ version, environment: 'test', gitSha: 'testsha' });
    await repo.markFailed(event.id);
    await closePool();

    await expect(runCheck(version, 'staging')).rejects.toThrow();
  });
});

describe.skipIf(run)('deployment-audit.cjs check-promotion — live PostgreSQL (skipped, no DATABASE_URL)', () => {
  it('skips live tests when DATABASE_URL is not set', () => {
    expect(run).toBe(false);
  });
});
