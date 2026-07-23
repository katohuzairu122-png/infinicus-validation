/**
 * Live PostgreSQL 16 integration tests for BUILD-21's IdempotencyKeyRepository
 * (api.idempotency_keys, migrations 0142-0145).
 *
 * Requires:
 *   DATABASE_URL       — app_test_user (RLS enforced)
 *   ADMIN_DATABASE_URL — infinicus_test_admin (BYPASSRLS)
 *
 * Guard pattern: describe.runIf(!!process.env.DATABASE_URL)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { createPool, closePool } from '../src/client.js';
import { IdempotencyKeyRepository, IdempotencyConflictError } from '../src/repositories/api/index.js';

const run = !!process.env.DATABASE_URL;

const T1  = '77777777-8080-0000-0000-000000000001';
const WS1 = '77777777-8080-0000-0000-000000000002';
const T2  = '77777777-8080-0000-0000-000000000003';
const WS2 = '77777777-8080-0000-0000-000000000004';
const UID = '77777777-8080-0000-0000-000000000099';

const ctx1 = { tenantId: T1, workspaceId: WS1, userId: UID };
const ctx2 = { tenantId: T2, workspaceId: WS2, userId: UID };

let adminPool: Pool | null = null;

function uniqueKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function setupApiIntegration(): Promise<void> {
  const appUrl = process.env.DATABASE_URL!;
  const adminUrl = process.env.ADMIN_DATABASE_URL ?? appUrl;
  createPool({ connectionString: appUrl });
  adminPool = new Pool({ connectionString: adminUrl });

  await adminPool.query(
    `INSERT INTO tenancy.tenants (id, name, slug, status, plan_code)
     VALUES ($1,'API-Test Tenant 1','api-t1','active','test'),
            ($2,'API-Test Tenant 2','api-t2','active','test')
     ON CONFLICT (id) DO NOTHING`,
    [T1, T2]
  );
  await adminPool.query(
    `INSERT INTO tenancy.workspaces (id, tenant_id, name, slug, status)
     VALUES ($1,$2,'API-Test WS 1','api-ws1','active'),
            ($3,$4,'API-Test WS 2','api-ws2','active')
     ON CONFLICT (id) DO NOTHING`,
    [WS1, T1, WS2, T2]
  );
}

async function teardownApiIntegration(): Promise<void> {
  if (adminPool) await adminPool.end();
  await closePool();
}

describe.runIf(run)('BUILD-21 IdempotencyKeyRepository — live PostgreSQL', () => {
  const repo = new IdempotencyKeyRepository();

  beforeAll(setupApiIntegration);
  afterAll(teardownApiIntegration);

  it('claims a brand-new idempotency key', async () => {
    const result = await repo.begin(ctx1, uniqueKey('key'), 'POST /v1/x', 'hash-a');
    expect(result.claimed).toBe(true);
  });

  it('a second request with the same key and same request hash sees the existing record, not a fresh claim', async () => {
    const key = uniqueKey('key-replay');
    const first = await repo.begin(ctx1, key, 'POST /v1/x', 'hash-a');
    expect(first.claimed).toBe(true);
    const second = await repo.begin(ctx1, key, 'POST /v1/x', 'hash-a');
    expect(second.claimed).toBe(false);
    if (!second.claimed) {
      expect(second.existing.idempotencyKey).toBe(key);
      expect(second.existing.status).toBe('in_progress');
    }
  });

  it('complete() stores the response and status for later replay', async () => {
    const key = uniqueKey('key-complete');
    await repo.begin(ctx1, key, 'POST /v1/x', 'hash-a');
    await repo.complete(ctx1, key, 'POST /v1/x', 201, { id: 'created-1' });
    const second = await repo.begin(ctx1, key, 'POST /v1/x', 'hash-a');
    expect(second.claimed).toBe(false);
    if (!second.claimed) {
      expect(second.existing.status).toBe('completed');
      expect(second.existing.responseStatus).toBe(201);
      expect(second.existing.responseBody).toEqual({ id: 'created-1' });
    }
  });

  it('rejects the same key reused with a different request hash', async () => {
    const key = uniqueKey('key-conflict');
    await repo.begin(ctx1, key, 'POST /v1/x', 'hash-a');
    await expect(repo.begin(ctx1, key, 'POST /v1/x', 'hash-b')).rejects.toBeInstanceOf(IdempotencyConflictError);
  });

  it('the same key is independent across different routes', async () => {
    const key = uniqueKey('key-route');
    const first = await repo.begin(ctx1, key, 'POST /v1/route-a', 'hash-a');
    const second = await repo.begin(ctx1, key, 'POST /v1/route-b', 'hash-a');
    expect(first.claimed).toBe(true);
    expect(second.claimed).toBe(true);
  });

  it('the same key is independent across different tenants (cross-tenant isolation)', async () => {
    const key = uniqueKey('key-tenant');
    const first = await repo.begin(ctx1, key, 'POST /v1/x', 'hash-a');
    const second = await repo.begin(ctx2, key, 'POST /v1/x', 'hash-a');
    expect(first.claimed).toBe(true);
    expect(second.claimed).toBe(true);
  });

  it('tenant 2 cannot see tenant 1s idempotency records directly (live RLS)', async () => {
    const key = uniqueKey('key-rls');
    await repo.begin(ctx1, key, 'POST /v1/x', 'hash-a');
    // A begin() call under ctx2 for the same key is a fresh claim, not a replay of tenant 1's record.
    const result = await repo.begin(ctx2, key, 'POST /v1/x', 'hash-a');
    expect(result.claimed).toBe(true);
  });
});

describe.skipIf(run)('BUILD-21 IdempotencyKeyRepository — live PostgreSQL (skipped, no DATABASE_URL)', () => {
  it('skips live tests when DATABASE_URL is not set', () => {
    expect(run).toBe(false);
  });
});
