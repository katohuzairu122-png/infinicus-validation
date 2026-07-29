import type { TenantContext } from '@infinicus/database';

/**
 * PLACEHOLDER pending a real authentication UI. No login/session flow has
 * been built yet (out of scope for BUILD-20 — see
 * docs/production-readiness/known-limitations-build20.md), so tenant
 * context is read from explicit query parameters rather than a session
 * cookie. Every workflow page therefore requires
 * ?tenantId=&workspaceId=&userId= until a real auth build wires session
 * handling through apps/web.
 */
export type SearchParams = Record<string, string | string[] | undefined>;

export function contextFromSearchParams(searchParams: SearchParams): TenantContext | null {
  const tenantId = asString(searchParams.tenantId);
  const workspaceId = asString(searchParams.workspaceId);
  const userId = asString(searchParams.userId);
  if (!tenantId || !workspaceId || !userId) return null;
  return { tenantId, workspaceId, userId };
}

export function ctxQuery(ctx: TenantContext): string {
  return `tenantId=${encodeURIComponent(ctx.tenantId)}&workspaceId=${encodeURIComponent(ctx.workspaceId)}&userId=${encodeURIComponent(ctx.userId)}`;
}

function asString(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
