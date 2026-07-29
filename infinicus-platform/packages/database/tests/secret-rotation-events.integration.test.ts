/**
 * Live PostgreSQL 16 integration tests for BUILD-24's secret-rotation-audit
 * requirement: SecretRotationEventRepository / platform.secret_rotation_events.
 *
 * Requires:
 *   DATABASE_URL — app_test_user (RLS enforced; not that it matters here,
 *     since secret_rotation_events has no RLS — see the repository's own
 *     comment for why).
 *
 * Guard pattern: describe.runIf(!!process.env.DATABASE_URL)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createPool, closePool, SecretRotationEventRepository, SecretRotationEventNotFoundError } from '../src/index.js';

const run = !!process.env.DATABASE_URL;

describe.runIf(run)('SecretRotationEventRepository — live PostgreSQL', () => {
  const repo = new SecretRotationEventRepository();

  beforeAll(() => {
    createPool({ connectionString: process.env.DATABASE_URL! });
  });

  afterAll(async () => {
    await closePool();
  });

  it('records a rotation event without an expiry', async () => {
    const event = await repo.record({ secretName: 'DATABASE_URL', environment: 'test', rotatedBy: 'ci' });
    expect(event.secretName).toBe('DATABASE_URL');
    expect(event.environment).toBe('test');
    expect(event.expiresAt).toBeNull();
  });

  it('records a rotation event with an expiry and notes', async () => {
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const event = await repo.record({
      secretName: 'DATABASE_URL', environment: 'staging', rotatedBy: 'rotate-db-credential.sh',
      expiresAt, notes: '90-day rotation policy',
    });
    expect(event.expiresAt?.getTime()).toBe(expiresAt.getTime());
    expect(event.notes).toBe('90-day rotation policy');
  });

  it('getById throws SecretRotationEventNotFoundError for a missing id', async () => {
    await expect(repo.getById('00000000-0000-0000-0000-000000000000')).rejects.toThrow(SecretRotationEventNotFoundError);
  });

  it('rejects an invalid environment value', async () => {
    await expect(
      repo.record({ secretName: 'DATABASE_URL', environment: 'nonexistent-env' as never, rotatedBy: 'ci' })
    ).rejects.toThrow();
  });

  it('listForSecret returns only that secret+environment, most recent first', async () => {
    const secretName = `list-test-secret-${Date.now()}`;
    const first = await repo.record({ secretName, environment: 'production', rotatedBy: 'ci' });
    await new Promise((r) => setTimeout(r, 10));
    const second = await repo.record({ secretName, environment: 'production', rotatedBy: 'ci' });

    const list = await repo.listForSecret(secretName, 'production', 5);
    const ids = list.map((e) => e.id);
    expect(ids.indexOf(second.id)).toBeLessThan(ids.indexOf(first.id));
    expect(list.every((e) => e.secretName === secretName && e.environment === 'production')).toBe(true);
  });

  it('listForSecret does not cross environments for the same secret name', async () => {
    const secretName = `cross-env-secret-${Date.now()}`;
    await repo.record({ secretName, environment: 'staging', rotatedBy: 'ci' });
    const productionList = await repo.listForSecret(secretName, 'production', 5);
    expect(productionList).toHaveLength(0);
  });

  it('latestForSecret returns the most recent rotation, or null if none exist', async () => {
    const secretName = `latest-test-secret-${Date.now()}`;
    expect(await repo.latestForSecret(secretName, 'test')).toBeNull();

    await repo.record({ secretName, environment: 'test', rotatedBy: 'ci', notes: 'first' });
    await new Promise((r) => setTimeout(r, 10));
    const second = await repo.record({ secretName, environment: 'test', rotatedBy: 'ci', notes: 'second' });

    const latest = await repo.latestForSecret(secretName, 'test');
    expect(latest?.id).toBe(second.id);
    expect(latest?.notes).toBe('second');
  });
});

describe.skipIf(run)('SecretRotationEventRepository — live PostgreSQL (skipped, no DATABASE_URL)', () => {
  it('skips live tests when DATABASE_URL is not set', () => {
    expect(run).toBe(false);
  });
});
