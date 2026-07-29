import { withTransaction } from '../../client.js';

/**
 * BUILD-19 discovered that a Postgres session variable set via SET LOCAL
 * on a pooled connection reverts to an empty string, not NULL, once that
 * transaction commits — a later transaction reusing the same physical
 * connection then sees current_setting('app.tenant_id', true) = '',
 * and ''::uuid throws. outbox_events_isolation (migration 0011) has no
 * IS-NULL fallback, so this must always be reset to a valid, castable
 * value before every query — the same nil-UUID pattern
 * OnboardingProgressRepository.getActiveForUser() established.
 */
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export interface OutboxBacklog {
  pendingCount: number;
  failedCount: number;
  deadLetteredCount: number;
  oldestPendingAgeSeconds: number | null;
}

/**
 * Reads events.outbox_events' backlog for job/outbox monitoring
 * (BUILD-25). events.outbox_events has RLS (outbox_events_isolation,
 * migration 0011) with no IS-NULL fallback — under the application's own
 * RLS-restricted role this always deterministically reports zero (this
 * function resets app.tenant_id to the nil-UUID sentinel first, which no
 * real row's tenant_id ever matches). For a true platform-wide backlog
 * across every tenant, call with an ADMIN_DATABASE_URL connection
 * (bypasses RLS), the same pattern already established for backup.sh and
 * ErrorEventRepository.countSince.
 */
export async function getOutboxBacklog(): Promise<OutboxBacklog> {
  return withTransaction(async (client) => {
    await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', NIL_UUID]);
    const result = await client.query<{
      pending_count: string;
      failed_count: string;
      dead_lettered_count: string;
      oldest_pending_age_seconds: string | null;
    }>(
      `SELECT
         count(*) FILTER (WHERE status = 'pending')       AS pending_count,
         count(*) FILTER (WHERE status = 'failed')        AS failed_count,
         count(*) FILTER (WHERE status = 'dead_lettered')  AS dead_lettered_count,
         extract(epoch FROM (now() - min(occurred_at) FILTER (WHERE status = 'pending')))::text AS oldest_pending_age_seconds
       FROM events.outbox_events`
    );
    const row = result.rows[0];
    return {
      pendingCount: Number(row.pending_count),
      failedCount: Number(row.failed_count),
      deadLetteredCount: Number(row.dead_lettered_count),
      oldestPendingAgeSeconds: row.oldest_pending_age_seconds ? Number(row.oldest_pending_age_seconds) : null,
    };
  });
}
