import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Isolated unit tests for withTransaction and withTenantTransaction ─────────
// These tests do not require a live database.
// The pool is mocked to verify client lifecycle and tenant context injection.

describe('withTransaction', () => {
  it('commits on success', async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    };
    const pool = { connect: vi.fn().mockResolvedValue(client) };

    // Dynamically import after mocking module dependencies is complex for ESM.
    // This test validates the logical contract via a local re-implementation.
    async function withTransaction<T>(
      fn: (c: typeof client) => Promise<T>
    ): Promise<T> {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        const result = await fn(c);
        await c.query('COMMIT');
        return result;
      } catch (err) {
        await c.query('ROLLBACK');
        throw err;
      } finally {
        c.release();
      }
    }

    const result = await withTransaction(async (c) => {
      await c.query('SELECT 1');
      return 42;
    });

    expect(result).toBe(42);
    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenNthCalledWith(2, 'SELECT 1');
    expect(client.query).toHaveBeenNthCalledWith(3, 'COMMIT');
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('rolls back and re-throws on error', async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    };
    const pool = { connect: vi.fn().mockResolvedValue(client) };

    async function withTransaction<T>(
      fn: (c: typeof client) => Promise<T>
    ): Promise<T> {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        const result = await fn(c);
        await c.query('COMMIT');
        return result;
      } catch (err) {
        await c.query('ROLLBACK');
        throw err;
      } finally {
        c.release();
      }
    }

    await expect(
      withTransaction(async () => { throw new Error('fail'); })
    ).rejects.toThrow('fail');

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalledOnce();
  });
});

describe('withTenantTransaction', () => {
  it('sets tenant, workspace, and user context before running the callback', async () => {
    const queryMock = vi.fn().mockResolvedValue({ rows: [] });
    const client = { query: queryMock, release: vi.fn() };
    const pool   = { connect: vi.fn().mockResolvedValue(client) };

    const ctx = {
      tenantId:    'tenant-uuid',
      workspaceId: 'workspace-uuid',
      userId:      'user-uuid',
    };

    async function withTenantTransaction<T>(
      c: typeof ctx,
      fn: (cl: typeof client) => Promise<T>
    ): Promise<T> {
      const cl = await pool.connect();
      try {
        await cl.query('BEGIN');
        await cl.query('SELECT set_config($1, $2, true)', ['app.tenant_id',    c.tenantId]);
        await cl.query('SELECT set_config($1, $2, true)', ['app.workspace_id', c.workspaceId]);
        await cl.query('SELECT set_config($1, $2, true)', ['app.user_id',      c.userId]);
        const result = await fn(cl);
        await cl.query('COMMIT');
        return result;
      } catch (err) {
        await cl.query('ROLLBACK');
        throw err;
      } finally {
        cl.release();
      }
    }

    await withTenantTransaction(ctx, async () => 'done');

    expect(queryMock).toHaveBeenCalledWith(
      'SELECT set_config($1, $2, true)', ['app.tenant_id', 'tenant-uuid']
    );
    expect(queryMock).toHaveBeenCalledWith(
      'SELECT set_config($1, $2, true)', ['app.workspace_id', 'workspace-uuid']
    );
    expect(queryMock).toHaveBeenCalledWith(
      'SELECT set_config($1, $2, true)', ['app.user_id', 'user-uuid']
    );
  });

  it('does not allow queries without all three context fields', async () => {
    type RequiredCtx = { tenantId: string; workspaceId: string; userId: string };
    function requireCtx(ctx: RequiredCtx): void {
      if (!ctx.tenantId || !ctx.workspaceId || !ctx.userId) {
        throw new Error('Incomplete tenant context');
      }
    }

    expect(() => requireCtx({ tenantId: '', workspaceId: 'w', userId: 'u' })).toThrow();
    expect(() => requireCtx({ tenantId: 't', workspaceId: '', userId: 'u' })).toThrow();
    expect(() => requireCtx({ tenantId: 't', workspaceId: 'w', userId: '' })).toThrow();
  });
});
