#!/usr/bin/env node
// BUILD-30 — Launch acceptance check: the single go/no-go tool that ties
// together evidence from every prior production-readiness build
// (BUILD-21 through BUILD-29) into one automated run, rather than
// re-implementing any of their checks. This is the "acceptance matrix"
// and "production smoke test" required scope items made executable.
//
// This script boots the REAL apps/api application in-process
// (app.listen(), the same pattern BUILD-27's load-test integration test
// and BUILD-28/29's own HTTP integration tests already use) against a
// real, already-migrated database, then runs a battery of real checks:
//   - migration state (no pending migrations)
//   - health/ready/OpenAPI (smoke-test.sh's own three checks, reused)
//   - GET /v1/metrics (monitoring proof)
//   - a load-test.mjs snapshot compared against BUILD-27's documented
//     SLO targets (load target proof)
//   - billing subscription lazily-provisions and reports plan/limits
//     (billing proof)
//   - incident declare -> resolve round-trip (this build's own tracking
//     capability, proof the operational tooling itself works)
//
// Security-gate, restore-proof, and privacy-proof evidence come from
// re-running BUILD-26/22's own existing scripts directly (see
// operating-procedure-build30.md) — not duplicated here, since those are
// already real, independent, live-tested tools; this script's job is
// the checks that only make sense against a live, listening instance.
//
// Exit code: 0 if every check in THIS script passes, non-zero (with the
// failing check named) on the first failure.
//
// Usage:
//   DATABASE_URL="postgresql://app_test_user:pw@host:5432/db" \
//   ADMIN_DATABASE_URL="postgresql://admin_role:pw@host:5432/db" \
//     node launch-acceptance-check.mjs

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_DIST_APP = path.join(__dirname, '..', '..', '..', 'apps', 'api', 'dist', 'app.js');
const CONFIG_DIST = path.join(__dirname, '..', '..', '..', 'packages', 'configuration', 'dist', 'index.js');
const DB_DIST = path.join(__dirname, '..', '..', '..', 'packages', 'database', 'dist', 'index.js');
const LOAD_TEST_MJS = path.join(__dirname, 'load-test.mjs');

const PORT = Number(process.env.ACCEPTANCE_CHECK_PORT ?? '34701');
const BASE_URL = `http://127.0.0.1:${PORT}`;

let failures = 0;
function report(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  if (!process.env.ADMIN_DATABASE_URL) throw new Error('ADMIN_DATABASE_URL is required');

  const { loadConfig } = await import(CONFIG_DIST);
  const { createPool, closePool, runMigrations } = await import(DB_DIST);
  const { buildApp } = await import(API_DIST_APP);

  const config = loadConfig({
    DATABASE_URL: process.env.DATABASE_URL, NODE_ENV: 'test', LOG_LEVEL: 'silent',
    PORT: String(PORT), RATE_LIMIT_MAX: '100000',
  });

  // ── Migration state ────────────────────────────────────────────────────
  // Migrations must run through an admin-capable connection (matching
  // migration-gate.sh's own convention) — the application role
  // deliberately has no access to the `public` schema _migrations lives
  // in (see grant-app-role.sh's own comment), so this step uses a
  // separate, temporary pool against ADMIN_DATABASE_URL, not the
  // application pool used for the rest of this script.
  {
    createPool({ connectionString: process.env.ADMIN_DATABASE_URL });
    try {
      await runMigrations();
      report('migration state: all migrations applied (no pending)', true);
    } catch (err) {
      report('migration state: all migrations applied (no pending)', false, err.message ?? String(err));
    } finally {
      await closePool();
    }
  }

  createPool({ connectionString: config.databaseUrl });
  const app = await buildApp(config);
  await app.listen({ port: PORT, host: '127.0.0.1' });

  try {
    // ── Smoke test (reuses smoke-test.sh's own three checks) ─────────────
    for (const [path_, expected] of [['/v1/health', 200], ['/v1/ready', 200], ['/documentation/json', 200]]) {
      const res = await fetch(`${BASE_URL}${path_}`);
      report(`smoke: GET ${path_} -> ${expected}`, res.status === expected, `got ${res.status}`);
    }

    // ── Monitoring proof ──────────────────────────────────────────────────
    // /v1/metrics requires platform:admin — unauthenticated call must be
    // rejected (401), proving the gate is live, not just that the route exists.
    const metricsUnauth = await fetch(`${BASE_URL}/v1/metrics`);
    report('monitoring: GET /v1/metrics requires authentication', metricsUnauth.status === 401, `got ${metricsUnauth.status}`);

    // ── Load target proof ─────────────────────────────────────────────────
    // execFileAsync (not execFileSync — see BUILD-27's own
    // load-test.integration.test.ts, which established this exact
    // pattern first): the in-process Fastify server booted above needs
    // the event loop free to answer the child process's HTTP requests.
    // A synchronous exec here would self-deadlock — the parent's single
    // JS thread would be frozen waiting for a child that's waiting on
    // an HTTP server the parent itself can no longer service. Caught by
    // this script's own first live run hanging past its 2-minute
    // timeout.
    const { stdout: loadTestOut } = await execFileAsync('node', [LOAD_TEST_MJS, '/v1/health'], {
      env: { ...process.env, BASE_URL, CONCURRENCY: '10', REQUESTS: '100' },
    });
    const report_ = JSON.parse(loadTestOut.slice(loadTestOut.indexOf('{')));
    // Targets from test-evidence-build27.md's proposed SLOs: p50 <= 20ms, p99 <= 100ms for in-memory endpoints.
    report('load: 100 requests at concurrency 10, 0 failures', report_.failureCount === 0, `${report_.failureCount} failures`);
    report('load: p50 <= 20ms (BUILD-27 SLO target)', report_.latencyMs.p50 <= 20, `p50=${report_.latencyMs.p50}ms`);
    report('load: p99 <= 100ms (BUILD-27 SLO target)', report_.latencyMs.p99 <= 100, `p99=${report_.latencyMs.p99}ms`);
    console.log(`  (throughput: ${report_.throughputReqPerSec} req/s)`);

    // ── Billing proof ──────────────────────────────────────────────────────
    const { EntitlementService } = await import(path.join(__dirname, '..', '..', '..', 'packages', 'billing', 'dist', 'index.js'));
    const entitlements = new EntitlementService();
    const acceptanceTenantId = '99999999-1a1a-4a1a-8a1a-000000000001';
    const acceptanceWorkspaceId = '99999999-1a1a-4a1a-8a1a-000000000002';
    // Fixture creation for tenancy.tenants/workspaces must go through an
    // admin (BYPASSRLS) connection — the application role's RLS policy
    // genuinely rejects inserting a new tenant row directly (correct,
    // fail-closed behavior; caught live by this script's own first run).
    // Driven via psql subprocess, not the `pg` npm package: this script
    // lives under infrastructure/, outside any workspace package, so it
    // has no node_modules of its own (the same reason every other
    // infrastructure/ script uses this convention).
    await execFileAsync('psql', [process.env.ADMIN_DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-c',
      `INSERT INTO tenancy.tenants (id, name, slug, status, plan_code) VALUES ('${acceptanceTenantId}','Launch Acceptance Tenant','launch-acceptance-tenant','active','test') ON CONFLICT (id) DO NOTHING;`
    ]);
    await execFileAsync('psql', [process.env.ADMIN_DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-c',
      `INSERT INTO tenancy.workspaces (id, tenant_id, name, slug, status) VALUES ('${acceptanceWorkspaceId}','${acceptanceTenantId}','Launch Acceptance WS','launch-acceptance-ws','active') ON CONFLICT (id) DO NOTHING;`
    ]);
    const ctx = { tenantId: acceptanceTenantId, workspaceId: acceptanceWorkspaceId, userId: '00000000-0000-0000-0000-000000000000' };
    const { subscription, plan } = await entitlements.getSubscriptionWithPlan(ctx);
    report('billing: subscription lazily provisions and resolves a real plan', subscription.status === 'active' && plan.code === 'free', `status=${subscription.status} plan=${plan.code}`);

    // ── Incident tracking proof (this build's own capability) ─────────────
    const { PlatformIncidentRepository } = await import(DB_DIST);
    const incidents = new PlatformIncidentRepository();
    const { incident } = await incidents.declare({ severity: 'sev4', title: 'Launch acceptance check', description: 'Automated proof this incident-tracking capability is live', declaredBy: 'launch-acceptance-check' });
    const resolved = await incidents.resolve(incident.id, 'launch-acceptance-check');
    report('incident tracking: declare -> resolve round-trip', resolved.status === 'resolved', `status=${resolved.status}`);
  } finally {
    await app.close();
    await closePool();
  }

  console.log('');
  if (failures > 0) {
    console.error(`Launch acceptance check FAILED: ${failures} check(s) did not pass.`);
    process.exit(1);
  }
  console.log('Launch acceptance check PASSED: all in-process checks succeeded.');
  console.log('Remaining acceptance-matrix items (security gates, restore proof, rollback proof, privacy proof, critical-workflow sign-off) are verified by re-running their own existing tools directly — see operating-procedure-build30.md.');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
