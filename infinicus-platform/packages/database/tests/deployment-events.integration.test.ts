/**
 * Live PostgreSQL 16 integration tests for BUILD-23's deployment-audit
 * requirement: DeploymentEventRepository / platform.deployment_events.
 *
 * Requires:
 *   DATABASE_URL — app_test_user (RLS enforced; not that it matters here,
 *     since deployment_events has no RLS — see the repository's own
 *     comment for why).
 *
 * Guard pattern: describe.runIf(!!process.env.DATABASE_URL)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createPool, closePool, DeploymentEventRepository, DeploymentEventNotFoundError } from '../src/index.js';

const run = !!process.env.DATABASE_URL;

describe.runIf(run)('DeploymentEventRepository — live PostgreSQL', () => {
  const repo = new DeploymentEventRepository();

  beforeAll(() => {
    createPool({ connectionString: process.env.DATABASE_URL! });
  });

  afterAll(async () => {
    await closePool();
  });

  it('starts a deployment event with status started', async () => {
    const event = await repo.start({ version: '0.0.1+sha.test1', environment: 'test', gitSha: 'test1', deployedBy: 'ci' });
    expect(event.status).toBe('started');
    expect(event.completedAt).toBeNull();
    expect(event.environment).toBe('test');
  });

  it('marks a deployment succeeded, setting completedAt', async () => {
    const started = await repo.start({ version: '0.0.1+sha.test2', environment: 'test', gitSha: 'test2' });
    const succeeded = await repo.markSucceeded(started.id, 'all smoke tests passed');
    expect(succeeded.status).toBe('succeeded');
    expect(succeeded.completedAt).not.toBeNull();
    expect(succeeded.notes).toBe('all smoke tests passed');
  });

  it('marks a deployment failed', async () => {
    const started = await repo.start({ version: '0.0.1+sha.test3', environment: 'staging', gitSha: 'test3' });
    const failed = await repo.markFailed(started.id, 'smoke test timed out');
    expect(failed.status).toBe('failed');
  });

  it('marks a deployment rolled back', async () => {
    const started = await repo.start({ version: '0.0.1+sha.test4', environment: 'production', gitSha: 'test4' });
    await repo.markSucceeded(started.id);
    const rolledBack = await repo.markRolledBack(started.id, 'reverted to previous version after incident');
    expect(rolledBack.status).toBe('rolled_back');
  });

  it('getById throws DeploymentEventNotFoundError for a missing id', async () => {
    await expect(repo.getById('00000000-0000-0000-0000-000000000000')).rejects.toThrow(DeploymentEventNotFoundError);
  });

  it('transitioning a missing deployment throws DeploymentEventNotFoundError', async () => {
    await expect(repo.markSucceeded('00000000-0000-0000-0000-000000000000')).rejects.toThrow(DeploymentEventNotFoundError);
  });

  it('rejects an invalid environment value', async () => {
    await expect(
      repo.start({ version: '0.0.1', environment: 'nonexistent-env' as never, gitSha: 'x' })
    ).rejects.toThrow();
  });

  it('listForEnvironment returns only that environment, most recent first', async () => {
    const gitShaA = `list-test-a-${Date.now()}`;
    const gitShaB = `list-test-b-${Date.now()}`;
    const first = await repo.start({ version: '0.0.1', environment: 'staging', gitSha: gitShaA });
    await new Promise((r) => setTimeout(r, 10));
    const second = await repo.start({ version: '0.0.1', environment: 'staging', gitSha: gitShaB });

    const list = await repo.listForEnvironment('staging', 5);
    const ids = list.map((e) => e.id);
    expect(ids.indexOf(second.id)).toBeLessThan(ids.indexOf(first.id));
    expect(list.every((e) => e.environment === 'staging')).toBe(true);
  });
});

describe.skipIf(run)('DeploymentEventRepository — live PostgreSQL (skipped, no DATABASE_URL)', () => {
  it('skips live tests when DATABASE_URL is not set', () => {
    expect(run).toBe(false);
  });
});
