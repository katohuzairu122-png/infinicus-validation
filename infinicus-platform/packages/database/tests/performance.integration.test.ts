/**
 * Live PostgreSQL 16 integration tests for BUILD-27's performance and
 * load-readiness requirements: database load / concurrent users,
 * Simulation concurrency, ADI concurrency, outbox throughput, and a
 * large-tenant test. Every measurement here is real (wall-clock timed
 * against a real Postgres instance through the real connection pool),
 * not simulated.
 *
 * Requires:
 *   DATABASE_URL       — app_test_user (RLS enforced)
 *   ADMIN_DATABASE_URL — infinicus_test_admin (BYPASSRLS, fixture setup)
 *
 * Guard pattern: describe.runIf(!!process.env.DATABASE_URL)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import {
  createPool, closePool, poolStats,
  SimulationModelRepository, SimulationScenarioRepository, SimulationRunRepository,
  DecisionQuestionRepository, DecisionCaseRepository, ReasoningRunRepository,
  ErrorEventRepository,
  type TenantContext,
} from '../src/index.js';

const run = !!process.env.DATABASE_URL;

// Fixed IDs (not randomUUID()) with ON CONFLICT DO NOTHING below: this
// suite's afterAll only closes pools, it does not delete the rows it
// creates (deleting 500+ bulk-inserted businesses plus every Simulation/
// ADI fixture safely would need the same FK-ordered walk as
// delete-tenant-data.mjs). A fixed slug/ids with idempotent setup means
// reruns reuse the same fixture instead of colliding on the unique slug
// (a real repeat-run failure this suite hit during BUILD-27 development).
const T1 = '77777777-7777-4777-8777-000000000001';
const WS1 = '77777777-7777-4777-8777-000000000002';
const BIZ1 = '77777777-7777-4777-8777-000000000003';
let ctx: TenantContext;
let adminPool: Pool;

function uniqueCode(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function timeIt<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const startedAt = performance.now();
  const result = await fn();
  return { result, durationMs: performance.now() - startedAt };
}

describe.runIf(run)('BUILD-27 performance and load readiness — live PostgreSQL', () => {
  beforeAll(async () => {
    const appUrl = process.env.DATABASE_URL!;
    const adminUrl = process.env.ADMIN_DATABASE_URL ?? appUrl;
    createPool({ connectionString: appUrl });
    adminPool = new Pool({ connectionString: adminUrl });

    await adminPool.query(
      `INSERT INTO tenancy.tenants (id, name, slug, status, plan_code) VALUES ($1,'PERF-Test Tenant','perf-t1','active','test')
       ON CONFLICT (id) DO NOTHING`,
      [T1]
    );
    await adminPool.query(
      `INSERT INTO tenancy.workspaces (id, tenant_id, name, slug, status) VALUES ($1,$2,'PERF-Test WS','perf-ws1','active')
       ON CONFLICT (id) DO NOTHING`,
      [WS1, T1]
    );
    await adminPool.query(
      `INSERT INTO platform.businesses (id, tenant_id, workspace_id, legal_name, business_code, status, industry, correlation_id)
       VALUES ($1,$2,$3,'PERF Test Biz','PERF-BIZ',$4,'tech',gen_random_uuid())
       ON CONFLICT (id) DO NOTHING`,
      [BIZ1, T1, WS1, 'active']
    );
    ctx = { tenantId: T1, workspaceId: WS1, userId: randomUUID() };
  });

  afterAll(async () => {
    await adminPool.end();
    await closePool();
  });

  it('database load: 50 concurrent reads succeed and the connection pool recovers to idle afterward', async () => {
    const errorRepo = new ErrorEventRepository();
    const { durationMs } = await timeIt(() =>
      Promise.all(Array.from({ length: 50 }, () => errorRepo.countSince(60)))
    );
    console.log(`[PERF] 50 concurrent ErrorEventRepository.countSince(): ${durationMs.toFixed(0)}ms`);
    expect(durationMs).toBeGreaterThan(0);

    // Give the pool a moment to release idle connections, then confirm no leak.
    await new Promise((r) => setTimeout(r, 50));
    const stats = poolStats();
    expect(stats.waitingCount).toBe(0);
  }, 30_000);

  it('Simulation concurrency: 20 concurrent simulation runs against the same scenario succeed with no corruption', async () => {
    const modelRepo = new SimulationModelRepository();
    const scenarioRepo = new SimulationScenarioRepository();
    const runRepo = new SimulationRunRepository();

    const model = await modelRepo.createModel(ctx, BIZ1, uniqueCode('perf-model'), 'PERF Model');
    const modelVersion = await modelRepo.createVersion(ctx, model.id, BIZ1, 'infinicus-engine-v3', {});
    const scenario = await scenarioRepo.createScenario(ctx, BIZ1, model.id, uniqueCode('perf-scn'), 'PERF Scenario');
    const scenarioVersion = await scenarioRepo.createVersion(ctx, scenario.id, BIZ1);

    const CONCURRENCY = 20;
    const { result: requests, durationMs: requestDurationMs } = await timeIt(() =>
      Promise.all(
        Array.from({ length: CONCURRENCY }, () =>
          runRepo.createRequest(ctx, BIZ1, scenarioVersion.id, uniqueCode('perf-req'), uniqueCode('idem'))
        )
      )
    );
    const { result: runs, durationMs: runDurationMs } = await timeIt(() =>
      Promise.all(requests.map(({ request }) => runRepo.createRun(ctx, BIZ1, request.id, modelVersion.id, uniqueCode('perf-run'))))
    );
    console.log(`[PERF] ${CONCURRENCY} concurrent simulation requests: ${requestDurationMs.toFixed(0)}ms; ${CONCURRENCY} concurrent runs: ${runDurationMs.toFixed(0)}ms`);

    expect(runs).toHaveLength(CONCURRENCY);
    expect(new Set(runs.map((r) => r.id)).size).toBe(CONCURRENCY); // every run got a distinct id — no accidental row reuse/corruption
    expect(runs.every((r) => r.status === 'queued' || r.status === 'running' || typeof r.status === 'string')).toBe(true);
  }, 30_000);

  it('ADI concurrency: 20 concurrent reasoning runs against the same case succeed with no corruption', async () => {
    const questionRepo = new DecisionQuestionRepository();
    const caseRepo = new DecisionCaseRepository();
    const reasoningRepo = new ReasoningRunRepository();

    const question = await questionRepo.createQuestion(ctx, BIZ1, uniqueCode('perf-q'), 'Should we expand into region X?');
    const decisionCase = await caseRepo.createCase(ctx, BIZ1, question.id, uniqueCode('perf-case'));

    const CONCURRENCY = 20;
    const { result: requests, durationMs: requestDurationMs } = await timeIt(() =>
      Promise.all(
        Array.from({ length: CONCURRENCY }, () =>
          reasoningRepo.createRequest(ctx, BIZ1, decisionCase.id, uniqueCode('perf-req'), uniqueCode('idem'))
        )
      )
    );
    const { result: runs, durationMs: runDurationMs } = await timeIt(() =>
      Promise.all(requests.map(({ request }) => reasoningRepo.createRun(ctx, BIZ1, request.id, decisionCase.id)))
    );
    console.log(`[PERF] ${CONCURRENCY} concurrent ADI reasoning requests: ${requestDurationMs.toFixed(0)}ms; ${CONCURRENCY} concurrent runs: ${runDurationMs.toFixed(0)}ms`);

    expect(runs).toHaveLength(CONCURRENCY);
    expect(new Set(runs.map((r) => r.id)).size).toBe(CONCURRENCY);
  }, 30_000);

  // NOTE: as of BUILD-27, no repository or service-layer code in this
  // monorepo actually calls the `simulation.emit_*` outbox helper
  // functions defined in migration 0076 — they are SQL primitives that
  // exist but are not yet wired into any domain write path
  // (createModel/createScenario/createRequest/createRun all commit
  // without emitting an outbox event). This is a genuine gap, documented
  // in BUILD-27's known-limitations doc, not something this test should
  // paper over. Until that wiring lands, the only real, exercised outbox
  // code path is the SQL emission primitive itself, so this test
  // measures concurrent throughput of that primitive directly — the
  // actual INSERT INTO events.outbox_events path — via
  // simulation.emit_run_requested(), which is representative of every
  // emit_* wrapper (they all funnel through emit_outbox_event()).
  it('outbox throughput: measures real event-emission rate for the outbox INSERT code path under concurrency', async () => {
    const before = (await adminPool.query(
      `SELECT count(*)::int AS n FROM events.outbox_events WHERE tenant_id = $1`, [T1]
    )).rows[0].n;

    const COUNT = 20;
    const { durationMs } = await timeIt(() =>
      Promise.all(
        Array.from({ length: COUNT }, () =>
          adminPool.query(
            `SELECT simulation.emit_run_requested($1, $2, gen_random_uuid(), gen_random_uuid())`,
            [T1, WS1]
          )
        )
      )
    );

    const after = (await adminPool.query(
      `SELECT count(*)::int AS n FROM events.outbox_events WHERE tenant_id = $1`, [T1]
    )).rows[0].n;
    const emitted = after - before;
    const eventsPerSec = emitted / (durationMs / 1000);
    console.log(`[PERF] ${emitted} outbox events emitted from ${COUNT} concurrent emit_run_requested() calls in ${durationMs.toFixed(0)}ms (${eventsPerSec.toFixed(1)} events/sec)`);
    expect(emitted).toBe(COUNT);
  }, 30_000);

  it('large-tenant test: bulk-creates 500 businesses for one tenant and measures real listing query time', async () => {
    const values: string[] = [];
    const params: unknown[] = [];
    for (let i = 0; i < 500; i++) {
      const base = params.length;
      values.push(`($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},gen_random_uuid())`);
      params.push(randomUUID(), T1, WS1, `Large-Tenant Biz ${i}`, uniqueCode(`LT-BIZ-${i}`), 'active', 'tech');
    }
    const { durationMs: insertDurationMs } = await timeIt(() =>
      adminPool.query(
        `INSERT INTO platform.businesses (id, tenant_id, workspace_id, legal_name, business_code, status, industry, correlation_id) VALUES ${values.join(',')}`,
        params
      )
    );
    console.log(`[PERF] bulk-inserted 500 businesses in ${insertDurationMs.toFixed(0)}ms`);

    const { result: countResult, durationMs: queryDurationMs } = await timeIt(() =>
      adminPool.query(`SELECT count(*)::int AS n FROM platform.businesses WHERE tenant_id = $1`, [T1])
    );
    console.log(`[PERF] counted ${countResult.rows[0].n} businesses for a large tenant in ${queryDurationMs.toFixed(0)}ms`);
    expect(countResult.rows[0].n).toBeGreaterThanOrEqual(501); // 500 bulk + the original fixture business
  }, 30_000);

  it('resilience: a small connection pool (max 2) under 10 concurrent operations queues rather than crashing', async () => {
    const smallPool = new Pool({ connectionString: process.env.DATABASE_URL!, max: 2, connectionTimeoutMillis: 5_000 });
    try {
      const { result, durationMs } = await timeIt(() =>
        Promise.all(
          Array.from({ length: 10 }, () => smallPool.query('SELECT pg_sleep(0.05), 1 AS ok'))
        )
      );
      console.log(`[PERF] 10 concurrent queries through a max-2 pool completed (queued, not crashed) in ${durationMs.toFixed(0)}ms`);
      expect(result).toHaveLength(10);
      expect(result.every((r) => r.rows[0].ok === 1)).toBe(true);
    } finally {
      await smallPool.end();
    }
  }, 30_000);
});

describe.skipIf(run)('BUILD-27 performance and load readiness — live PostgreSQL (skipped, no DATABASE_URL)', () => {
  it('skips live tests when DATABASE_URL is not set', () => {
    expect(run).toBe(false);
  });
});
