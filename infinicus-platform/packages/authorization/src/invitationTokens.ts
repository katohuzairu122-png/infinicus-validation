import { randomBytes } from 'node:crypto';
import { hashToken } from '@infinicus/authentication';
import { InvitationTokenInvalidError } from './errors.js';

const INVITATION_SECRET_BYTES = 24;
const DEFAULT_INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface GeneratedInvitationToken {
  rawToken: string;
  tokenHash: string;
}

/**
 * tenancy.invitations is RLS-scoped to its tenant, so an invitation link
 * must carry enough information for the acceptor to establish tenant
 * context before any database lookup — the raw token is therefore
 * structured as `${tenantId}:${workspaceId}:${secret}`, never opaque.
 */
export function generateInvitationToken(tenantId: string, workspaceId: string): GeneratedInvitationToken {
  const secret = randomBytes(INVITATION_SECRET_BYTES).toString('hex');
  const rawToken = `${tenantId}:${workspaceId}:${secret}`;
  return { rawToken, tokenHash: hashToken(rawToken) };
}

export interface ParsedInvitationToken {
  tenantId: string;
  workspaceId: string;
  tokenHash: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseInvitationToken(rawToken: string): ParsedInvitationToken {
  const parts = rawToken.split(':');
  if (parts.length !== 3 || !UUID_RE.test(parts[0]) || !UUID_RE.test(parts[1]) || parts[2].length === 0) {
    throw new InvitationTokenInvalidError();
  }
  return { tenantId: parts[0], workspaceId: parts[1], tokenHash: hashToken(rawToken) };
}

export function defaultInvitationExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + DEFAULT_INVITATION_TTL_MS);
}
