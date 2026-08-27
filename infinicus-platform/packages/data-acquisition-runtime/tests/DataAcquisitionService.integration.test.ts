import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DataAcquisitionService } from '../src/DataAcquisitionService.js';
import { NotFoundError, ValidationError, CollectionLimitExceededError } from '../src/errors.js';
import { MAX_RECORDS_PER_REQUEST } from '../src/validation/schemas.js';
import { ctx1, setupIntegration, teardownIntegration, uniqueCode } from './helpers/integration.js';

const RUN = !!process.env.DATABASE_URL;

describe.runIf(RUN)('Integration: DataAcquisitionService', () => {
  const svc = new DataAcquisitionService();
  let businessId: string;

  beforeAll(async () => {
    const setup = await setupIntegration();
    businessId = setup.businessId;
  });
  afterAll(teardownIntegration);

  async function newActiveSource() {
    const source = await svc.registerSource(ctx1, {
      businessId,
      name: 'Test Source',
      sourceCode: uniqueCode('svc-src'),
      sourceType: 'api',
      sensitivityLevel: 'internal',
      status: 'active',
    });
    return source;
  }

  it('registers a source and a manual_json connector', async () => {
    const source = await newActiveSource();
    expect(source.status).toBe('active');

    const connector = await svc.registerConnector(ctx1, businessId, source.id, {
      name: 'Manual Connector',
      connectorType: 'manual_json',
    });
    expect(connector.connectorType).toBe('manual_json');
    expect(connector.dataSourceId).toBe(source.id);
  });

  it('rejects registering a connector for a source belonging to another business', async () => {
    const source = await newActiveSource();
    await expect(
      svc.registerConnector(ctx1, '00000000-0000-0000-0000-deadbeef0099', source.id, {
        name: 'Wrong Business Connector', connectorType: 'manual_json',
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects manual intake against an inactive (draft) source', async () => {
    const draft = await svc.registerSource(ctx1, {
      businessId, name: 'Draft Source', sourceCode: uniqueCode('draft-src'), sourceType: 'api',
    });
    await expect(
      svc.submitManualIntake(ctx1, {
        businessId, dataSourceId: draft.id, submissionType: 'test', records: [{ a: 1 }],
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects an empty records array', async () => {
    const source = await newActiveSource();
    await expect(
      svc.submitManualIntake(ctx1, { businessId, dataSourceId: source.id, submissionType: 'test', records: [] })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects a batch larger than MAX_RECORDS_PER_REQUEST', async () => {
    const source = await newActiveSource();
    const tooMany = new Array(MAX_RECORDS_PER_REQUEST + 1).fill({ a: 1 });
    await expect(
      svc.submitManualIntake(ctx1, { businessId, dataSourceId: source.id, submissionType: 'test', records: tooMany })
    ).rejects.toBeInstanceOf(CollectionLimitExceededError);
  });

  it('rejects an unknown connector id', async () => {
    const source = await newActiveSource();
    await expect(
      svc.submitManualIntake(ctx1, {
        businessId, dataSourceId: source.id, connectorId: '00000000-0000-0000-0000-deadbeef00aa',
        submissionType: 'test', records: [{ a: 1 }],
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('runs a fully-valid manual intake end to end: run reaches validated, quality scored, provenance created for every record', async () => {
    const source = await newActiveSource();
    const result = await svc.submitManualIntake(ctx1, {
      businessId,
      dataSourceId: source.id,
      submissionType: 'product_catalog',
      records: [
        { name: 'Widget', price: 9.99 },
        { name: 'Gadget', price: 19.99 },
      ],
    });

    expect(result.state).toBe('validated');
    expect(result.recordsReceived).toBe(2);
    expect(result.recordsAccepted).toBe(2);
    expect(result.recordsRejected).toBe(0);
    expect(result.provenanceIds).toHaveLength(2);

    const run = await svc.getRun(ctx1, businessId, result.collectionRunId);
    expect(run.state).toBe('validated');
    expect(run.recordsAccepted).toBe(2);

    const score = await svc.getQualityScore(ctx1, businessId, result.collectionRunId);
    expect(score).not.toBeNull();
    expect(score!.overallScore).toBeGreaterThan(0);

    const provenance = await svc.listProvenance(ctx1, businessId, result.collectionRunId);
    expect(provenance).toHaveLength(2);

    const validationResults = await svc.listValidationResults(ctx1, businessId, result.collectionRunId);
    expect(validationResults).toHaveLength(1);
    expect(validationResults[0].isValid).toBe(true);
  });

  it('runs a partially-invalid manual intake: run reaches quarantined, provenance only for accepted records', async () => {
    const source = await newActiveSource();
    const result = await svc.submitManualIntake(ctx1, {
      businessId,
      dataSourceId: source.id,
      submissionType: 'mixed_batch',
      records: [
        { name: 'Valid Widget', price: 9.99 },
        {}, // empty record — invalid
        { name: 'Also Valid', price: 5 },
      ],
    });

    expect(result.state).toBe('quarantined');
    expect(result.recordsReceived).toBe(3);
    expect(result.recordsAccepted).toBe(2);
    expect(result.recordsRejected).toBe(1);
    expect(result.provenanceIds).toHaveLength(2);

    const run = await svc.getRun(ctx1, businessId, result.collectionRunId);
    expect(run.state).toBe('quarantined');
  });

  it('runs a fully-invalid manual intake: run reaches quarantined with zero accepted records', async () => {
    const source = await newActiveSource();
    const result = await svc.submitManualIntake(ctx1, {
      businessId, dataSourceId: source.id, submissionType: 'all_bad',
      records: [{}, []],
    });

    expect(result.state).toBe('quarantined');
    expect(result.recordsAccepted).toBe(0);
    expect(result.recordsRejected).toBe(2);
    expect(result.provenanceIds).toHaveLength(0);
  });

  it('reflects duplicate records in the persisted quality score (lower uniqueness, still succeeds)', async () => {
    const source = await newActiveSource();
    const result = await svc.submitManualIntake(ctx1, {
      businessId, dataSourceId: source.id, submissionType: 'dupes',
      records: [{ sku: 'ABC' }, { sku: 'ABC' }, { sku: 'DEF' }],
    });

    expect(result.state).toBe('validated'); // duplicates are still individually valid records
    const score = await svc.getQualityScore(ctx1, businessId, result.collectionRunId);
    // data_quality_scores.uniqueness is numeric(5,4) — a 0-1 fraction, not
    // the 0-100 scale DataQualityScoringService itself works in.
    expect(score!.uniqueness).toBeCloseTo(1 / 3, 3);
  });

  it('enforces cross-business isolation on run reads', async () => {
    const source = await newActiveSource();
    const result = await svc.submitManualIntake(ctx1, {
      businessId, dataSourceId: source.id, submissionType: 'isolation_test', records: [{ a: 1 }],
    });

    await expect(
      svc.getRun(ctx1, '00000000-0000-0000-0000-deadbeef00bb', result.collectionRunId)
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('prepares and publishes a publication package end to end: package and run both reach published', async () => {
    const source = await newActiveSource();
    const result = await svc.submitManualIntake(ctx1, {
      businessId, dataSourceId: source.id, submissionType: 'publish_flow',
      records: [{ name: 'Item A', price: 10 }, { name: 'Item B', price: 20 }],
    });
    expect(result.state).toBe('validated');

    const pkg = await svc.preparePublicationPackage(ctx1, businessId, result.collectionRunId, {
      targetBlock: 'bo-events',
    });
    expect(pkg.status).toBe('ready');
    expect(pkg.recordCount).toBe(2);
    expect(pkg.targetLayer).toBe('business_operations');

    const published = await svc.publishPackage(ctx1, businessId, pkg.id);
    expect(published.status).toBe('published');
    expect(published.publishedAt).not.toBeNull();

    const run = await svc.getRun(ctx1, businessId, result.collectionRunId);
    expect(run.state).toBe('published');
  });

  it('rejects publishing a package whose run has not reached validated', async () => {
    const source = await newActiveSource();
    const result = await svc.submitManualIntake(ctx1, {
      businessId, dataSourceId: source.id, submissionType: 'not_ready', records: [{}],
    });
    expect(result.state).toBe('quarantined'); // not validated

    await expect(
      svc.preparePublicationPackage(ctx1, businessId, result.collectionRunId, { targetBlock: 'bo-events' })
    ).rejects.toThrow();
  });

  it('rejects publishing the same package twice', async () => {
    const source = await newActiveSource();
    const result = await svc.submitManualIntake(ctx1, {
      businessId, dataSourceId: source.id, submissionType: 'double_publish', records: [{ a: 1 }],
    });
    const pkg = await svc.preparePublicationPackage(ctx1, businessId, result.collectionRunId, {
      targetBlock: 'bo-events',
    });
    await svc.publishPackage(ctx1, businessId, pkg.id);

    await expect(svc.publishPackage(ctx1, businessId, pkg.id)).rejects.toThrow();
  });
});
