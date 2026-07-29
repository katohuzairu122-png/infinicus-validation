/**
 * Live round-trip integration tests for all Stage 2B DA repositories.
 * Requires: DATABASE_URL and ADMIN_DATABASE_URL environment variables.
 * Skip without env vars so the standard `pnpm test` (structural) stays green.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import {
  setupIntegration,
  teardownIntegration,
  ctx1,
  ctx2,
  T1,
  WS1,
  uniqueCode,
} from './helpers/integration.js';

import { DataSourceRepository, NotFoundError } from '../src/repositories/da/DataSourceRepository.js';
import { ConnectorRepository }              from '../src/repositories/da/ConnectorRepository.js';
import { CollectionRunRepository }          from '../src/repositories/da/CollectionRunRepository.js';
import { ValidationResultRepository }       from '../src/repositories/da/ValidationResultRepository.js';
import { DataQualityScoreRepository }       from '../src/repositories/da/DataQualityScoreRepository.js';
import { ProvenanceRepository }             from '../src/repositories/da/ProvenanceRepository.js';
import { PublicationPackageRepository }     from '../src/repositories/da/PublicationPackageRepository.js';

const RUN = !!process.env.DATABASE_URL;

describe.runIf(RUN)('Integration: DataSourceRepository', () => {
  const repo = new DataSourceRepository();
  let sourceId: string;
  const correlationId = '00000000-aaaa-bbbb-cccc-000000000001';

  beforeAll(setupIntegration);
  afterAll(teardownIntegration);

  it('creates a data source and returns mapped fields', async () => {
    const src = await repo.create(ctx1, {
      name:           'CRM Export',
      sourceCode:     uniqueCode('crm'),
      sourceType:     'api',
      sensitivityLevel: 'internal',
      correlationId,
    });
    sourceId = src.id;

    expect(src.id).toBeTruthy();
    expect(src.tenantId).toBe(T1);
    expect(src.workspaceId).toBe(WS1);
    expect(src.name).toBe('CRM Export');
    expect(src.sourceType).toBe('api');
    expect(src.sensitivityLevel).toBe('internal');
    expect(src.status).toBe('draft');
    expect(src.version).toBe(1);
    expect(src.correlationId).toBe(correlationId);
  });

  it('finds the created source by id', async () => {
    const found = await repo.findById(ctx1, sourceId);
    expect(found.id).toBe(sourceId);
    expect(found.name).toBe('CRM Export');
  });

  it('listActive returns empty when status is draft', async () => {
    const list = await repo.listActive(ctx1);
    const ids = list.map((s) => s.id);
    expect(ids).not.toContain(sourceId);
  });

  it('updateStatus transitions status and bumps version', async () => {
    const updated = await repo.updateStatus(ctx1, sourceId, 'active');
    expect(updated.status).toBe('active');
    expect(updated.version).toBe(2);
  });

  it('listActive returns source after it is activated', async () => {
    const list = await repo.listActive(ctx1);
    expect(list.map((s) => s.id)).toContain(sourceId);
  });

  it('softDelete marks deleted_at and status=retired', async () => {
    await repo.softDelete(ctx1, sourceId);
    const found = await repo.findById(ctx1, sourceId);
    expect(found.deletedAt).not.toBeNull();
    expect(found.status).toBe('retired');
  });

  it('listActive excludes soft-deleted source', async () => {
    const list = await repo.listActive(ctx1);
    expect(list.map((s) => s.id)).not.toContain(sourceId);
  });

  it('throws NotFoundError for unknown id', async () => {
    await expect(
      repo.findById(ctx1, '00000000-0000-0000-0000-deadbeef0001')
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('tenant isolation: ctx2 cannot see ctx1 source', async () => {
    await expect(
      repo.findById(ctx2, sourceId)
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('workspace isolation: wrong workspace cannot see source', async () => {
    const wrongCtx = { ...ctx1, workspaceId: '00000000-0000-0000-dead-beef00000001' };
    await expect(
      repo.findById(wrongCtx, sourceId)
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe.runIf(RUN)('Integration: ConnectorRepository', () => {
  const srcRepo  = new DataSourceRepository();
  const connRepo = new ConnectorRepository();
  let sourceId: string;
  let connectorId: string;

  beforeAll(setupIntegration);
  afterAll(teardownIntegration);

  it('creates connector linked to a data source', async () => {
    const src = await srcRepo.create(ctx1, {
      name: 'REST Source', sourceCode: uniqueCode('rest'), sourceType: 'api', sensitivityLevel: 'public',
    });
    sourceId = src.id;

    const conn = await connRepo.create(ctx1, {
      dataSourceId:   sourceId,
      name:           'REST Connector',
      connectorType:  'rest_api',
      connectorVersion: '2.0',
      correlationId:  '00000000-aaaa-0000-0000-000000000002',
    });
    connectorId = conn.id;

    expect(conn.id).toBeTruthy();
    expect(conn.dataSourceId).toBe(sourceId);
    expect(conn.connectorType).toBe('rest_api');
    expect(conn.connectorVersion).toBe('2.0');
    expect(conn.healthStatus).toBe('unknown');
  });

  it('findById returns the connector', async () => {
    const found = await connRepo.findById(ctx1, connectorId);
    expect(found.name).toBe('REST Connector');
  });

  it('listByDataSource returns connector', async () => {
    const list = await connRepo.listByDataSource(ctx1, sourceId);
    expect(list.map((c) => c.id)).toContain(connectorId);
  });

  it('updateHealth sets healthStatus and lastHealthCheckAt', async () => {
    const updated = await connRepo.updateHealth(ctx1, connectorId, 'healthy');
    expect(updated.healthStatus).toBe('healthy');
    expect(updated.lastHealthCheckAt).not.toBeNull();
    expect(updated.version).toBe(2);
  });

  it('throws NotFoundError for unknown connector', async () => {
    await expect(
      connRepo.findById(ctx1, '00000000-0000-0000-0000-deadbeef0002')
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('tenant isolation: ctx2 cannot see ctx1 connector', async () => {
    await expect(
      connRepo.findById(ctx2, connectorId)
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe.runIf(RUN)('Integration: CollectionRunRepository', () => {
  const srcRepo  = new DataSourceRepository();
  const runRepo  = new CollectionRunRepository();
  let sourceId: string;
  let runId: string;

  beforeAll(setupIntegration);
  afterAll(teardownIntegration);

  it('creates a collection run in planned state', async () => {
    const src = await srcRepo.create(ctx1, {
      name: 'API Src', sourceCode: uniqueCode('api-src'), sourceType: 'api', sensitivityLevel: 'internal',
    });
    sourceId = src.id;

    const run = await runRepo.create(ctx1, {
      dataSourceId:   sourceId,
      collectionType: 'api',
      correlationId:  '00000000-aaaa-0000-0000-000000000003',
    });
    runId = run.id;

    expect(run.state).toBe('planned');
    expect(run.dataSourceId).toBe(sourceId);
    expect(run.recordsReceived).toBe(0);
    expect(run.correlationId).toBe('00000000-aaaa-0000-0000-000000000003');
  });

  it('findById retrieves the run', async () => {
    const found = await runRepo.findById(ctx1, runId);
    expect(found.id).toBe(runId);
    expect(found.state).toBe('planned');
  });

  it('markStarted transitions to collecting', async () => {
    const updated = await runRepo.markStarted(ctx1, runId);
    expect(updated.state).toBe('collecting');
    expect(updated.startedAt).not.toBeNull();
  });

  it('markCompleted transitions to collected with counts', async () => {
    const completed = await runRepo.markCompleted(ctx1, runId, {
      recordsReceived: 1000,
      recordsAccepted: 980,
      recordsRejected: 20,
      bytesReceived:   512000,
    });
    expect(completed.state).toBe('collected');
    expect(completed.recordsReceived).toBe(1000);
    expect(completed.recordsAccepted).toBe(980);
    expect(completed.recordsRejected).toBe(20);
    expect(completed.completedAt).not.toBeNull();
  });

  it('can create a second run and markFailed', async () => {
    const run2 = await runRepo.create(ctx1, { dataSourceId: sourceId, collectionType: 'api' });
    const failed = await runRepo.markFailed(ctx1, run2.id, 'TIMEOUT', 'connection timed out');
    expect(failed.state).toBe('failed');
    expect(failed.errorCode).toBe('TIMEOUT');
    expect(failed.errorMessage).toBe('connection timed out');
  });

  it('throws NotFoundError for unknown run', async () => {
    await expect(
      runRepo.findById(ctx1, '00000000-0000-0000-0000-deadbeef0003')
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('tenant isolation: ctx2 cannot see ctx1 run', async () => {
    await expect(
      runRepo.findById(ctx2, runId)
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('correlation ID is preserved on the run', async () => {
    const found = await runRepo.findById(ctx1, runId);
    expect(found.correlationId).toBe('00000000-aaaa-0000-0000-000000000003');
  });
});

describe.runIf(RUN)('Integration: ValidationResultRepository', () => {
  const srcRepo = new DataSourceRepository();
  const runRepo = new CollectionRunRepository();
  const valRepo = new ValidationResultRepository();
  let runId: string;
  let resultId: string;

  beforeAll(setupIntegration);
  afterAll(teardownIntegration);

  it('creates a validation result with issues atomically', async () => {
    const src = await srcRepo.create(ctx1, {
      name: 'Val Src', sourceCode: uniqueCode('val-src'), sourceType: 'file', sensitivityLevel: 'internal',
    });
    const run = await runRepo.create(ctx1, { dataSourceId: src.id, collectionType: 'file' });
    runId = run.id;

    const { result, issues } = await valRepo.create(
      ctx1,
      {
        collectionRunId: runId,
        isValid:         false,
        errorCount:      2,
        warningCount:    1,
        correlationId:   '00000000-aaaa-0000-0000-000000000004',
      },
      [
        { ruleCode: 'REQUIRED_FIELD', severity: 'error',   issueType: 'missing_field', message: 'email missing' },
        { ruleCode: 'FORMAT_CHECK',   severity: 'error',   issueType: 'invalid_format', message: 'date format wrong' },
        { ruleCode: 'RANGE_CHECK',    severity: 'warning', issueType: 'out_of_range',   message: 'age > 150' },
      ]
    );

    resultId = result.id;
    expect(result.isValid).toBe(false);
    expect(result.errorCount).toBe(2);
    expect(result.warningCount).toBe(1);
    expect(issues).toHaveLength(3);
    expect(issues[0].ruleCode).toBe('REQUIRED_FIELD');
    expect(issues[0].resolutionStatus).toBe('open');
  });

  it('findById returns the result', async () => {
    const found = await valRepo.findById(ctx1, resultId);
    expect(found.collectionRunId).toBe(runId);
    expect(found.correlationId).toBe('00000000-aaaa-0000-0000-000000000004');
  });

  it('listByCollectionRun returns results for the run', async () => {
    const list = await valRepo.listByCollectionRun(ctx1, runId);
    expect(list.map((r) => r.id)).toContain(resultId);
  });

  it('listIssues returns all issues for result', async () => {
    const issues = await valRepo.listIssues(ctx1, resultId);
    expect(issues).toHaveLength(3);
    const codes = issues.map((i) => i.ruleCode);
    expect(codes).toContain('REQUIRED_FIELD');
    expect(codes).toContain('FORMAT_CHECK');
    expect(codes).toContain('RANGE_CHECK');
  });

  it('throws NotFoundError for unknown result', async () => {
    await expect(
      valRepo.findById(ctx1, '00000000-0000-0000-0000-deadbeef0004')
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('tenant isolation: ctx2 cannot see ctx1 validation result', async () => {
    await expect(
      valRepo.findById(ctx2, resultId)
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe.runIf(RUN)('Integration: DataQualityScoreRepository', () => {
  const srcRepo   = new DataSourceRepository();
  const scoreRepo = new DataQualityScoreRepository();
  let sourceId: string;
  let scoreId: string;

  beforeAll(setupIntegration);
  afterAll(teardownIntegration);

  it('creates a quality score with all dimension scores', async () => {
    const src = await srcRepo.create(ctx1, {
      name: 'QS Src', sourceCode: uniqueCode('qs-src'), sourceType: 'database', sensitivityLevel: 'confidential',
    });
    sourceId = src.id;

    const score = await scoreRepo.create(ctx1, {
      dataSourceId: sourceId,
      scopeType:    'source',
      completeness: 0.98,
      validity:     0.95,
      consistency:  0.92,
      timeliness:   0.90,
      uniqueness:   0.99,
      conformity:   0.94,
      overallScore: 0.95,
      correlationId: '00000000-aaaa-0000-0000-000000000005',
    });
    scoreId = score.id;

    expect(score.overallScore).toBeCloseTo(0.95);
    expect(score.completeness).toBeCloseTo(0.98);
    expect(score.dataSourceId).toBe(sourceId);
  });

  it('findById returns the score', async () => {
    const found = await scoreRepo.findById(ctx1, scoreId);
    expect(found.id).toBe(scoreId);
    expect(found.correlationId).toBe('00000000-aaaa-0000-0000-000000000005');
  });

  it('latestForSource returns the most recent score', async () => {
    const latest = await scoreRepo.latestForSource(ctx1, sourceId);
    expect(latest).not.toBeNull();
    expect(latest!.id).toBe(scoreId);
  });

  it('latestForSource returns null for unknown source', async () => {
    const latest = await scoreRepo.latestForSource(ctx1, '00000000-0000-0000-0000-deadbeef0005');
    expect(latest).toBeNull();
  });

  it('throws NotFoundError for unknown score id', async () => {
    await expect(
      scoreRepo.findById(ctx1, '00000000-0000-0000-0000-deadbeef0006')
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('tenant isolation: ctx2 cannot see ctx1 score', async () => {
    await expect(
      scoreRepo.findById(ctx2, scoreId)
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('scores outside 0-1 are rejected by the database', async () => {
    await expect(
      scoreRepo.create(ctx1, {
        dataSourceId: sourceId, scopeType: 'source',
        completeness: 1.5, validity: 0.9, consistency: 0.9,
        timeliness: 0.9, uniqueness: 0.9, conformity: 0.9, overallScore: 0.9,
      })
    ).rejects.toThrow();
  });
});

describe.runIf(RUN)('Integration: ProvenanceRepository', () => {
  const srcRepo  = new DataSourceRepository();
  const provRepo = new ProvenanceRepository();
  let sourceId: string;
  let rootId: string;
  let childId: string;

  beforeAll(setupIntegration);
  afterAll(teardownIntegration);

  it('creates root provenance record with lineage_depth 0', async () => {
    const src = await srcRepo.create(ctx1, {
      name: 'Prov Src', sourceCode: uniqueCode('prov-src'), sourceType: 'api', sensitivityLevel: 'restricted',
    });
    sourceId = src.id;

    const { provenance, transformations } = await provRepo.create(
      ctx1,
      {
        dataSourceId:    sourceId,
        recordReference: 'rec-001',
        sourceReference: 'upstream/feed/001',
        sourceHash:      'sha256:abc123',
        correlationId:   '00000000-aaaa-0000-0000-000000000006',
      },
      [
        {
          transformationType: 'normalise',
          transformationVersion: '1.0',
          inputHash:  'sha256:raw001',
          outputHash: 'sha256:norm001',
          performedByType: 'pipeline',
        },
      ]
    );

    rootId = provenance.id;
    expect(provenance.lineageDepth).toBe(0);
    expect(provenance.parentProvenanceId).toBeNull();
    expect(transformations).toHaveLength(1);
    expect(transformations[0].transformationType).toBe('normalise');
  });

  it('creates child provenance record with lineage_depth 1', async () => {
    const { provenance: child } = await provRepo.create(ctx1, {
      dataSourceId:      sourceId,
      recordReference:   'rec-002',
      sourceReference:   'upstream/feed/002',
      parentProvenanceId: rootId,
      correlationId:     '00000000-aaaa-0000-0000-000000000007',
    });

    childId = child.id;
    expect(child.lineageDepth).toBe(1);
    expect(child.parentProvenanceId).toBe(rootId);
  });

  it('findById returns the record', async () => {
    const found = await provRepo.findById(ctx1, rootId);
    expect(found.recordReference).toBe('rec-001');
    expect(found.correlationId).toBe('00000000-aaaa-0000-0000-000000000006');
  });

  it('listTransformations returns the transformation records', async () => {
    const trs = await provRepo.listTransformations(ctx1, rootId);
    expect(trs).toHaveLength(1);
    expect(trs[0].transformationType).toBe('normalise');
  });

  it('listTransformations returns empty for child with no transformations', async () => {
    const trs = await provRepo.listTransformations(ctx1, childId);
    expect(trs).toHaveLength(0);
  });

  it('throws NotFoundError for unknown provenance id', async () => {
    await expect(
      provRepo.findById(ctx1, '00000000-0000-0000-0000-deadbeef0007')
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('tenant isolation: ctx2 cannot see ctx1 provenance', async () => {
    await expect(
      provRepo.findById(ctx2, rootId)
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe.runIf(RUN)('Integration: PublicationPackageRepository', () => {
  const repo = new PublicationPackageRepository();
  let draftId: string;
  let readyId: string;

  beforeAll(setupIntegration);
  afterAll(teardownIntegration);

  it('creates a draft publication package', async () => {
    const pkg = await repo.create(ctx1, {
      packageType:  'full_extract',
      targetLayer:  'business_operations',
      targetBlock:  'bo-01',
      recordCount:  500,
      qualityScore: 0.95,
      correlationId: '00000000-aaaa-0000-0000-000000000008',
    });
    draftId = pkg.id;

    expect(pkg.status).toBe('draft');
    expect(pkg.targetLayer).toBe('business_operations');
    expect(pkg.recordCount).toBe(500);
    expect(pkg.qualityScore).toBeCloseTo(0.95);
    expect(pkg.publishedAt).toBeNull();
  });

  it('findById retrieves the package', async () => {
    const found = await repo.findById(ctx1, draftId);
    expect(found.correlationId).toBe('00000000-aaaa-0000-0000-000000000008');
  });

  it('listByTargetLayer returns the package', async () => {
    const list = await repo.listByTargetLayer(ctx1, 'business_operations');
    expect(list.map((p) => p.id)).toContain(draftId);
  });

  it('publish rejects draft (requires ready status)', async () => {
    await expect(repo.publish(ctx1, draftId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('publish succeeds when package is in ready status', async () => {
    const ready = await repo.create(ctx1, {
      packageType:  'delta',
      targetLayer:  'business_intelligence',
      targetBlock:  'bi-01',
      recordCount:  200,
      status:       'ready',
      correlationId: '00000000-aaaa-0000-0000-000000000009',
    });
    readyId = ready.id;

    const published = await repo.publish(ctx1, readyId);
    expect(published.status).toBe('published');
    expect(published.publishedAt).not.toBeNull();
  });

  it('revoke sets status to revoked', async () => {
    const revoked = await repo.revoke(ctx1, readyId);
    expect(revoked.status).toBe('revoked');
  });

  it('throws NotFoundError for unknown package', async () => {
    await expect(
      repo.findById(ctx1, '00000000-0000-0000-0000-deadbeef0008')
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('tenant isolation: ctx2 cannot see ctx1 package', async () => {
    await expect(
      repo.findById(ctx2, draftId)
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('correlation ID is preserved on the package', async () => {
    const found = await repo.findById(ctx1, draftId);
    expect(found.correlationId).toBe('00000000-aaaa-0000-0000-000000000008');
  });
});
