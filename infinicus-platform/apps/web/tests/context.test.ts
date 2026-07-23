import { describe, it, expect } from 'vitest';
import { contextFromSearchParams, ctxQuery } from '../lib/context.js';

const T1 = '11111111-1111-1111-1111-111111111111';
const WS1 = '22222222-2222-2222-2222-222222222222';
const UID = '33333333-3333-3333-3333-333333333333';

describe('contextFromSearchParams', () => {
  it('builds a TenantContext when all three params are present', () => {
    const ctx = contextFromSearchParams({ tenantId: T1, workspaceId: WS1, userId: UID });
    expect(ctx).toEqual({ tenantId: T1, workspaceId: WS1, userId: UID });
  });

  it('returns null when tenantId is missing', () => {
    expect(contextFromSearchParams({ workspaceId: WS1, userId: UID })).toBeNull();
  });

  it('returns null when workspaceId is missing', () => {
    expect(contextFromSearchParams({ tenantId: T1, userId: UID })).toBeNull();
  });

  it('returns null when userId is missing', () => {
    expect(contextFromSearchParams({ tenantId: T1, workspaceId: WS1 })).toBeNull();
  });

  it('returns null for a completely empty searchParams object', () => {
    expect(contextFromSearchParams({})).toBeNull();
  });

  it('takes the first value when a param is provided as an array (repeated query key)', () => {
    const ctx = contextFromSearchParams({ tenantId: [T1, 'other'], workspaceId: WS1, userId: UID });
    expect(ctx?.tenantId).toBe(T1);
  });

  it('treats an empty-string param as missing', () => {
    expect(contextFromSearchParams({ tenantId: '', workspaceId: WS1, userId: UID })).toBeNull();
  });
});

describe('ctxQuery', () => {
  it('serializes a TenantContext into a query string', () => {
    const query = ctxQuery({ tenantId: T1, workspaceId: WS1, userId: UID });
    expect(query).toBe(`tenantId=${T1}&workspaceId=${WS1}&userId=${UID}`);
  });

  it('round-trips through contextFromSearchParams via URLSearchParams', () => {
    const query = ctxQuery({ tenantId: T1, workspaceId: WS1, userId: UID });
    const parsed = Object.fromEntries(new URLSearchParams(query));
    expect(contextFromSearchParams(parsed)).toEqual({ tenantId: T1, workspaceId: WS1, userId: UID });
  });

  it('URL-encodes values containing reserved characters', () => {
    const query = ctxQuery({ tenantId: 'a b', workspaceId: WS1, userId: UID });
    expect(query).toContain('tenantId=a%20b');
  });
});
