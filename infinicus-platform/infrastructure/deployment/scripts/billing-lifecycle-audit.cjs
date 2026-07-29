#!/usr/bin/env node
// BUILD-28 — Billing lifecycle audit: this platform has no background job
// runner (see BUILD-22's retention-pruning script and BUILD-24's
// rotate-db-credential.sh for the same operational-script convention),
// so time-based subscription transitions — a trial ending without
// conversion, a grace period elapsing without a successful payment — are
// driven by this script, meant to run on a schedule (e.g. daily cron/CI
// job), not inside the request path.
//
// Follows deployment-audit.cjs's argv-only pattern: every value crosses
// the bash-to-node boundary as an argv element, never interpolated into
// an eval'd string. Candidate subscriptions are discovered via
// ADMIN_DATABASE_URL (bypasses RLS, needed to scan across every tenant),
// but every actual state transition is performed through
// SubscriptionRepository.transitionStatus() under DATABASE_URL with a
// real per-tenant context set — the same safe, audited, fail-closed
// state-machine code path the API itself uses, not a raw admin UPDATE.
//
// Usage:
//   DATABASE_URL="postgresql://app_test_user:pw@host:5432/db" \
//   ADMIN_DATABASE_URL="postgresql://admin_role:pw@host:5432/db" \
//     node billing-lifecycle-audit.cjs expire-trials
//   DATABASE_URL="..." ADMIN_DATABASE_URL="..." \
//     node billing-lifecycle-audit.cjs expire-grace-periods
//
// Exit code: 0 on success (prints how many subscriptions were
// transitioned), non-zero on any failure.

const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  createPool, closePool, SubscriptionRepository,
} = require(path.join(__dirname, '..', '..', '..', 'packages', 'database', 'dist', 'index.js'));

const NIL_UUID = '00000000-0000-0000-0000-000000000000';
const GRACE_PERIOD_DAYS = 7;

function adminQuery(sql) {
  const raw = execFileSync('psql', [process.env.ADMIN_DATABASE_URL, '-tAc', sql], { encoding: 'utf8' });
  return raw.split('\n').map((l) => l.trim()).filter(Boolean);
}

async function main() {
  const [, , command] = process.argv;
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  if (!process.env.ADMIN_DATABASE_URL) throw new Error('ADMIN_DATABASE_URL is required');

  createPool({ connectionString: process.env.DATABASE_URL });
  try {
    const subscriptions = new SubscriptionRepository();

    if (command === 'expire-trials') {
      const rows = adminQuery(
        `SELECT id || '|' || tenant_id || '|' || workspace_id
         FROM billing.subscriptions
         WHERE status = 'trialing' AND trial_ends_at IS NOT NULL AND trial_ends_at < now();`
      );
      let count = 0;
      for (const row of rows) {
        const [subscriptionId, tenantId, workspaceId] = row.split('|');
        const ctx = { tenantId, workspaceId, userId: NIL_UUID };
        const gracePeriodEndsAt = new Date(Date.now() + GRACE_PERIOD_DAYS * 86_400_000);
        await subscriptions.transitionStatus(ctx, subscriptionId, 'grace_period', 'trial_expired_no_conversion', { gracePeriodEndsAt });
        console.log(`Trial expired -> grace_period: subscription ${subscriptionId} (tenant ${tenantId}), grace period ends ${gracePeriodEndsAt.toISOString()}`);
        count += 1;
      }
      console.log(`Processed ${count} expired trial(s).`);
    } else if (command === 'expire-grace-periods') {
      const rows = adminQuery(
        `SELECT id || '|' || tenant_id || '|' || workspace_id
         FROM billing.subscriptions
         WHERE status = 'grace_period' AND grace_period_ends_at IS NOT NULL AND grace_period_ends_at < now();`
      );
      let count = 0;
      for (const row of rows) {
        const [subscriptionId, tenantId, workspaceId] = row.split('|');
        const ctx = { tenantId, workspaceId, userId: NIL_UUID };
        await subscriptions.transitionStatus(ctx, subscriptionId, 'suspended', 'grace_period_expired');
        console.log(`Grace period expired -> suspended: subscription ${subscriptionId} (tenant ${tenantId})`);
        count += 1;
      }
      console.log(`Processed ${count} expired grace period(s).`);
    } else {
      console.error('Usage: node billing-lifecycle-audit.cjs <expire-trials|expire-grace-periods>');
      process.exitCode = 1;
    }
  } finally {
    await closePool();
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
