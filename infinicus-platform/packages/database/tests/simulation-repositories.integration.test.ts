/**
 * Live PostgreSQL 16 integration tests for Stage 2F Simulation
 * persistence (BUILD-13).
 *
 * Requires:
 *   DATABASE_URL       — app_test_user (RLS enforced)
 *   ADMIN_DATABASE_URL — infinicus_test_admin (BYPASSRLS)
 *
 * Guard pattern: describe.runIf(!!process.env.DATABASE_URL)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { createPool, closePool } from '../src/client.js';
import {
  SimulationIntakeRepository,
  SimulationModelRepository,
  SimulationScenarioRepository,
  SimulationRunRepository,
  SimulationResultRepository,
  SimulationRiskRepository,
  SimulationSensitivityRepository,
  ScenarioComparisonRepository,
  SimulationValidationRepository,
  SimulationPublicationRepository,
  SimulationComponentRegistryRepository,
  NotFoundError,
  ValidationError,
  InvalidTransitionError,
  SimulationModelStateConflictError,
  SimulationScenarioStateConflictError,
  SimulationResultStateConflictError,
  SimulationResultImmutableError,
  SimulationSensitivityStateConflictError,
  SimulationValidationStateConflictError,
  SimulationCalibrationStateConflictError,
} from '../src/repositories/simulation/index.js';
import { InsightPackageRepository, BIPublicationPackageRepository } from '../src/repositories/bi/index.js';
import {
  DTIntakeRepository,
  DigitalTwinDefinitionRepository,
  DigitalTwinInstanceRepository,
  DigitalTwinSnapshotRepository,
  ScenarioBaselineRepository,
  DTPublicationPackageRepository,
} from '../src/repositories/dt/index.js';

const run = !!process.env.DATABASE_URL;

const T1  = '44444444-5151-0000-0000-000000000001';
const WS1 = '44444444-5151-0000-0000-000000000002';
const T2  = '44444444-5151-0000-0000-000000000003';
const WS2 = '44444444-5151-0000-0000-000000000004';
const UID = '44444444-5151-0000-0000-000000000099';
const BIZ1 = '44444444-5252-0000-0000-000000000001';
const BIZ2 = '44444444-5252-0000-0000-000000000002';

const ctx1 = { tenantId: T1, workspaceId: WS1, userId: UID };
const ctx2 = { tenantId: T2, workspaceId: WS2, userId: UID };

let adminPool: Pool | null = null;

function uniqueCode(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Builds the full upstream chain (BI publication -> DT intake -> definition ->
 * instance -> published snapshot -> published scenario baseline -> DT
 * publication targeting simulation) and returns the resulting
 * dt_publication_packages.id — the real upstream FK target for
 * simulation_intake_packages.
 */
async function createDtPackage(ctx: typeof ctx1, businessId: string): Promise<string> {
  const insightRepo = new InsightPackageRepository();
  const biPubRepo = new BIPublicationPackageRepository();
  const biPkg = await insightRepo.create(ctx, businessId, uniqueCode('insight'));
  const biVersion = await insightRepo.publishVersion(ctx, biPkg.id, businessId, { summary: 'BI evidence' });
  const { package: biPub } = await biPubRepo.publish(ctx, businessId, biVersion.id, 'business_digital_twin', 'DT-01', uniqueCode('idem'));

  const dtIntakeRepo = new DTIntakeRepository();
  await dtIntakeRepo.receivePackage(ctx, { businessId, biPublicationPackageId: biPub.id, intakeCode: uniqueCode('dt-intake'), idempotencyKey: uniqueCode('idem') });

  const defRepo = new DigitalTwinDefinitionRepository();
  const definition = await defRepo.createDefinition(ctx, businessId, uniqueCode('def'), 'Sim Fixture Definition');
  const defVersion = await defRepo.createVersion(ctx, definition.id, businessId, {});
  await defRepo.validateVersion(ctx, defVersion.id);
  await defRepo.activateVersion(ctx, defVersion.id);

  const instRepo = new DigitalTwinInstanceRepository();
  const instance = await instRepo.createInstance(ctx, businessId, definition.id, uniqueCode('inst'));

  const snapRepo = new DigitalTwinSnapshotRepository();
  const { snapshot, version: snapVersion } = await snapRepo.createSnapshot(ctx, businessId, instance.id, uniqueCode('snap'), new Date(), 'Sim fixture snapshot');
  await snapRepo.validateSnapshot(ctx, snapshot.id, snapVersion.id);
  await snapRepo.publishSnapshot(ctx, snapshot.id, snapVersion.id);

  const baselineRepo = new ScenarioBaselineRepository();
  const { baseline, version: baselineVersion } = await baselineRepo.createBaseline(ctx, businessId, instance.id, snapVersion.id, uniqueCode('base'), 'sim fixture objective');
  await baselineRepo.validateBaseline(ctx, baseline.id, baselineVersion.id);
  await baselineRepo.publishBaseline(ctx, baseline.id, baselineVersion.id);

  const dtPubRepo = new DTPublicationPackageRepository();
  const dtInsight = await dtPubRepo.createInsightPackage(ctx, businessId, uniqueCode('dt-insight'));
  const dtInsightVersion = await dtPubRepo.createVersion(ctx, dtInsight.id, businessId, 'DT->SIM fixture summary', { snapshotVersionId: snapVersion.id, scenarioBaselineVersionId: baselineVersion.id });
  const { package: dtPub } = await dtPubRepo.createPackage(ctx, businessId, dtInsightVersion.id, 'simulation', 'SIM-01', uniqueCode('idem'));
  return dtPub.id;
}

async function setupSimulationIntegration(): Promise<void> {
  const appUrl   = process.env.DATABASE_URL!;
  const adminUrl = process.env.ADMIN_DATABASE_URL ?? appUrl;

  createPool({ connectionString: appUrl });
  adminPool = new Pool({ connectionString: adminUrl });

  await adminPool.query(
    `INSERT INTO tenancy.tenants (id, name, slug, status, plan_code)
     VALUES ($1,'SIM-Test Tenant 1','sim-t1','active','test'),
            ($2,'SIM-Test Tenant 2','sim-t2','active','test')
     ON CONFLICT (id) DO NOTHING`,
    [T1, T2]
  );
  await adminPool.query(
    `INSERT INTO tenancy.workspaces (id, tenant_id, name, slug, status)
     VALUES ($1,$2,'SIM-Test WS 1','sim-ws1','active'),
            ($3,$4,'SIM-Test WS 2','sim-ws2','active')
     ON CONFLICT (id) DO NOTHING`,
    [WS1, T1, WS2, T2]
  );
  await adminPool.query(
    `INSERT INTO platform.businesses (id, tenant_id, workspace_id, legal_name, business_code, status)
     VALUES ($1,$2,$3,'SIM Test Biz 1','sim-biz1','active'),
            ($4,$5,$6,'SIM Test Biz 2','sim-biz2','active')
     ON CONFLICT (id) DO NOTHING`,
    [BIZ1, T1, WS1, BIZ2, T2, WS2]
  );
  await adminPool.query(
    `INSERT INTO identity.users (id, email, status)
     VALUES ($1,'sim-test-user@example.test','active')
     ON CONFLICT (id) DO NOTHING`,
    [UID]
  );
}

async function teardownSimulationIntegration(): Promise<void> {
  if (adminPool) {
    await adminPool.end();
  }
  await closePool();
}

async function makeModelAndScenario(ctx: typeof ctx1, businessId: string) {
  const modelRepo = new SimulationModelRepository();
  const model = await modelRepo.createModel(ctx, businessId, uniqueCode('model'), 'Engine v3 Model');
  const modelVersion = await modelRepo.createVersion(ctx, model.id, businessId, 'infinicus-engine-v3', {});
  const scenarioRepo = new SimulationScenarioRepository();
  const scenario = await scenarioRepo.createScenario(ctx, businessId, model.id, uniqueCode('scn'), 'Growth Scenario');
  const scenarioVersion = await scenarioRepo.createVersion(ctx, scenario.id, businessId);
  return { modelRepo, model, modelVersion, scenarioRepo, scenario, scenarioVersion };
}

async function makeRun(ctx: typeof ctx1, businessId: string) {
  const { modelVersion, scenarioVersion } = await makeModelAndScenario(ctx, businessId);
  const runRepo = new SimulationRunRepository();
  const { request } = await runRepo.createRequest(ctx, businessId, scenarioVersion.id, uniqueCode('req'), uniqueCode('idem'));
  const run_ = await runRepo.createRun(ctx, businessId, request.id, modelVersion.id, uniqueCode('run'));
  return { runRepo, request, run: run_ };
}

describe.runIf(run)('Stage 2F Simulation — live PostgreSQL', () => {
  beforeAll(setupSimulationIntegration);
  afterAll(teardownSimulationIntegration);

  // ── 1. Schema and security posture sanity ─────────────────────────────────
  describe('schema and RLS posture', () => {
    it('simulation schema exists with 44 tables', async () => {
      const result = await adminPool!.query(
        `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'simulation'`
      );
      expect(result.rows[0].n).toBe(44);
    });

    it('every simulation table has RLS enabled and forced', async () => {
      const result = await adminPool!.query(
        `SELECT count(*)::int AS n FROM pg_tables t
         JOIN pg_class c ON c.relname = t.tablename
         JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
         WHERE t.schemaname = 'simulation' AND c.relrowsecurity AND c.relforcerowsecurity`
      );
      expect(result.rows[0].n).toBe(44);
    });

    it('fails closed with no tenant context set (app_test_user, RLS enforced)', async () => {
      const { getPool } = await import('../src/client.js');
      const result = await getPool().query('SELECT count(*)::int AS n FROM simulation.simulation_models');
      expect(result.rows[0].n).toBe(0);
    });
  });

  // ── 2. SimulationIntakeRepository ───────────────────────────────────────────
  describe('SimulationIntakeRepository', () => {
    it('receives a valid DT publication package', async () => {
      const repo = new SimulationIntakeRepository();
      const dtPkg = await createDtPackage(ctx1, BIZ1);
      const { package: pkg, idempotentReplay } = await repo.receivePackage(ctx1, {
        businessId: BIZ1, dtPublicationPackageId: dtPkg, intakeCode: uniqueCode('intake'), idempotencyKey: uniqueCode('idem'),
      });
      expect(pkg.status).toBe('received');
      expect(pkg.dtPublicationPackageId).toBe(dtPkg);
      expect(idempotentReplay).toBe(false);
    });

    it('is idempotent on repeated delivery of the same DT package', async () => {
      const repo = new SimulationIntakeRepository();
      const dtPkg = await createDtPackage(ctx1, BIZ1);
      const first = await repo.receivePackage(ctx1, { businessId: BIZ1, dtPublicationPackageId: dtPkg, intakeCode: uniqueCode('intake'), idempotencyKey: uniqueCode('idem') });
      const second = await repo.receivePackage(ctx1, { businessId: BIZ1, dtPublicationPackageId: dtPkg, intakeCode: uniqueCode('intake'), idempotencyKey: uniqueCode('idem') });
      expect(second.package.id).toBe(first.package.id);
      expect(second.idempotentReplay).toBe(true);
    });

    it('preserves upstream lineage — dtPublicationPackageId is exact', async () => {
      const repo = new SimulationIntakeRepository();
      const dtPkg = await createDtPackage(ctx2, BIZ2);
      const { package: pkg } = await repo.receivePackage(ctx2, { businessId: BIZ2, dtPublicationPackageId: dtPkg, intakeCode: uniqueCode('intake'), idempotencyKey: uniqueCode('idem') });
      const found = await repo.getById(ctx2, pkg.id);
      expect(found.dtPublicationPackageId).toBe(dtPkg);
    });

    it('transitions received -> accepted -> processing -> completed', async () => {
      const repo = new SimulationIntakeRepository();
      const dtPkg = await createDtPackage(ctx1, BIZ1);
      const { package: pkg } = await repo.receivePackage(ctx1, { businessId: BIZ1, dtPublicationPackageId: dtPkg, intakeCode: uniqueCode('intake'), idempotencyKey: uniqueCode('idem') });
      const accepted = await repo.acceptPackage(ctx1, pkg.id);
      expect(accepted.status).toBe('accepted');
      const processing = await repo.markProcessing(ctx1, pkg.id);
      expect(processing.status).toBe('processing');
      const completed = await repo.completePackage(ctx1, pkg.id);
      expect(completed.status).toBe('completed');
    });

    it('records a rejection reason when rejected', async () => {
      const repo = new SimulationIntakeRepository();
      const dtPkg = await createDtPackage(ctx1, BIZ1);
      const { package: pkg } = await repo.receivePackage(ctx1, { businessId: BIZ1, dtPublicationPackageId: dtPkg, intakeCode: uniqueCode('intake'), idempotencyKey: uniqueCode('idem') });
      const rejected = await repo.rejectPackage(ctx1, pkg.id, 'schema mismatch');
      expect(rejected.status).toBe('rejected');
      expect(rejected.rejectionReason).toBe('schema mismatch');
    });

    it('records a failure reason when failed', async () => {
      const repo = new SimulationIntakeRepository();
      const dtPkg = await createDtPackage(ctx1, BIZ1);
      const { package: pkg } = await repo.receivePackage(ctx1, { businessId: BIZ1, dtPublicationPackageId: dtPkg, intakeCode: uniqueCode('intake'), idempotencyKey: uniqueCode('idem') });
      const failed = await repo.failPackage(ctx1, pkg.id, 'downstream error');
      expect(failed.status).toBe('failed');
    });

    it('throws NotFoundError for an unknown intake package id', async () => {
      const repo = new SimulationIntakeRepository();
      await expect(repo.getById(ctx1, '00000000-0000-0000-0000-000000000000')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('finds an intake package by its source DT publication package', async () => {
      const repo = new SimulationIntakeRepository();
      const dtPkg = await createDtPackage(ctx1, BIZ1);
      const { package: pkg } = await repo.receivePackage(ctx1, { businessId: BIZ1, dtPublicationPackageId: dtPkg, intakeCode: uniqueCode('intake'), idempotencyKey: uniqueCode('idem') });
      const found = await repo.getBySourcePackage(ctx1, BIZ1, dtPkg);
      expect(found.id).toBe(pkg.id);
    });

    it('rejects cross-tenant intake package reads', async () => {
      const repo = new SimulationIntakeRepository();
      const dtPkg = await createDtPackage(ctx1, BIZ1);
      const { package: pkg } = await repo.receivePackage(ctx1, { businessId: BIZ1, dtPublicationPackageId: dtPkg, intakeCode: uniqueCode('intake'), idempotencyKey: uniqueCode('idem') });
      await expect(repo.getById(ctx2, pkg.id)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('rejects an unknown target status at the database CHECK constraint', async () => {
      const dtPkg = await createDtPackage(ctx1, BIZ1);
      const repo = new SimulationIntakeRepository();
      const { package: pkg } = await repo.receivePackage(ctx1, { businessId: BIZ1, dtPublicationPackageId: dtPkg, intakeCode: uniqueCode('intake'), idempotencyKey: uniqueCode('idem') });
      await expect(adminPool!.query(`UPDATE simulation.simulation_intake_packages SET status = 'not_a_real_status' WHERE id = $1`, [pkg.id])).rejects.toThrow();
    });

    it('simulation_intake_package_versions are append-only — UPDATE is rejected by the database', async () => {
      const repo = new SimulationIntakeRepository();
      const dtPkg = await createDtPackage(ctx1, BIZ1);
      const { package: pkg } = await repo.receivePackage(ctx1, { businessId: BIZ1, dtPublicationPackageId: dtPkg, intakeCode: uniqueCode('intake'), idempotencyKey: uniqueCode('idem') });
      const versionRow = await adminPool!.query(
        `INSERT INTO simulation.simulation_intake_package_versions (intake_package_id, tenant_id, workspace_id, business_id, version_number, correlation_id)
         VALUES ($1,$2,$3,$4,1,gen_random_uuid()) RETURNING id`,
        [pkg.id, T1, WS1, BIZ1]
      );
      await expect(adminPool!.query(`UPDATE simulation.simulation_intake_package_versions SET record_count = 999 WHERE id = $1`, [versionRow.rows[0].id])).rejects.toThrow(/append-only/);
    });
  });

  // ── 3. SimulationModelRepository ────────────────────────────────────────────
  describe('SimulationModelRepository', () => {
    it('creates a model in draft status', async () => {
      const repo = new SimulationModelRepository();
      const model = await repo.createModel(ctx1, BIZ1, uniqueCode('model'), 'Model A');
      expect(model.status).toBe('draft');
      expect(model.latestVersion).toBe(0);
    });

    it('creates a version and bumps latestVersion', async () => {
      const repo = new SimulationModelRepository();
      const model = await repo.createModel(ctx1, BIZ1, uniqueCode('model-v'), 'Model B');
      const version = await repo.createVersion(ctx1, model.id, BIZ1, 'infinicus-engine-v3', { runs: 500 });
      expect(version.versionNumber).toBe(1);
      expect(version.status).toBe('draft');
    });

    it('adds a parameter and a constraint to a model version', async () => {
      const repo = new SimulationModelRepository();
      const model = await repo.createModel(ctx1, BIZ1, uniqueCode('model-p'), 'Model C');
      const version = await repo.createVersion(ctx1, model.id, BIZ1, 'infinicus-engine-v3');
      await expect(repo.addParameter(ctx1, version.id, BIZ1, 'capital', 'number', 10000)).resolves.toBeUndefined();
      await expect(repo.addConstraint(ctx1, version.id, BIZ1, 'sample-size-bound', 'sample size must be >= 1')).resolves.toBeUndefined();
    });

    it('validates and activates a version', async () => {
      const repo = new SimulationModelRepository();
      const model = await repo.createModel(ctx1, BIZ1, uniqueCode('model-act'), 'Model D');
      const version = await repo.createVersion(ctx1, model.id, BIZ1, 'infinicus-engine-v3');
      await repo.validateVersion(ctx1, version.id);
      const activated = await repo.activateVersion(ctx1, version.id);
      expect(activated.status).toBe('active');
    });

    it('rejects activating a version that was never validated', async () => {
      const repo = new SimulationModelRepository();
      const model = await repo.createModel(ctx1, BIZ1, uniqueCode('model-noval'), 'Model E');
      const version = await repo.createVersion(ctx1, model.id, BIZ1, 'infinicus-engine-v3');
      await expect(repo.activateVersion(ctx1, version.id)).rejects.toBeInstanceOf(SimulationModelStateConflictError);
    });

    it('supersedes a version', async () => {
      const repo = new SimulationModelRepository();
      const model = await repo.createModel(ctx1, BIZ1, uniqueCode('model-sup'), 'Model F');
      const version = await repo.createVersion(ctx1, model.id, BIZ1, 'infinicus-engine-v3');
      const superseded = await repo.supersedeVersion(ctx1, version.id);
      expect(superseded.status).toBe('superseded');
    });

    it('gets the active version for a model', async () => {
      const repo = new SimulationModelRepository();
      const model = await repo.createModel(ctx1, BIZ1, uniqueCode('model-getact'), 'Model G');
      const version = await repo.createVersion(ctx1, model.id, BIZ1, 'infinicus-engine-v3');
      await repo.validateVersion(ctx1, version.id);
      await repo.activateVersion(ctx1, version.id);
      const active = await repo.getActiveVersion(ctx1, model.id);
      expect(active.id).toBe(version.id);
    });

    it('throws NotFoundError when no active version exists', async () => {
      const repo = new SimulationModelRepository();
      const model = await repo.createModel(ctx1, BIZ1, uniqueCode('model-noact'), 'Model H');
      await expect(repo.getActiveVersion(ctx1, model.id)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('rejects an active model version reverting to draft', async () => {
      const repo = new SimulationModelRepository();
      const model = await repo.createModel(ctx1, BIZ1, uniqueCode('model-revert'), 'Model I');
      const version = await repo.createVersion(ctx1, model.id, BIZ1, 'infinicus-engine-v3');
      await repo.validateVersion(ctx1, version.id);
      await repo.activateVersion(ctx1, version.id);
      await expect(adminPool!.query(`UPDATE simulation.simulation_model_versions SET status = 'draft' WHERE id = $1`, [version.id])).rejects.toThrow(/cannot revert to draft/);
    });
  });

  // ── 4. SimulationScenarioRepository ─────────────────────────────────────────
  describe('SimulationScenarioRepository', () => {
    it('creates a scenario referencing a model', async () => {
      const { scenario } = await makeModelAndScenario(ctx1, BIZ1);
      expect(scenario.status).toBe('draft');
    });

    it('creates a version and bumps latestVersion', async () => {
      const { scenarioRepo, scenario } = await makeModelAndScenario(ctx1, BIZ1);
      const version = await scenarioRepo.createVersion(ctx1, scenario.id, BIZ1);
      expect(version.versionNumber).toBe(2);
    });

    it('adds an input, assumption, and constraint to a scenario version', async () => {
      const { scenarioRepo, scenarioVersion } = await makeModelAndScenario(ctx1, BIZ1);
      await expect(scenarioRepo.addInput(ctx1, scenarioVersion.id, BIZ1, 'capital', 10000)).resolves.toBeUndefined();
      await expect(scenarioRepo.addAssumption(ctx1, scenarioVersion.id, BIZ1, 'asm-1', 'growth continues')).resolves.toBeUndefined();
      await expect(scenarioRepo.addConstraint(ctx1, scenarioVersion.id, BIZ1, 'cns-1', 'lte', 100000)).resolves.toBeUndefined();
    });

    it('rejects an unknown constraint operator', async () => {
      const { scenarioRepo, scenarioVersion } = await makeModelAndScenario(ctx1, BIZ1);
      await expect(scenarioRepo.addConstraint(ctx1, scenarioVersion.id, BIZ1, 'cns-bad', 'not_an_op', 1)).rejects.toBeInstanceOf(ValidationError);
    });

    it('validates and activates a scenario version', async () => {
      const { scenarioRepo, scenarioVersion } = await makeModelAndScenario(ctx1, BIZ1);
      await scenarioRepo.validateVersion(ctx1, scenarioVersion.id);
      const activated = await scenarioRepo.activateVersion(ctx1, scenarioVersion.id);
      expect(activated.status).toBe('active');
    });

    it('rejects activating a scenario version that was never validated', async () => {
      const { scenarioRepo, scenarioVersion } = await makeModelAndScenario(ctx1, BIZ1);
      await expect(scenarioRepo.activateVersion(ctx1, scenarioVersion.id)).rejects.toBeInstanceOf(SimulationScenarioStateConflictError);
    });

    it('gets the active version for a scenario', async () => {
      const { scenarioRepo, scenario, scenarioVersion } = await makeModelAndScenario(ctx1, BIZ1);
      await scenarioRepo.validateVersion(ctx1, scenarioVersion.id);
      await scenarioRepo.activateVersion(ctx1, scenarioVersion.id);
      const active = await scenarioRepo.getActiveVersion(ctx1, scenario.id);
      expect(active.id).toBe(scenarioVersion.id);
    });
  });

  // ── 5. SimulationRunRepository ──────────────────────────────────────────────
  describe('SimulationRunRepository', () => {
    it('creates a request idempotently', async () => {
      const { scenarioVersion } = await makeModelAndScenario(ctx1, BIZ1);
      const runRepo = new SimulationRunRepository();
      const key = uniqueCode('idem');
      const first = await runRepo.createRequest(ctx1, BIZ1, scenarioVersion.id, uniqueCode('req'), key);
      const second = await runRepo.createRequest(ctx1, BIZ1, scenarioVersion.id, uniqueCode('req'), key);
      expect(second.request.id).toBe(first.request.id);
      expect(second.idempotentReplay).toBe(true);
    });

    it('creates a run defaulting to Engine v3 semantics (500 samples, 90-day horizon)', async () => {
      const { run: run_ } = await makeRun(ctx1, BIZ1);
      expect(run_.sampleSize).toBe(500);
      expect(run_.horizonDays).toBe(90);
      expect(run_.status).toBe('queued');
    });

    it('records a run input', async () => {
      const { runRepo, run: run_ } = await makeRun(ctx1, BIZ1);
      await expect(runRepo.recordInput(ctx1, run_.id, BIZ1, 'capital', 10000)).resolves.toBeUndefined();
    });

    it('transitions queued -> running -> completed with engine metadata', async () => {
      const { runRepo, run: run_ } = await makeRun(ctx1, BIZ1);
      const running = await runRepo.transitionRun(ctx1, run_.id, 'running', { engineVersion: 'infinicus-engine-v3', randomSeed: null });
      expect(running.status).toBe('running');
      const completed = await runRepo.transitionRun(ctx1, run_.id, 'completed');
      expect(completed.status).toBe('completed');
    });

    it('rejects an invalid transition (queued -> completed, skipping running)', async () => {
      const { runRepo, run: run_ } = await makeRun(ctx1, BIZ1);
      await expect(runRepo.transitionRun(ctx1, run_.id, 'completed')).rejects.toBeInstanceOf(InvalidTransitionError);
    });

    it('records a failure code and message on a failed run', async () => {
      const { runRepo, run: run_ } = await makeRun(ctx1, BIZ1);
      await runRepo.transitionRun(ctx1, run_.id, 'running');
      const failed = await runRepo.transitionRun(ctx1, run_.id, 'failed', { failureCode: 'SIM_TIMEOUT', failureMessage: 'timed out' });
      expect(failed.failureCode).toBe('SIM_TIMEOUT');
      expect(failed.failureMessage).toBe('timed out');
    });

    it('records Monte Carlo iterations, summaries, distributions, and percentiles', async () => {
      const { runRepo, run: run_ } = await makeRun(ctx1, BIZ1);
      await runRepo.recordIteration(ctx1, run_.id, BIZ1, 1, 1200.5);
      await runRepo.recordIteration(ctx1, run_.id, BIZ1, 2, 980.25);
      await runRepo.recordIterationSummary(ctx1, run_.id, BIZ1, 'final_cash', { sampleSize: 500, meanValue: 1100 });
      await runRepo.recordDistribution(ctx1, run_.id, BIZ1, 'final_cash', 'normal', { mean: 1100, sd: 200 });
      await expect(
        runRepo.recordPercentiles(ctx1, run_.id, BIZ1, 'final_cash', { p10: -500, p25: 100, p50: 900, p75: 2100, p90: 4000, currencyCode: 'USD' })
      ).resolves.toBeUndefined();
    });

    it('rejects a duplicate iteration number for the same metric', async () => {
      const { runRepo, run: run_ } = await makeRun(ctx1, BIZ1);
      await runRepo.recordIteration(ctx1, run_.id, BIZ1, 1, 100);
      await expect(runRepo.recordIteration(ctx1, run_.id, BIZ1, 1, 200)).rejects.toThrow();
    });

    it('rejects an invalid (non-positive) iteration number', async () => {
      const { runRepo, run: run_ } = await makeRun(ctx1, BIZ1);
      await expect(runRepo.recordIteration(ctx1, run_.id, BIZ1, 0, 100)).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws NotFoundError for an unknown run', async () => {
      const runRepo = new SimulationRunRepository();
      await expect(runRepo.getRun(ctx1, '00000000-0000-0000-0000-000000000000')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('lists runs by request', async () => {
      const { scenarioVersion } = await makeModelAndScenario(ctx1, BIZ1);
      const { modelVersion } = await makeModelAndScenario(ctx1, BIZ1);
      const runRepo = new SimulationRunRepository();
      const { request } = await runRepo.createRequest(ctx1, BIZ1, scenarioVersion.id, uniqueCode('req'), uniqueCode('idem'));
      await runRepo.createRun(ctx1, BIZ1, request.id, modelVersion.id, uniqueCode('run'));
      await runRepo.createRun(ctx1, BIZ1, request.id, modelVersion.id, uniqueCode('run'));
      const runs = await runRepo.listRunsByRequest(ctx1, request.id);
      expect(runs.length).toBe(2);
    });

    it('simulation_iterations are append-only — UPDATE is rejected by the database', async () => {
      const { runRepo, run: run_ } = await makeRun(ctx1, BIZ1);
      await runRepo.recordIteration(ctx1, run_.id, BIZ1, 1, 100);
      const row = await adminPool!.query(`SELECT id FROM simulation.simulation_iterations WHERE run_id = $1 LIMIT 1`, [run_.id]);
      await expect(adminPool!.query(`UPDATE simulation.simulation_iterations SET outcome_value = 999 WHERE id = $1`, [row.rows[0].id])).rejects.toThrow(/append-only/);
    });

    it('simulation_percentiles are append-only — UPDATE is rejected by the database', async () => {
      const { runRepo, run: run_ } = await makeRun(ctx1, BIZ1);
      await runRepo.recordPercentiles(ctx1, run_.id, BIZ1, 'final_cash', { p10: -500, p25: 100, p50: 900, p75: 2100, p90: 4000 });
      const row = await adminPool!.query(`SELECT id FROM simulation.simulation_percentiles WHERE run_id = $1 LIMIT 1`, [run_.id]);
      await expect(adminPool!.query(`UPDATE simulation.simulation_percentiles SET p50 = 0 WHERE id = $1`, [row.rows[0].id])).rejects.toThrow(/append-only/);
    });
  });

  // ── 6. SimulationResultRepository ───────────────────────────────────────────
  describe('SimulationResultRepository', () => {
    async function makeResult() {
      const { run: run_ } = await makeRun(ctx1, BIZ1);
      const repo = new SimulationResultRepository();
      const { result, version } = await repo.createResult(ctx1, BIZ1, run_.id, uniqueCode('result'), 'Result summary');
      return { repo, run: run_, result, version };
    }

    it('creates a result header and v1 together', async () => {
      const { result, version } = await makeResult();
      expect(result.status).toBe('draft');
      expect(result.latestVersion).toBe(1);
      expect(version.versionNumber).toBe(1);
    });

    it('adds a metric and evidence to a result version', async () => {
      const { repo, version } = await makeResult();
      await expect(repo.addMetric(ctx1, version.id, 'survival_rate', 0.82, 'ratio')).resolves.toBeUndefined();
      await expect(repo.addEvidence(ctx1, version.id, 'percentile_reference', { metricCode: 'final_cash' })).resolves.toBeUndefined();
    });

    it('validates and publishes a result', async () => {
      const { repo, result, version } = await makeResult();
      await repo.validateResult(ctx1, result.id, version.id);
      const published = await repo.publishResult(ctx1, result.id, version.id);
      expect(published.status).toBe('published');
    });

    it('rejects publishing a non-validated result', async () => {
      const { repo, result, version } = await makeResult();
      await expect(repo.publishResult(ctx1, result.id, version.id)).rejects.toBeInstanceOf(SimulationResultStateConflictError);
    });

    it('rejects re-validating a published result', async () => {
      const { repo, result, version } = await makeResult();
      await repo.validateResult(ctx1, result.id, version.id);
      await repo.publishResult(ctx1, result.id, version.id);
      await expect(repo.validateResult(ctx1, result.id, version.id)).rejects.toBeInstanceOf(SimulationResultImmutableError);
    });

    it('supersedes a result before publication', async () => {
      const { repo, result } = await makeResult();
      const superseded = await repo.supersedeResult(ctx1, result.id);
      expect(superseded.status).toBe('superseded');
    });

    it('rejects superseding a published result — immutability', async () => {
      const { repo, result, version } = await makeResult();
      await repo.validateResult(ctx1, result.id, version.id);
      await repo.publishResult(ctx1, result.id, version.id);
      await expect(repo.supersedeResult(ctx1, result.id)).rejects.toBeInstanceOf(SimulationResultImmutableError);
    });

    it('a published result is immutable — direct UPDATE of status is rejected', async () => {
      const { repo, result, version } = await makeResult();
      await repo.validateResult(ctx1, result.id, version.id);
      await repo.publishResult(ctx1, result.id, version.id);
      await expect(adminPool!.query(`UPDATE simulation.simulation_results SET status = 'superseded' WHERE id = $1`, [result.id])).rejects.toThrow(/immutable/);
    });

    it('finds a result by id', async () => {
      const { repo, result } = await makeResult();
      const found = await repo.getById(ctx1, result.id);
      expect(found.id).toBe(result.id);
    });

    it('throws NotFoundError for an unknown result id', async () => {
      const repo = new SimulationResultRepository();
      await expect(repo.getById(ctx1, '00000000-0000-0000-0000-000000000000')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('lists published results for a run', async () => {
      const { repo, run: run_, result, version } = await makeResult();
      await repo.validateResult(ctx1, result.id, version.id);
      await repo.publishResult(ctx1, result.id, version.id);
      const list = await repo.getPublishedForRun(ctx1, run_.id);
      expect(list.some((r) => r.id === result.id)).toBe(true);
    });

    it('simulation_result_versions reject a status change once published', async () => {
      const { repo, result, version } = await makeResult();
      await repo.validateResult(ctx1, result.id, version.id);
      await repo.publishResult(ctx1, result.id, version.id);
      await expect(adminPool!.query(`UPDATE simulation.simulation_result_versions SET status = 'superseded' WHERE id = $1`, [version.id])).rejects.toThrow(/immutable/);
    });
  });

  // ── 7. SimulationRiskRepository ─────────────────────────────────────────────
  describe('SimulationRiskRepository', () => {
    it('records a risk result within bounds', async () => {
      const { run: run_ } = await makeRun(ctx1, BIZ1);
      const repo = new SimulationRiskRepository();
      const risk = await repo.recordRiskResult(ctx1, BIZ1, run_.id, 0.82, -500.25);
      expect(risk.survivalRate).toBeCloseTo(0.82, 2);
    });

    it('rejects a survival_rate outside [0,1]', async () => {
      const { run: run_ } = await makeRun(ctx1, BIZ1);
      const repo = new SimulationRiskRepository();
      await expect(repo.recordRiskResult(ctx1, BIZ1, run_.id, 1.5, -500)).rejects.toBeInstanceOf(ValidationError);
    });

    it('creates a failure mode', async () => {
      const { run: run_ } = await makeRun(ctx1, BIZ1);
      const repo = new SimulationRiskRepository();
      const mode = await repo.createFailureMode(ctx1, BIZ1, run_.id, 'FM-CASH-OUT', 'Cash reserves depleted before horizon end', 0.12);
      expect(mode.failureCode).toBe('FM-CASH-OUT');
    });

    it('rejects a likelihood outside [0,1]', async () => {
      const { run: run_ } = await makeRun(ctx1, BIZ1);
      const repo = new SimulationRiskRepository();
      await expect(repo.createFailureMode(ctx1, BIZ1, run_.id, 'FM-BAD', 'x', 1.2)).rejects.toBeInstanceOf(ValidationError);
    });

    it('lists risk results and failure modes for a run', async () => {
      const { run: run_ } = await makeRun(ctx1, BIZ1);
      const repo = new SimulationRiskRepository();
      await repo.recordRiskResult(ctx1, BIZ1, run_.id, 0.9, -100);
      await repo.createFailureMode(ctx1, BIZ1, run_.id, 'FM-X', 'x');
      const list = await repo.listForRun(ctx1, run_.id);
      expect(list.risks.length).toBeGreaterThanOrEqual(1);
      expect(list.failureModes.length).toBeGreaterThanOrEqual(1);
    });

    it('simulation_risk_results are append-only — UPDATE is rejected by the database', async () => {
      const { run: run_ } = await makeRun(ctx1, BIZ1);
      const repo = new SimulationRiskRepository();
      const risk = await repo.recordRiskResult(ctx1, BIZ1, run_.id, 0.5, -100);
      await expect(adminPool!.query(`UPDATE simulation.simulation_risk_results SET survival_rate = 0.99 WHERE id = $1`, [risk.id])).rejects.toThrow(/append-only/);
    });
  });

  // ── 8. SimulationSensitivityRepository ──────────────────────────────────────
  describe('SimulationSensitivityRepository', () => {
    it('creates a sensitivity run in requested status', async () => {
      const { scenarioVersion } = await makeModelAndScenario(ctx1, BIZ1);
      const repo = new SimulationSensitivityRepository();
      const run_ = await repo.createRun(ctx1, BIZ1, scenarioVersion.id);
      expect(run_.status).toBe('requested');
    });

    it('starts a requested run', async () => {
      const { scenarioVersion } = await makeModelAndScenario(ctx1, BIZ1);
      const repo = new SimulationSensitivityRepository();
      const run_ = await repo.createRun(ctx1, BIZ1, scenarioVersion.id);
      const started = await repo.startRun(ctx1, run_.id);
      expect(started.status).toBe('running');
    });

    it('rejects starting a run that is not requested', async () => {
      const { scenarioVersion } = await makeModelAndScenario(ctx1, BIZ1);
      const repo = new SimulationSensitivityRepository();
      const run_ = await repo.createRun(ctx1, BIZ1, scenarioVersion.id);
      await repo.startRun(ctx1, run_.id);
      await expect(repo.startRun(ctx1, run_.id)).rejects.toBeInstanceOf(SimulationSensitivityStateConflictError);
    });

    it('records a result and completes a running run', async () => {
      const { scenarioVersion } = await makeModelAndScenario(ctx1, BIZ1);
      const repo = new SimulationSensitivityRepository();
      const run_ = await repo.createRun(ctx1, BIZ1, scenarioVersion.id);
      await repo.startRun(ctx1, run_.id);
      await repo.recordResult(ctx1, run_.id, BIZ1, 'capital', 'final_cash', 125.5);
      const completed = await repo.completeRun(ctx1, run_.id);
      expect(completed.status).toBe('completed');
    });

    it('rejects completing a run that is not running', async () => {
      const { scenarioVersion } = await makeModelAndScenario(ctx1, BIZ1);
      const repo = new SimulationSensitivityRepository();
      const run_ = await repo.createRun(ctx1, BIZ1, scenarioVersion.id);
      await expect(repo.completeRun(ctx1, run_.id)).rejects.toBeInstanceOf(SimulationSensitivityStateConflictError);
    });

    it('fails a run', async () => {
      const { scenarioVersion } = await makeModelAndScenario(ctx1, BIZ1);
      const repo = new SimulationSensitivityRepository();
      const run_ = await repo.createRun(ctx1, BIZ1, scenarioVersion.id);
      const failed = await repo.failRun(ctx1, run_.id);
      expect(failed.status).toBe('failed');
    });

    it('lists results for a sensitivity run', async () => {
      const { scenarioVersion } = await makeModelAndScenario(ctx1, BIZ1);
      const repo = new SimulationSensitivityRepository();
      const run_ = await repo.createRun(ctx1, BIZ1, scenarioVersion.id);
      await repo.recordResult(ctx1, run_.id, BIZ1, 'capital', 'final_cash', 100);
      const results = await repo.listResults(ctx1, run_.id);
      expect(results.length).toBe(1);
    });

    it('simulation_sensitivity_results are append-only — UPDATE is rejected by the database', async () => {
      const { scenarioVersion } = await makeModelAndScenario(ctx1, BIZ1);
      const repo = new SimulationSensitivityRepository();
      const run_ = await repo.createRun(ctx1, BIZ1, scenarioVersion.id);
      const r = await repo.recordResult(ctx1, run_.id, BIZ1, 'capital', 'final_cash', 100);
      await expect(adminPool!.query(`UPDATE simulation.simulation_sensitivity_results SET delta = 999 WHERE id = $1`, [r.id])).rejects.toThrow(/append-only/);
    });
  });

  // ── 9. ScenarioComparisonRepository ─────────────────────────────────────────
  describe('ScenarioComparisonRepository', () => {
    it('creates a comparison run in requested status', async () => {
      const repo = new ScenarioComparisonRepository();
      const comparison = await repo.createRun(ctx1, BIZ1, uniqueCode('cmp'), 'compare aggressive vs conservative');
      expect(comparison.status).toBe('requested');
    });

    it('adds member runs', async () => {
      const { run: run_ } = await makeRun(ctx1, BIZ1);
      const repo = new ScenarioComparisonRepository();
      const comparison = await repo.createRun(ctx1, BIZ1, uniqueCode('cmp'), 'x');
      await expect(repo.addMember(ctx1, comparison.id, BIZ1, run_.id, 'aggressive')).resolves.toBeUndefined();
      const members = await repo.listMembers(ctx1, comparison.id);
      expect(members.length).toBe(1);
    });

    it('transitions requested -> running -> completed', async () => {
      const repo = new ScenarioComparisonRepository();
      const comparison = await repo.createRun(ctx1, BIZ1, uniqueCode('cmp'), 'x');
      const running = await repo.transitionRun(ctx1, comparison.id, 'running');
      expect(running.status).toBe('running');
      const completed = await repo.transitionRun(ctx1, comparison.id, 'completed');
      expect(completed.status).toBe('completed');
    });

    it('rejects an invalid transition', async () => {
      const repo = new ScenarioComparisonRepository();
      const comparison = await repo.createRun(ctx1, BIZ1, uniqueCode('cmp'), 'x');
      await expect(repo.transitionRun(ctx1, comparison.id, 'completed')).rejects.toBeInstanceOf(InvalidTransitionError);
    });

    it('records a comparison result', async () => {
      const repo = new ScenarioComparisonRepository();
      const comparison = await repo.createRun(ctx1, BIZ1, uniqueCode('cmp'), 'x');
      await expect(repo.recordResult(ctx1, comparison.id, BIZ1, 'final_cash_delta', { delta: 200 })).resolves.toBeUndefined();
    });

    it('throws NotFoundError for an unknown comparison run', async () => {
      const repo = new ScenarioComparisonRepository();
      await expect(repo.getRun(ctx1, '00000000-0000-0000-0000-000000000000')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('scenario_comparison_results are append-only — UPDATE is rejected by the database', async () => {
      const repo = new ScenarioComparisonRepository();
      const comparison = await repo.createRun(ctx1, BIZ1, uniqueCode('cmp'), 'x');
      await repo.recordResult(ctx1, comparison.id, BIZ1, 'final_cash_delta', { delta: 200 });
      const row = await adminPool!.query(`SELECT id FROM simulation.scenario_comparison_results WHERE comparison_run_id = $1 LIMIT 1`, [comparison.id]);
      await expect(adminPool!.query(`UPDATE simulation.scenario_comparison_results SET result_json = '{}'::jsonb WHERE id = $1`, [row.rows[0].id])).rejects.toThrow(/append-only/);
    });
  });

  // ── 10. SimulationValidationRepository (validation + calibration) ──────────
  describe('SimulationValidationRepository', () => {
    it('creates a validation run in running status', async () => {
      const { modelVersion } = await makeModelAndScenario(ctx1, BIZ1);
      const repo = new SimulationValidationRepository();
      const run_ = await repo.createRun(ctx1, BIZ1, modelVersion.id);
      expect(run_.status).toBe('running');
    });

    it('records a result with a valid outcome', async () => {
      const { modelVersion } = await makeModelAndScenario(ctx1, BIZ1);
      const repo = new SimulationValidationRepository();
      const run_ = await repo.createRun(ctx1, BIZ1, modelVersion.id);
      await expect(repo.recordResult(ctx1, run_.id, BIZ1, 'passed', 'all checks passed')).resolves.toBeUndefined();
    });

    it('rejects an unknown outcome when recording a result', async () => {
      const { modelVersion } = await makeModelAndScenario(ctx1, BIZ1);
      const repo = new SimulationValidationRepository();
      const run_ = await repo.createRun(ctx1, BIZ1, modelVersion.id);
      await expect(repo.recordResult(ctx1, run_.id, BIZ1, 'not_an_outcome', 'x')).rejects.toBeInstanceOf(ValidationError);
    });

    it('completes a running validation run', async () => {
      const { modelVersion } = await makeModelAndScenario(ctx1, BIZ1);
      const repo = new SimulationValidationRepository();
      const run_ = await repo.createRun(ctx1, BIZ1, modelVersion.id);
      const completed = await repo.completeRun(ctx1, run_.id, 'passed');
      expect(completed.status).toBe('completed');
    });

    it('rejects completing a validation run that is not running', async () => {
      const { modelVersion } = await makeModelAndScenario(ctx1, BIZ1);
      const repo = new SimulationValidationRepository();
      const run_ = await repo.createRun(ctx1, BIZ1, modelVersion.id);
      await repo.completeRun(ctx1, run_.id, 'passed');
      await expect(repo.completeRun(ctx1, run_.id, 'passed')).rejects.toBeInstanceOf(SimulationValidationStateConflictError);
    });

    it('creates a calibration run in requested status', async () => {
      const { modelVersion } = await makeModelAndScenario(ctx1, BIZ1);
      const repo = new SimulationValidationRepository();
      const run_ = await repo.createCalibrationRun(ctx1, BIZ1, modelVersion.id, UID);
      expect(run_.status).toBe('requested');
    });

    it('starts and completes a calibration run with results', async () => {
      const { modelVersion } = await makeModelAndScenario(ctx1, BIZ1);
      const repo = new SimulationValidationRepository();
      const run_ = await repo.createCalibrationRun(ctx1, BIZ1, modelVersion.id);
      await repo.startCalibrationRun(ctx1, run_.id);
      const completed = await repo.completeCalibrationRun(ctx1, run_.id, BIZ1, [{ parameterCode: 'capital', adjustedValue: 12000, delta: 2000 }]);
      expect(completed.status).toBe('completed');
    });

    it('rejects starting a calibration run that is not requested', async () => {
      const { modelVersion } = await makeModelAndScenario(ctx1, BIZ1);
      const repo = new SimulationValidationRepository();
      const run_ = await repo.createCalibrationRun(ctx1, BIZ1, modelVersion.id);
      await repo.startCalibrationRun(ctx1, run_.id);
      await expect(repo.startCalibrationRun(ctx1, run_.id)).rejects.toBeInstanceOf(SimulationCalibrationStateConflictError);
    });

    it('throws NotFoundError for an unknown calibration run', async () => {
      const repo = new SimulationValidationRepository();
      await expect(repo.getCalibrationRun(ctx1, '00000000-0000-0000-0000-000000000000')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('simulation_calibration_results are append-only — UPDATE is rejected by the database', async () => {
      const { modelVersion } = await makeModelAndScenario(ctx1, BIZ1);
      const repo = new SimulationValidationRepository();
      const run_ = await repo.createCalibrationRun(ctx1, BIZ1, modelVersion.id);
      await repo.startCalibrationRun(ctx1, run_.id);
      await repo.completeCalibrationRun(ctx1, run_.id, BIZ1, [{ parameterCode: 'capital', adjustedValue: 1 }]);
      const row = await adminPool!.query(`SELECT id FROM simulation.simulation_calibration_results WHERE calibration_run_id = $1 LIMIT 1`, [run_.id]);
      await expect(adminPool!.query(`UPDATE simulation.simulation_calibration_results SET delta = 999 WHERE id = $1`, [row.rows[0].id])).rejects.toThrow(/append-only/);
    });
  });

  // ── 11. SimulationPublicationRepository ─────────────────────────────────────
  describe('SimulationPublicationRepository', () => {
    async function makeInsightVersion() {
      const repo = new SimulationPublicationRepository();
      const insight = await repo.createInsightPackage(ctx1, BIZ1, uniqueCode('sim-insight'));
      const version = await repo.createVersion(ctx1, insight.id, BIZ1, 'Sim insight summary');
      return { repo, insight, version };
    }

    it('creates an insight package header', async () => {
      const repo = new SimulationPublicationRepository();
      const insight = await repo.createInsightPackage(ctx1, BIZ1, uniqueCode('sim-insight-h'));
      expect(insight.status).toBe('draft');
      expect(insight.latestVersion).toBe(0);
    });

    it('creates an insight package version and bumps latestVersion', async () => {
      const { version } = await makeInsightVersion();
      expect(version.versionNumber).toBe(1);
    });

    it('creates a publication package targeting ai_decision_intelligence', async () => {
      const { repo, version } = await makeInsightVersion();
      const { package: pkg, idempotentReplay } = await repo.createPackage(ctx1, BIZ1, version.id, 'ai_decision_intelligence', 'ADI-06', uniqueCode('idem'));
      expect(pkg.targetLayer).toBe('ai_decision_intelligence');
      expect(pkg.publicationStatus).toBe('draft');
      expect(idempotentReplay).toBe(false);
    });

    it('rejects an invalid target layer', async () => {
      const { repo, version } = await makeInsightVersion();
      await expect(repo.createPackage(ctx1, BIZ1, version.id, 'business_digital_twin', 'DT-01', uniqueCode('idem'))).rejects.toBeInstanceOf(ValidationError);
    });

    it('is idempotent on replayed delivery with the same key', async () => {
      const { repo, version } = await makeInsightVersion();
      const key = uniqueCode('idem');
      const first = await repo.createPackage(ctx1, BIZ1, version.id, 'ai_decision_intelligence', 'ADI-06', key);
      const second = await repo.createPackage(ctx1, BIZ1, version.id, 'ai_decision_intelligence', 'ADI-06', key);
      expect(second.package.id).toBe(first.package.id);
      expect(second.idempotentReplay).toBe(true);
    });

    it('walks the full lifecycle: draft -> ready -> dispatched -> acknowledged', async () => {
      const { repo, version } = await makeInsightVersion();
      const { package: pkg } = await repo.createPackage(ctx1, BIZ1, version.id, 'ai_decision_intelligence', 'ADI-06', uniqueCode('idem'));
      const ready = await repo.markReady(ctx1, pkg.id);
      expect(ready.publicationStatus).toBe('ready');
      const dispatched = await repo.dispatch(ctx1, pkg.id);
      expect(dispatched.publicationStatus).toBe('dispatched');
      const acknowledged = await repo.acknowledge(ctx1, pkg.id);
      expect(acknowledged.publicationStatus).toBe('acknowledged');
    });

    it('rejects a forbidden lifecycle transition (draft straight to dispatched)', async () => {
      const { repo, version } = await makeInsightVersion();
      const { package: pkg } = await repo.createPackage(ctx1, BIZ1, version.id, 'ai_decision_intelligence', 'ADI-06', uniqueCode('idem'));
      await expect(repo.dispatch(ctx1, pkg.id)).rejects.toBeInstanceOf(InvalidTransitionError);
    });

    it('rejects a forbidden lifecycle transition at the database level', async () => {
      const { repo, version } = await makeInsightVersion();
      const { package: pkg } = await repo.createPackage(ctx1, BIZ1, version.id, 'ai_decision_intelligence', 'ADI-06', uniqueCode('idem'));
      await expect(adminPool!.query(`UPDATE simulation.simulation_publication_packages SET publication_status = 'acknowledged' WHERE id = $1`, [pkg.id])).rejects.toThrow(/forbidden transition/);
    });

    it('records a rejection with a reason', async () => {
      const { repo, version } = await makeInsightVersion();
      const { package: pkg } = await repo.createPackage(ctx1, BIZ1, version.id, 'ai_decision_intelligence', 'ADI-06', uniqueCode('idem'));
      await repo.markReady(ctx1, pkg.id);
      await repo.dispatch(ctx1, pkg.id);
      const rejected = await repo.reject(ctx1, pkg.id, 'schema mismatch');
      expect(rejected.publicationStatus).toBe('rejected');
    });

    it('revokes an acknowledged package', async () => {
      const { repo, version } = await makeInsightVersion();
      const { package: pkg } = await repo.createPackage(ctx1, BIZ1, version.id, 'ai_decision_intelligence', 'ADI-06', uniqueCode('idem'));
      await repo.markReady(ctx1, pkg.id);
      await repo.dispatch(ctx1, pkg.id);
      await repo.acknowledge(ctx1, pkg.id);
      const revoked = await repo.revoke(ctx1, pkg.id);
      expect(revoked.publicationStatus).toBe('revoked');
    });

    it('finds a publication package by id', async () => {
      const { repo, version } = await makeInsightVersion();
      const { package: pkg } = await repo.createPackage(ctx1, BIZ1, version.id, 'ai_decision_intelligence', 'ADI-06', uniqueCode('idem'));
      const found = await repo.getById(ctx1, pkg.id);
      expect(found.id).toBe(pkg.id);
    });

    it('simulation_publication_events are append-only — UPDATE is rejected by the database', async () => {
      const { repo, version } = await makeInsightVersion();
      const { package: pkg } = await repo.createPackage(ctx1, BIZ1, version.id, 'ai_decision_intelligence', 'ADI-06', uniqueCode('idem'));
      await repo.markReady(ctx1, pkg.id);
      const events = await adminPool!.query(`SELECT id FROM simulation.simulation_publication_events WHERE simulation_publication_package_id = $1 LIMIT 1`, [pkg.id]);
      await expect(adminPool!.query(`UPDATE simulation.simulation_publication_events SET detail = '{}'::jsonb WHERE id = $1`, [events.rows[0].id])).rejects.toThrow(/append-only/);
    });

    it('simulation_insight_package_versions are append-only — UPDATE is rejected by the database', async () => {
      const { version } = await makeInsightVersion();
      await expect(adminPool!.query(`UPDATE simulation.simulation_insight_package_versions SET summary = 'changed' WHERE id = $1`, [version.id])).rejects.toThrow(/append-only/);
    });
  });

  // ── 12. SimulationComponentRegistryRepository ───────────────────────────────
  describe('SimulationComponentRegistryRepository', () => {
    it('registers a component in draft status', async () => {
      const repo = new SimulationComponentRegistryRepository();
      const component = await repo.registerComponent(ctx1, BIZ1, uniqueCode('comp'), 'monte_carlo_engine');
      expect(component.status).toBe('draft');
    });

    it('registers a component version and bumps latestVersion', async () => {
      const repo = new SimulationComponentRegistryRepository();
      const component = await repo.registerComponent(ctx1, BIZ1, uniqueCode('comp-v'), 'monte_carlo_engine');
      const version = await repo.createVersion(ctx1, component.id, BIZ1, { api: 'v1' });
      expect(version.versionNumber).toBe(1);
    });

    it('activates a component', async () => {
      const repo = new SimulationComponentRegistryRepository();
      const component = await repo.registerComponent(ctx1, BIZ1, uniqueCode('comp-act'), 'monte_carlo_engine');
      const activated = await repo.activateVersion(ctx1, component.id, component.id);
      expect(activated.status).toBe('active');
    });

    it('records a deployment and activates it', async () => {
      const repo = new SimulationComponentRegistryRepository();
      const component = await repo.registerComponent(ctx1, BIZ1, uniqueCode('comp-dep'), 'monte_carlo_engine');
      const version = await repo.createVersion(ctx1, component.id, BIZ1, {});
      const deployment = await repo.recordDeployment(ctx1, BIZ1, version.id);
      expect(deployment.activationState).toBe('active');
    });

    it('records a rollback', async () => {
      const repo = new SimulationComponentRegistryRepository();
      const component = await repo.registerComponent(ctx1, BIZ1, uniqueCode('comp-rb'), 'monte_carlo_engine');
      const version = await repo.createVersion(ctx1, component.id, BIZ1, {});
      const deployment = await repo.recordDeployment(ctx1, BIZ1, version.id);
      await repo.recordRollback(ctx1, BIZ1, deployment.id, 'regression detected');
      const row = await adminPool!.query(`SELECT activation_state FROM simulation.simulation_deployments WHERE id = $1`, [deployment.id]);
      expect(row.rows[0].activation_state).toBe('rolled_back');
    });

    it('gets the active version for a component', async () => {
      const repo = new SimulationComponentRegistryRepository();
      const component = await repo.registerComponent(ctx1, BIZ1, uniqueCode('comp-getact'), 'monte_carlo_engine');
      const version = await repo.createVersion(ctx1, component.id, BIZ1, {});
      await repo.activateVersion(ctx1, component.id, version.id);
      const active = await repo.getActiveVersion(ctx1, component.id);
      expect(active.id).toBe(version.id);
    });

    it('throws NotFoundError for an unknown component', async () => {
      const repo = new SimulationComponentRegistryRepository();
      await expect(repo.createVersion(ctx1, '00000000-0000-0000-0000-000000000000', BIZ1, {})).rejects.toBeInstanceOf(NotFoundError);
    });

    it('simulation_component_registry_versions are append-only — UPDATE is rejected by the database', async () => {
      const repo = new SimulationComponentRegistryRepository();
      const component = await repo.registerComponent(ctx1, BIZ1, uniqueCode('comp-immut'), 'monte_carlo_engine');
      const version = await repo.createVersion(ctx1, component.id, BIZ1, {});
      await expect(adminPool!.query(`UPDATE simulation.simulation_component_registry_versions SET capabilities = '{}'::jsonb WHERE id = $1`, [version.id])).rejects.toThrow(/append-only/);
    });

    it('simulation_deployment_rollbacks are append-only — UPDATE is rejected by the database', async () => {
      const repo = new SimulationComponentRegistryRepository();
      const component = await repo.registerComponent(ctx1, BIZ1, uniqueCode('comp-rb-immut'), 'monte_carlo_engine');
      const version = await repo.createVersion(ctx1, component.id, BIZ1, {});
      const deployment = await repo.recordDeployment(ctx1, BIZ1, version.id);
      await repo.recordRollback(ctx1, BIZ1, deployment.id, 'x');
      const row = await adminPool!.query(`SELECT id FROM simulation.simulation_deployment_rollbacks WHERE simulation_deployment_id = $1`, [deployment.id]);
      await expect(adminPool!.query(`UPDATE simulation.simulation_deployment_rollbacks SET reason = 'y' WHERE id = $1`, [row.rows[0].id])).rejects.toThrow(/append-only/);
    });
  });

  // ── 13. Cross-tenant / cross-workspace RLS live rejection ────────────────────
  describe('cross-tenant isolation (live RLS)', () => {
    it('tenant 2 cannot read tenant 1 models', async () => {
      const repo = new SimulationModelRepository();
      const model = await repo.createModel(ctx1, BIZ1, uniqueCode('iso-model'), 'Iso');
      await expect(repo.createVersion(ctx2, model.id, BIZ1, 'infinicus-engine-v3')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('tenant 2 cannot read tenant 1 runs', async () => {
      const { runRepo, run: run_ } = await makeRun(ctx1, BIZ1);
      await expect(runRepo.getRun(ctx2, run_.id)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('tenant 2 sees zero rows listing tenant 1 sensitivity results', async () => {
      const { scenarioVersion } = await makeModelAndScenario(ctx1, BIZ1);
      const repo = new SimulationSensitivityRepository();
      const run_ = await repo.createRun(ctx1, BIZ1, scenarioVersion.id);
      await repo.recordResult(ctx1, run_.id, BIZ1, 'capital', 'final_cash', 100);
      const list = await repo.listResults(ctx2, run_.id);
      expect(list.length).toBe(0);
    });

    it('tenant 2 cannot acknowledge a tenant 1 publication package', async () => {
      const repo = new SimulationPublicationRepository();
      const insight = await repo.createInsightPackage(ctx1, BIZ1, uniqueCode('iso-insight'));
      const version = await repo.createVersion(ctx1, insight.id, BIZ1, 'S');
      const { package: pkg } = await repo.createPackage(ctx1, BIZ1, version.id, 'ai_decision_intelligence', 'ADI-06', uniqueCode('idem'));
      await expect(repo.markReady(ctx2, pkg.id)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('tenant 2 cannot read tenant 1 risk results', async () => {
      const { run: run_ } = await makeRun(ctx1, BIZ1);
      const repo = new SimulationRiskRepository();
      await repo.recordRiskResult(ctx1, BIZ1, run_.id, 0.9, -100);
      const list = await repo.listForRun(ctx2, run_.id);
      expect(list.risks.length).toBe(0);
    });
  });

  // ── 14. Outbox atomicity — all 10 required sim.* events ─────────────────────
  describe('outbox event functions', () => {
    async function countByType(eventType: string): Promise<number> {
      const result = await adminPool!.query(`SELECT count(*)::int AS n FROM events.outbox_events WHERE event_type = $1`, [eventType]);
      return result.rows[0].n as number;
    }

    it('emit_intake_received inserts a pending outbox event atomically', async () => {
      const before = await countByType('sim.intake.received');
      await adminPool!.query(`SELECT simulation.emit_intake_received($1,$2,gen_random_uuid(),gen_random_uuid())`, [T1, WS1]);
      expect(await countByType('sim.intake.received')).toBe(before + 1);
    });

    it('emit_scenario_created inserts a pending outbox event', async () => {
      const before = await countByType('sim.scenario.created');
      await adminPool!.query(`SELECT simulation.emit_scenario_created($1,$2,gen_random_uuid(),gen_random_uuid())`, [T1, WS1]);
      expect(await countByType('sim.scenario.created')).toBe(before + 1);
    });

    it('emit_run_requested inserts a pending outbox event', async () => {
      const before = await countByType('sim.run.requested');
      await adminPool!.query(`SELECT simulation.emit_run_requested($1,$2,gen_random_uuid(),gen_random_uuid())`, [T1, WS1]);
      expect(await countByType('sim.run.requested')).toBe(before + 1);
    });

    it('emit_run_started inserts a pending outbox event', async () => {
      const before = await countByType('sim.run.started');
      await adminPool!.query(`SELECT simulation.emit_run_started($1,$2,gen_random_uuid(),gen_random_uuid())`, [T1, WS1]);
      expect(await countByType('sim.run.started')).toBe(before + 1);
    });

    it('emit_run_completed inserts a pending outbox event', async () => {
      const before = await countByType('sim.run.completed');
      await adminPool!.query(`SELECT simulation.emit_run_completed($1,$2,gen_random_uuid(),gen_random_uuid())`, [T1, WS1]);
      expect(await countByType('sim.run.completed')).toBe(before + 1);
    });

    it('emit_run_failed records a failure code in the payload', async () => {
      const result = await adminPool!.query(`SELECT simulation.emit_run_failed($1,$2,gen_random_uuid(),'SIM_TIMEOUT',gen_random_uuid()) AS event_id`, [T1, WS1]);
      const event = await adminPool!.query(`SELECT payload FROM events.outbox_events WHERE id = $1`, [result.rows[0].event_id]);
      expect(event.rows[0].payload.failureCode).toBe('SIM_TIMEOUT');
    });

    it('emit_result_published inserts a pending outbox event', async () => {
      const before = await countByType('sim.result.published');
      await adminPool!.query(`SELECT simulation.emit_result_published($1,$2,gen_random_uuid(),gen_random_uuid())`, [T1, WS1]);
      expect(await countByType('sim.result.published')).toBe(before + 1);
    });

    it('emit_risk_calculated inserts a pending outbox event', async () => {
      const before = await countByType('sim.risk.calculated');
      await adminPool!.query(`SELECT simulation.emit_risk_calculated($1,$2,gen_random_uuid(),gen_random_uuid())`, [T1, WS1]);
      expect(await countByType('sim.risk.calculated')).toBe(before + 1);
    });

    it('emit_sensitivity_completed inserts a pending outbox event', async () => {
      const before = await countByType('sim.sensitivity.completed');
      await adminPool!.query(`SELECT simulation.emit_sensitivity_completed($1,$2,gen_random_uuid(),gen_random_uuid())`, [T1, WS1]);
      expect(await countByType('sim.sensitivity.completed')).toBe(before + 1);
    });

    it('emit_data_published rejects an invalid target layer', async () => {
      await expect(
        adminPool!.query(`SELECT simulation.emit_data_published($1,$2,gen_random_uuid(),'not_a_real_layer','X',gen_random_uuid())`, [T1, WS1])
      ).rejects.toThrow(/invalid target layer/);
    });

    it('emit_data_published accepts the authorized ai_decision_intelligence target layer', async () => {
      const result = await adminPool!.query(
        `SELECT simulation.emit_data_published($1,$2,gen_random_uuid(),'ai_decision_intelligence','ADI-06',gen_random_uuid()) AS event_id`,
        [T1, WS1]
      );
      expect(result.rows[0].event_id).toBeTruthy();
    });
  });

  // ── 15. Transaction rollback behaviour ────────────────────────────────────────
  describe('transaction rollback behaviour', () => {
    it('leaves no partial risk result when validation fails before the insert', async () => {
      const { run: run_ } = await makeRun(ctx1, BIZ1);
      const repo = new SimulationRiskRepository();
      await expect(repo.recordRiskResult(ctx1, BIZ1, run_.id, 5.0, -100)).rejects.toBeInstanceOf(ValidationError);
      const check = await adminPool!.query(`SELECT count(*)::int AS n FROM simulation.simulation_risk_results WHERE run_id = $1`, [run_.id]);
      expect(check.rows[0].n).toBe(0);
    });

    it('rolls back an out-of-band insert that violates a database-level bound (defense in depth)', async () => {
      const { run: run_ } = await makeRun(ctx1, BIZ1);
      await expect(
        adminPool!.query(
          `INSERT INTO simulation.simulation_risk_results (tenant_id, workspace_id, business_id, run_id, survival_rate, downside_p10, basis)
           VALUES ($1,$2,$3,$4,2.0,-100,'final_cash')`,
          [T1, WS1, BIZ1, run_.id]
        )
      ).rejects.toThrow();
      const check = await adminPool!.query(`SELECT count(*)::int AS n FROM simulation.simulation_risk_results WHERE run_id = $1`, [run_.id]);
      expect(check.rows[0].n).toBe(0);
    });

    it('rejects a duplicate intake idempotency key with a different DT package as an application-level replay, not a DB error', async () => {
      const repo = new SimulationIntakeRepository();
      const dtPkg1 = await createDtPackage(ctx1, BIZ1);
      const dtPkg2 = await createDtPackage(ctx1, BIZ1);
      const key = uniqueCode('idem-shared');
      const first = await repo.receivePackage(ctx1, { businessId: BIZ1, dtPublicationPackageId: dtPkg1, intakeCode: uniqueCode('intake'), idempotencyKey: key });
      const second = await repo.receivePackage(ctx1, { businessId: BIZ1, dtPublicationPackageId: dtPkg2, intakeCode: uniqueCode('intake'), idempotencyKey: key });
      expect(second.idempotentReplay).toBe(true);
      expect(second.package.id).toBe(first.package.id);
    });
  });
});

describe.skipIf(run)('Stage 2F Simulation — live PostgreSQL (skipped, no DATABASE_URL)', () => {
  it('skips live tests when DATABASE_URL is not set', () => {
    expect(run).toBe(false);
  });
});

