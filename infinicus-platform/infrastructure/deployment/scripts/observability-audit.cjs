#!/usr/bin/env node
// BUILD-25 — CLI helper for job/outbox monitoring, error-rate checking,
// alert lifecycle management, and an operational summary report.
// Follows deployment-audit.cjs/secret-rotation-audit.cjs's argv-only
// pattern: every value crosses the bash-to-node boundary as an argv
// element, never interpolated into an eval'd string.
//
// Usage:
//   node observability-audit.cjs check-outbox-lag <maxPendingCount> <maxAgeSeconds>
//     -> exit 0 if the outbox backlog is within both thresholds; exit 1
//        (with a printed reason) otherwise. Should be run with
//        ADMIN_DATABASE_URL — events.outbox_events' RLS policy has no
//        tenant-NULL fallback, so the application's own RLS-restricted
//        role always sees zero (see outboxMonitor.ts's own doc comment).
//   node observability-audit.cjs check-error-rate <windowMinutes> <maxCount>
//     -> exit 0 if the error count in the window is within maxCount;
//        exit 1 otherwise. Same ADMIN_DATABASE_URL caveat as above.
//   node observability-audit.cjs trigger-alert <alertName> <severity> <message>
//     -> prints the new alert_events id to stdout
//   node observability-audit.cjs resolve-alert <id>
//   node observability-audit.cjs summary <windowMinutes>
//     -> prints a real, computed operational summary (error count, outbox
//        backlog, active alert count) as JSON. Deliberately does NOT
//        compute an SLO/availability percentage — that requires a
//        request-volume denominator this build does not add (see
//        known-limitations-build25.md); fabricating one would violate
//        this platform's "execution evidence, not fabricated status"
//        rule (root CLAUDE.md §10).
//
// Requires DATABASE_URL in the environment.

const path = require('node:path');
const { createPool, ErrorEventRepository, AlertEventRepository, getOutboxBacklog, closePool } = require(
  path.join(__dirname, '..', '..', '..', 'packages', 'database', 'dist', 'index.js')
);

async function main() {
  const [, , command, ...args] = process.argv;
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is required');
    process.exit(1);
  }
  createPool({ connectionString: process.env.DATABASE_URL });
  const errorRepo = new ErrorEventRepository();
  const alertRepo = new AlertEventRepository();

  try {
    if (command === 'check-outbox-lag') {
      const [maxPendingRaw, maxAgeSecondsRaw] = args;
      const maxPending = Number(maxPendingRaw);
      const maxAgeSeconds = Number(maxAgeSecondsRaw);
      const backlog = await getOutboxBacklog();
      if (backlog.pendingCount > maxPending) {
        console.error(`ERROR: outbox pending count ${backlog.pendingCount} exceeds threshold ${maxPending}.`);
        process.exitCode = 1;
        return;
      }
      if (backlog.oldestPendingAgeSeconds !== null && backlog.oldestPendingAgeSeconds > maxAgeSeconds) {
        console.error(`ERROR: oldest pending outbox event is ${backlog.oldestPendingAgeSeconds.toFixed(1)}s old, exceeds threshold ${maxAgeSeconds}s.`);
        process.exitCode = 1;
        return;
      }
      console.log(`Outbox lag within thresholds: ${JSON.stringify(backlog)}`);
    } else if (command === 'check-error-rate') {
      const [windowMinutesRaw, maxCountRaw] = args;
      const windowMinutes = Number(windowMinutesRaw);
      const maxCount = Number(maxCountRaw);
      const count = await errorRepo.countSince(windowMinutes);
      if (count > maxCount) {
        console.error(`ERROR: ${count} error(s) in the last ${windowMinutes} minute(s) exceeds threshold ${maxCount}.`);
        process.exitCode = 1;
        return;
      }
      console.log(`Error rate within threshold: ${count} error(s) in the last ${windowMinutes} minute(s).`);
    } else if (command === 'trigger-alert') {
      const [alertName, severity, message] = args;
      const alert = await alertRepo.trigger({ alertName, severity, message });
      console.log(alert.id);
    } else if (command === 'resolve-alert') {
      const [id] = args;
      await alertRepo.resolve(id);
    } else if (command === 'summary') {
      const [windowMinutesRaw] = args;
      const windowMinutes = Number(windowMinutesRaw ?? '60');
      const [errorCount, outboxBacklog, activeAlerts] = await Promise.all([
        errorRepo.countSince(windowMinutes),
        getOutboxBacklog(),
        alertRepo.listActive(1000),
      ]);
      console.log(JSON.stringify({
        windowMinutes,
        errors: { count: errorCount },
        outbox: outboxBacklog,
        activeAlertCount: activeAlerts.length,
      }, null, 2));
    } else {
      console.error(`ERROR: unknown command "${command}" (expected check-outbox-lag|check-error-rate|trigger-alert|resolve-alert|summary)`);
      process.exit(1);
    }
  } finally {
    await closePool();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
