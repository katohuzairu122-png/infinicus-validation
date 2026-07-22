import { describe, it, expect } from 'vitest';
import { hashToken } from '@infinicus/authentication';
import { generateInvitationToken, parseInvitationToken, defaultInvitationExpiry } from '../src/invitationTokens.js';
import { InvitationTokenInvalidError } from '../src/errors.js';

const TENANT_ID = '11111111-1111-1111-1111-111111111111';
const WORKSPACE_ID = '22222222-2222-2222-2222-222222222222';

describe('generateInvitationToken / parseInvitationToken', () => {
  it('round-trips tenantId and workspaceId through the raw token', () => {
    const { rawToken } = generateInvitationToken(TENANT_ID, WORKSPACE_ID);
    const parsed = parseInvitationToken(rawToken);
    expect(parsed.tenantId).toBe(TENANT_ID);
    expect(parsed.workspaceId).toBe(WORKSPACE_ID);
  });

  it('the generated tokenHash matches hashToken(rawToken)', () => {
    const { rawToken, tokenHash } = generateInvitationToken(TENANT_ID, WORKSPACE_ID);
    expect(tokenHash).toBe(hashToken(rawToken));
  });

  it('parseInvitationToken recomputes the same tokenHash as generation', () => {
    const generated = generateInvitationToken(TENANT_ID, WORKSPACE_ID);
    const parsed = parseInvitationToken(generated.rawToken);
    expect(parsed.tokenHash).toBe(generated.tokenHash);
  });

  it('generates distinct raw tokens on successive calls for the same tenant/workspace', () => {
    const a = generateInvitationToken(TENANT_ID, WORKSPACE_ID);
    const b = generateInvitationToken(TENANT_ID, WORKSPACE_ID);
    expect(a.rawToken).not.toBe(b.rawToken);
  });

  it('rejects a token missing the secret segment', () => {
    expect(() => parseInvitationToken(`${TENANT_ID}:${WORKSPACE_ID}`)).toThrow(InvitationTokenInvalidError);
  });

  it('rejects a token with a non-UUID tenant segment', () => {
    expect(() => parseInvitationToken(`not-a-uuid:${WORKSPACE_ID}:secret`)).toThrow(InvitationTokenInvalidError);
  });

  it('rejects a token with a non-UUID workspace segment', () => {
    expect(() => parseInvitationToken(`${TENANT_ID}:not-a-uuid:secret`)).toThrow(InvitationTokenInvalidError);
  });

  it('rejects a token with an empty secret segment', () => {
    expect(() => parseInvitationToken(`${TENANT_ID}:${WORKSPACE_ID}:`)).toThrow(InvitationTokenInvalidError);
  });

  it('rejects a completely malformed token', () => {
    expect(() => parseInvitationToken('garbage')).toThrow(InvitationTokenInvalidError);
  });

  it('rejects a token with too many segments', () => {
    expect(() => parseInvitationToken(`${TENANT_ID}:${WORKSPACE_ID}:secret:extra`)).toThrow(InvitationTokenInvalidError);
  });
});

describe('defaultInvitationExpiry', () => {
  it('returns a timestamp 7 days after the given now', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const expiry = defaultInvitationExpiry(now);
    expect(expiry.getTime() - now.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
