/**
 * Live PostgreSQL 16 integration tests for BUILD-28's billing schema
 * (billing.plans / billing.subscriptions / billing.subscription_status_history
 * / billing.usage_records) and its repositories.
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
  createPool, closePool,
  PlanRepository, SubscriptionRepository, UsageRepository,
  SubscriptionAlreadyExistsError, InvalidSubscriptionTransitionError, UsageLimitExceededError,
  type TenantContext,
} from '../src/index.js';

const run = !!process.env.DATABASE_URL;

const T1 = randomUUID();
const WS1 = randomUUID();
const T2 = randomUUID();
const WS2 = randomUUID();
let ctx1: TenantContext;
let ctx2: TenantContext;
let adminPool: Pool;

describe.runIf(run)('BUILD-28 billing repositories — live PostgreSQL', () => {
  const plans = new PlanRepository();
  const subscriptions = new SubscriptionRepository();
  const usage = new UsageRepository();

  beforeAll(async () => {
    const appUrl = process.env.DATABASE_URL!;
    const adminUrl = process.env.ADMIN_DATABASE_URL ?? appUrl;
    createPool({ connectionString: appUrl });
    adminPool = new Pool({ connectionString: adminUrl });

    // T1/T2 are fresh random ids every run, but a hardcoded slug literal
    // would still collide with a prior run's row on tenancy.tenants'
    // unique slug constraint (the exact repeat-run bug BUILD-27 found and
    // fixed in performance.integration.test.ts) — suffix with a run-unique
    // value instead.
    const runSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await adminPool.query(
      `INSERT INTO tenancy.tenants (id, name, slug, status, plan_code) VALUES
         ($1,'Billing Test Tenant 1',$3,'active','test'),
         ($2,'Billing Test Tenant 2',$4,'active','test')`,
      [T1, T2, `billing-t1-${runSuffix}`, `billing-t2-${runSuffix}`]
    );
    await adminPool.query(
      `INSERT INTO tenancy.workspaces (id, tenant_id, name, slug, status) VALUES
         ($1,$2,'Billing Test WS 1',$5,'active'),
         ($3,$4,'Billing Test WS 2',$6,'active')`,
      [WS1, T1, WS2, T2, `billing-ws1-${runSuffix}`, `billing-ws2-${runSuffix}`]
    );
    ctx1 = { tenantId: T1, workspaceId: WS1, userId: randomUUID() };
    ctx2 = { tenantId: T2, workspaceId: WS2, userId: randomUUID() };
  });

  afterAll(async () => {
    await adminPool.end();
    await closePool();
  });

  it('lists the seeded active plans ordered by price', async () => {
    const list = await plans.listActive();
    expect(list.map((p) => p.code)).toEqual(['free', 'pro', 'enterprise']);
    expect(list[0].priceCents).toBe(0);
    expect(list[1].priceCents).toBe(4900);
  });

  it('gets a plan by code and exposes its limits/features', async () => {
    const pro = await plans.getByCode('pro');
    expect(pro.limits.simulationRunsPerMonth).toBe(500);
    expect(pro.features.apiAccess).toBe(true);
    const enterprise = await plans.getByCode('enterprise');
    expect(enterprise.limits.simulationRunsPerMonth).toBeNull(); // unlimited
  });

  it('rejects an unknown plan code', async () => {
    await expect(plans.getByCode('nonexistent-plan')).rejects.toThrow();
  });

  it('creates a trialing subscription and records the creation in status history', async () => {
    const pro = await plans.getByCode('pro');
    const subscription = await subscriptions.create(ctx1, { planId: pro.id, trialDays: pro.trialDays });
    expect(subscription.status).toBe('trialing');
    expect(subscription.trialEndsAt).not.toBeNull();
    expect(subscription.tenantId).toBe(T1);

    const history = await subscriptions.listStatusHistory(ctx1, subscription.id);
    expect(history).toHaveLength(1);
    expect(history[0].fromStatus).toBeNull();
    expect(history[0].toStatus).toBe('trialing');
  });

  it('rejects a second subscription for the same tenant', async () => {
    const pro = await plans.getByCode('pro');
    await expect(subscriptions.create(ctx1, { planId: pro.id, trialDays: 14 })).rejects.toThrow(SubscriptionAlreadyExistsError);
  });

  it('transitions a subscription through its lifecycle, recording each step in history', async () => {
    const subscription = await subscriptions.getByTenant(ctx1);
    const active = await subscriptions.transitionStatus(ctx1, subscription.id, 'active', 'trial_converted', { paymentStatus: 'paid' });
    expect(active.status).toBe('active');
    expect(active.paymentStatus).toBe('paid');

    const suspended = await subscriptions.transitionStatus(ctx1, subscription.id, 'suspended', 'payment_failed_grace_expired');
    expect(suspended.status).toBe('suspended');
    expect(suspended.suspendedAt).not.toBeNull();

    const reactivated = await subscriptions.transitionStatus(ctx1, subscription.id, 'active', 'payment_recovered');
    expect(reactivated.status).toBe('active');
    expect(reactivated.reactivatedAt).not.toBeNull();

    const history = await subscriptions.listStatusHistory(ctx1, subscription.id);
    expect(history.map((h) => h.toStatus)).toEqual(['trialing', 'active', 'suspended', 'active']);
  });

  it('rejects an illegal status transition (canceled is terminal)', async () => {
    const subscription = await subscriptions.getByTenant(ctx1);
    const canceled = await subscriptions.transitionStatus(ctx1, subscription.id, 'canceled', 'test_cancel');
    expect(canceled.status).toBe('canceled');
    await expect(
      subscriptions.transitionStatus(ctx1, subscription.id, 'active', 'should_not_be_allowed')
    ).rejects.toThrow(InvalidSubscriptionTransitionError);
  });

  it('treats a transition to the current status as an idempotent no-op', async () => {
    const subscription = await subscriptions.getByTenant(ctx1);
    const historyBefore = await subscriptions.listStatusHistory(ctx1, subscription.id);
    const result = await subscriptions.transitionStatus(ctx1, subscription.id, subscription.status, 'retry');
    expect(result.status).toBe(subscription.status);
    const historyAfter = await subscriptions.listStatusHistory(ctx1, subscription.id);
    expect(historyAfter).toHaveLength(historyBefore.length); // no new row written
  });

  it('increments usage within the limit and enforces the limit fail-closed once exceeded, without persisting the overage', async () => {
    const before = await usage.getCurrent(ctx2, 'simulation_runs');
    expect(before).toBe(0);

    const afterFirst = await usage.incrementAndCheck(ctx2, 'simulation_runs', 15, 20);
    expect(afterFirst).toBe(15);

    const afterSecond = await usage.incrementAndCheck(ctx2, 'simulation_runs', 5, 20);
    expect(afterSecond).toBe(20); // exactly at the limit — allowed

    await expect(usage.incrementAndCheck(ctx2, 'simulation_runs', 1, 20)).rejects.toThrow(UsageLimitExceededError);

    // The rejected attempt must not have been persisted — usage stays at 20, not 21.
    const finalQuantity = await usage.getCurrent(ctx2, 'simulation_runs');
    expect(finalQuantity).toBe(20);
  });

  it('treats a null limit as unlimited', async () => {
    const q1 = await usage.incrementAndCheck(ctx2, 'reasoning_runs', 1_000_000, null);
    expect(q1).toBe(1_000_000);
  });

  it('meters simulation_runs and reasoning_runs independently for the same tenant', async () => {
    const simUsage = await usage.getCurrent(ctx2, 'simulation_runs');
    const reasoningUsage = await usage.getCurrent(ctx2, 'reasoning_runs');
    expect(simUsage).toBe(20);
    expect(reasoningUsage).toBe(1_000_000);
  });

  it('concurrent usage increments serialize correctly and never let the total exceed the limit', async () => {
    // T1's simulation_runs metric is untouched by prior tests in this file
    // (only T2's was exercised above) — usage metering has no dependency
    // on the tenant's subscription status (T1's own subscription was
    // canceled by an earlier test; enforcement of "is this tenant even
    // allowed to act" is a separate, higher-level concern handled by
    // EntitlementService, not by UsageRepository itself).
    const LIMIT = 20;
    const concurrentResults = await Promise.allSettled(
      Array.from({ length: 30 }, () => usage.incrementAndCheck(ctx1, 'simulation_runs', 1, LIMIT))
    );
    const succeeded = concurrentResults.filter((r) => r.status === 'fulfilled').length;
    const failed = concurrentResults.filter((r) => r.status === 'rejected').length;
    expect(succeeded).toBe(LIMIT);
    expect(failed).toBe(30 - LIMIT);

    const finalQuantity = await usage.getCurrent(ctx1, 'simulation_runs');
    expect(finalQuantity).toBe(LIMIT);
  }, 30_000);

  it('enforces tenant isolation: tenant 2 cannot see tenant 1\'s subscription', async () => {
    const free = await plans.getByCode('free');
    const t2Subscription = await subscriptions.create(ctx2, { planId: free.id, trialDays: 0 });
    expect(t2Subscription.tenantId).toBe(T2);

    const fetchedForT2 = await subscriptions.getByTenant(ctx2);
    expect(fetchedForT2.tenantId).toBe(T2);

    // Direct cross-tenant getById must fail closed (RLS-scoped not-found, not a cross-tenant read).
    const t1Subscription = await subscriptions.getByTenant(ctx1);
    await expect(subscriptions.getById(ctx2, t1Subscription.id)).rejects.toThrow();
  });
});

describe.skipIf(run)('BUILD-28 billing repositories — live PostgreSQL (skipped, no DATABASE_URL)', () => {
  it('skips live tests when DATABASE_URL is not set', () => {
    expect(run).toBe(false);
  });
});
