import type { PoolClient } from 'pg';
import {
  DataSourceRepository, type DataSource, type CreateDataSourceInput,
  ConnectorRepository, type Connector, type CreateConnectorInput,
  type ConnectorHealthStatus,
  CollectionRunRepository, type CollectionRun,
  ValidationResultRepository, type ValidationResult, type ValidationIssue,
  DataQualityScoreRepository, type DataQualityScore,
  ManualSubmissionRepository,
  ProvenanceRepository, type ProvenanceRecord,
  PublicationPackageRepository, type PublicationPackage, type PublicationPackageStatus,
  type PageOptions,
  withTenantTransaction,
  type TenantContext,
  emitDataQualityScored,
  emitDataQuarantined,
  emitValidationCompleted,
} from '@infinicus/database';
import { ManualRecordValidator } from './validation/ManualRecordValidator.js';
import { MAX_RECORDS_PER_REQUEST } from './validation/schemas.js';
import { DataQualityScoringService } from './quality/DataQualityScoringService.js';
import { ProvenanceService } from './provenance/ProvenanceService.js';
import { PublicationService } from './publication/PublicationService.js';
import { NotFoundError, ValidationError, CollectionLimitExceededError } from './errors.js';
import type { ManualIntakeRequest, ManualIntakeResult } from './types.js';

const sources = new DataSourceRepository();
const connectors = new ConnectorRepository();
const runs = new CollectionRunRepository();
const validationResults = new ValidationResultRepository();
const qualityScores = new DataQualityScoreRepository();
const manualSubmissions = new ManualSubmissionRepository();
const provenanceRepo = new ProvenanceRepository();
const publicationPackages = new PublicationPackageRepository();

const validator = new ManualRecordValidator();
const scoring = new DataQualityScoringService();
const provenance = new ProvenanceService();
const publication = new PublicationService();

/**
 * Orchestrates the Data Acquisition runtime (BUILD-31 §4). Every method
 * that takes a `businessId` verifies the resource it operates on actually
 * belongs to that business before doing anything else — the route layer
 * verifies the business itself exists (the established
 * `BusinessRepository.getById` convention this codebase already uses for
 * every other business-scoped route), so "verify the business" from §4.5
 * step 1 happens one layer up; what this service adds is ownership, not
 * existence.
 */
export class DataAcquisitionService {
  // ── Source lifecycle (§4.3) ────────────────────────────────────────────────

  async registerSource(ctx: TenantContext, input: CreateDataSourceInput): Promise<DataSource> {
    return sources.create(ctx, input);
  }

  async listSources(
    ctx: TenantContext,
    businessId: string,
    opts: { status?: string } & PageOptions = {}
  ): Promise<DataSource[]> {
    return sources.listByBusiness(ctx, businessId, opts);
  }

  async getSource(ctx: TenantContext, businessId: string, sourceId: string): Promise<DataSource> {
    const source = await sources.findById(ctx, sourceId);
    assertOwnedByBusiness(source.businessId, businessId, 'DataSource', sourceId);
    return source;
  }

  async updateSourceStatus(
    ctx: TenantContext,
    businessId: string,
    sourceId: string,
    status: string
  ): Promise<DataSource> {
    await this.getSource(ctx, businessId, sourceId); // ownership check
    return sources.updateStatus(ctx, sourceId, status);
  }

  async deleteSource(ctx: TenantContext, businessId: string, sourceId: string): Promise<void> {
    await this.getSource(ctx, businessId, sourceId); // ownership check
    return sources.softDelete(ctx, sourceId);
  }

  // ── Connector lifecycle (§4.4) ─────────────────────────────────────────────

  async registerConnector(
    ctx: TenantContext,
    businessId: string,
    sourceId: string,
    input: Omit<CreateConnectorInput, 'dataSourceId'>
  ): Promise<Connector> {
    await this.getSource(ctx, businessId, sourceId); // ownership check
    return connectors.create(ctx, { ...input, dataSourceId: sourceId });
  }

  async listConnectors(
    ctx: TenantContext,
    businessId: string,
    sourceId: string,
    page: PageOptions = {}
  ): Promise<Connector[]> {
    await this.getSource(ctx, businessId, sourceId); // ownership check
    return connectors.listByDataSource(ctx, sourceId, page);
  }

  async getConnector(
    ctx: TenantContext,
    businessId: string,
    sourceId: string,
    connectorId: string
  ): Promise<Connector> {
    await this.getSource(ctx, businessId, sourceId); // ownership check
    return connectors.findByIdForSource(ctx, sourceId, connectorId);
  }

  async healthCheckConnector(
    ctx: TenantContext,
    businessId: string,
    sourceId: string,
    connectorId: string,
    healthStatus: ConnectorHealthStatus
  ): Promise<Connector> {
    await this.getConnector(ctx, businessId, sourceId, connectorId); // ownership check
    return connectors.updateHealth(ctx, connectorId, healthStatus);
  }

  async updateConnectorStatus(
    ctx: TenantContext,
    businessId: string,
    sourceId: string,
    connectorId: string,
    status: Parameters<ConnectorRepository['updateStatus']>[2]
  ): Promise<Connector> {
    await this.getConnector(ctx, businessId, sourceId, connectorId); // ownership check
    return connectors.updateStatus(ctx, connectorId, status);
  }

  // ── Manual JSON intake (§4.5) ──────────────────────────────────────────────

  /**
   * Executes the frozen 14-step manual-intake sequence synchronously, no
   * process-local background execution.
   *
   * Transactional shape (chosen to satisfy §6.3/§6.4/§6.5/§6.6 atomicity
   * while keeping a "the run started" fact durable even if something later
   * fails):
   *
   *   1. One transaction creates the run and transitions it to `collecting`,
   *      emitting da.collection.started, and commits immediately — this run
   *      now durably exists in `collecting` regardless of what happens next.
   *   2. A second transaction does the actual intake work — persist the
   *      submission, validate every record, persist validation results and
   *      quality score, create provenance for every accepted record, mark
   *      the run `collected` then `validated`/`quarantined`, and emit every
   *      corresponding event — entirely atomically: either the whole
   *      collection-processed story commits, or none of it does.
   *   3. If step 2 throws, a third transaction marks the already-durable run
   *      `failed` (a legal edge from `collecting`, which is exactly the
   *      state step 1 left it in) and emits da.collection.failed, then the
   *      original error is re-thrown so the API layer's normal error
   *      handling takes over.
   */
  async submitManualIntake(ctx: TenantContext, request: ManualIntakeRequest): Promise<ManualIntakeResult> {
    if (!Array.isArray(request.records) || request.records.length === 0) {
      throw new ValidationError('records must be a non-empty array.');
    }
    if (request.records.length > MAX_RECORDS_PER_REQUEST) {
      throw new CollectionLimitExceededError(
        'recordsPerRequest', MAX_RECORDS_PER_REQUEST, request.records.length
      );
    }

    // Step 2: verify the source belongs to this business and is active — a
    // draft or retired source is not "governed" enough to accept intake
    // (BUILD-31 §2 describes the whole source/connector lifecycle as
    // "governed"; this is what that means at intake time).
    const source = await this.getSource(ctx, request.businessId, request.dataSourceId);
    if (source.status !== 'active') {
      throw new ValidationError(
        `Data source ${source.id} is not active (status: ${source.status}); manual intake requires an active source.`
      );
    }

    // Step 3: verify the connector, when supplied, belongs to this source.
    if (request.connectorId) {
      await connectors.findByIdForSource(ctx, source.id, request.connectorId);
    }

    // Steps 4-6: create the run, start it, emit da.collection.started —
    // committed on its own so the run's existence survives whatever
    // happens next.
    const started = await withTenantTransaction(ctx, async (client) => {
      const run = await runs.createOn(client, ctx, {
        businessId: request.businessId,
        dataSourceId: source.id,
        connectorId: request.connectorId,
        // collection_runs_type_check (0014_create_da_collection_runs.sql)
        // permits 'manual', not 'manual_json' — that value names a
        // *connector* type (connectors_type_check), a different column.
        collectionType: 'manual',
        correlationId: request.correlationId,
      });
      return runs.markStartedOn(client, ctx, run.id);
    });

    try {
      return await withTenantTransaction(ctx, (client) =>
        this.processManualIntakeOn(client, ctx, started, source.id, request)
      );
    } catch (err) {
      await this.markRunFailedSafely(ctx, started.id, err);
      throw err;
    }
  }

  /**
   * Steps 7-13 of §4.5, run on one shared client so they commit atomically.
   * Split out of submitManualIntake purely for readability — this is not a
   * separately callable public operation.
   */
  private async processManualIntakeOn(
    client: PoolClient,
    ctx: TenantContext,
    run: CollectionRun,
    dataSourceId: string,
    request: ManualIntakeRequest
  ): Promise<ManualIntakeResult> {
    // Step 7: persist the manual submission.
    const submission = await manualSubmissions.createOn(client, ctx, {
      businessId: request.businessId,
      dataSourceId,
      collectionRunId: run.id,
      submittedBy: request.submittedBy,
      submissionType: request.submissionType,
      payload: { records: request.records, sourceReference: request.sourceReference, metadata: request.metadata },
      submissionNotes: request.submissionNotes,
      correlationId: run.correlationId,
    });

    // Step 8: validate every record deterministically.
    const validation = validator.validateBatch(request.records);

    // Step 9: persist validation results and issues.
    const { result: validationResult } = await validationResults.createOn(
      client,
      ctx,
      {
        businessId: request.businessId,
        collectionRunId: run.id,
        recordReference: submission.id,
        isValid: validation.allValid,
        errorCount: validation.totalErrorCount,
        warningCount: validation.totalWarningCount,
        resultDetails: {
          recordCount: request.records.length,
          duplicateRecordIndexes: validation.duplicateRecordIndexes,
        },
        correlationId: run.correlationId,
      },
      validation.records.flatMap((r) =>
        r.issues.map((issue) => ({
          ruleCode: issue.ruleCode,
          fieldPath: issue.fieldPath ?? undefined,
          severity: issue.severity,
          issueType: issue.issueType,
          message: `record[${r.recordIndex}]: ${issue.message}`,
          observedValue: issue.observedValue,
          expectedValue: issue.expectedValue,
        }))
      )
    );

    // Step 10: calculate and persist a deterministic quality score.
    // DataQualityScoringService scores on a 0-100 scale, matching BUILD-31
    // §4.10's own wording ("0 to 100", "90-100 excellent"). The persistence
    // columns (data_quality_scores.completeness/validity/.../overall_score,
    // 0018_create_da_quality_provenance.sql) are numeric(5,4) — a 0-1
    // fraction — so every dimension is divided by 100 at the persistence
    // boundary, same conversion already applied to
    // publication_packages.quality_score below.
    const qualityResult = scoring.score(request.records, validation);
    const qualityScore = await qualityScores.createOn(client, ctx, {
      businessId: request.businessId,
      dataSourceId,
      collectionRunId: run.id,
      scopeType: 'run',
      completeness: qualityResult.completeness / 100,
      validity: qualityResult.validity / 100,
      consistency: qualityResult.consistency / 100,
      timeliness: qualityResult.timeliness / 100,
      uniqueness: qualityResult.uniqueness / 100,
      conformity: qualityResult.conformity / 100,
      overallScore: qualityResult.overallScore / 100,
      weights: qualityResult.weights as unknown as Record<string, unknown>,
      scoreDetails: { classification: qualityResult.classification },
      correlationId: run.correlationId,
    });
    await emitDataQualityScored(client, ctx, {
      scoreId: qualityScore.id,
      sourceId: dataSourceId,
      // Same 0-1 scale as the persisted row (qualityScore.overallScore),
      // not the 0-100 scale DataQualityScoringService returns — the event
      // should describe what was actually stored.
      overallScore: qualityScore.overallScore,
      correlationId: run.correlationId,
    });

    // Step 11: create provenance records and hashes for every accepted
    // (valid) record. A record's own array index is a stable-enough
    // reference within this one submission.
    const provenanceIds: string[] = [];
    let accepted = 0;
    for (const outcome of validation.records) {
      if (!outcome.isValid) continue;
      accepted++;
      const id = await provenance.recordOn(client, ctx, {
        dataSourceId,
        businessId: request.businessId,
        collectionRunId: run.id,
        recordReference: `${submission.id}#${outcome.recordIndex}`,
        sourceReference: request.sourceReference ?? submission.id,
        record: request.records[outcome.recordIndex],
        correlationId: run.correlationId,
      });
      provenanceIds.push(id);
    }
    const rejected = request.records.length - accepted;

    // Step 12 (part 1): collecting -> collected, emits da.collection.completed.
    await runs.markCompletedOn(client, ctx, run.id, {
      recordsReceived: request.records.length,
      recordsAccepted: accepted,
      recordsRejected: rejected,
      bytesReceived: Buffer.byteLength(JSON.stringify(request.records), 'utf8'),
    });

    // Step 12 (part 2): collected -> validated (clean batch) or
    // collected -> quarantined (any invalid record present — §4.9: "one or
    // more invalid records must produce either quarantined or a mixed
    // accepted/rejected outcome"; this build always quarantines for review
    // rather than silently discarding the rejected records, and quarantined
    // has an explicit remediation path back to validated per §4.6).
    let finalRun: CollectionRun;
    if (validation.allValid) {
      finalRun = await runs.markValidatedOn(client, ctx, run.id);
    } else {
      finalRun = await runs.markQuarantinedOn(client, ctx, run.id);
      await emitDataQuarantined(client, ctx, {
        collectionRunId: run.id,
        recordReference: submission.id,
        reason: `${rejected} of ${request.records.length} records failed validation`,
        correlationId: run.correlationId,
      });
    }

    await emitValidationCompleted(client, ctx, {
      validationResultId: validationResult.id,
      collectionRunId: run.id,
      isValid: validation.allValid,
      errorCount: validation.totalErrorCount,
      warningCount: validation.totalWarningCount,
      correlationId: run.correlationId,
    });

    // Step 14: return the run summary.
    return {
      collectionRunId: finalRun.id,
      state: finalRun.state,
      manualSubmissionId: submission.id,
      recordsReceived: request.records.length,
      recordsAccepted: accepted,
      recordsRejected: rejected,
      validationResultId: validationResult.id,
      qualityScoreId: qualityScore.id,
      provenanceIds,
      correlationId: run.correlationId,
    };
  }

  private async markRunFailedSafely(ctx: TenantContext, runId: string, err: unknown): Promise<void> {
    try {
      await runs.markFailed(
        ctx,
        runId,
        'MANUAL_INTAKE_PROCESSING_FAILED',
        err instanceof Error ? err.message : 'Unknown error during manual intake processing.'
      );
    } catch {
      // The run may already have moved out of `collecting` (e.g. a second
      // concurrent intake attempt raced this one) — runGuardedTransition
      // raises InvalidStateTransitionError in that case. The original error
      // from the failed intake is what the caller needs to see, so a
      // failure to also mark the run failed is swallowed here rather than
      // masking it.
    }
  }

  // ── Reads (§4.14) ───────────────────────────────────────────────────────────

  async getRun(ctx: TenantContext, businessId: string, runId: string): Promise<CollectionRun> {
    const run = await runs.findById(ctx, runId);
    assertOwnedByBusiness(run.businessId, businessId, 'CollectionRun', runId);
    return run;
  }

  async listRuns(ctx: TenantContext, businessId: string, page: PageOptions = {}): Promise<CollectionRun[]> {
    return runs.listByBusiness(ctx, businessId, page);
  }

  /**
   * ValidationResultRepository.listByCollectionRun() does not join issues
   * (a separate table/query — listIssues()); callers of this API need to
   * see *why* a result was rejected, not just error/warning counts, so
   * each result's issues are fetched and attached here.
   */
  async listValidationResults(
    ctx: TenantContext,
    businessId: string,
    runId: string,
    page: PageOptions = {}
  ): Promise<(ValidationResult & { issues: ValidationIssue[] })[]> {
    await this.getRun(ctx, businessId, runId); // ownership check
    const results = await validationResults.listByCollectionRun(ctx, runId, page);
    return Promise.all(
      results.map(async (result) => ({
        ...result,
        issues: await validationResults.listIssues(ctx, result.id),
      }))
    );
  }

  async getQualityScore(
    ctx: TenantContext,
    businessId: string,
    runId: string
  ): Promise<DataQualityScore | null> {
    await this.getRun(ctx, businessId, runId); // ownership check
    return qualityScores.findByCollectionRun(ctx, runId);
  }

  async listProvenance(
    ctx: TenantContext,
    businessId: string,
    runId: string,
    page: PageOptions = {}
  ): Promise<ProvenanceRecord[]> {
    await this.getRun(ctx, businessId, runId); // ownership check
    return provenanceRepo.listByCollectionRun(ctx, runId, page);
  }

  // ── Publication (§4.12/§4.13) ──────────────────────────────────────────────

  async preparePublicationPackage(
    ctx: TenantContext,
    businessId: string,
    runId: string,
    input: { targetBlock: string; packageType?: string; limitations?: unknown[] }
  ): Promise<PublicationPackage> {
    const run = await this.getRun(ctx, businessId, runId); // ownership check
    const score = await qualityScores.findByCollectionRun(ctx, runId);
    const provenanceForRun = await provenanceRepo.listByCollectionRun(ctx, runId, { limit: 200 });

    publication.assertReadyForPreparation({
      runState: run.state,
      targetLayer: 'business_operations',
      targetBlock: input.targetBlock,
      qualityScoreExists: score !== null,
      provenanceCount: provenanceForRun.length,
      acceptedRecordCount: run.recordsAccepted,
    });

    return withTenantTransaction(ctx, async (client) => {
      const pkg = await publicationPackages.createOn(client, ctx, {
        businessId,
        packageType: input.packageType ?? 'manual_intake',
        targetLayer: 'business_operations',
        targetBlock: input.targetBlock,
        dataReference: { collectionRunId: runId },
        recordCount: run.recordsAccepted,
        // score.overallScore is already the 0-1 fraction stored in
        // data_quality_scores.overall_score — publication_packages.
        // quality_score is the same numeric(5,4) fraction scale, so no
        // conversion is needed here (unlike the 0-100 scale
        // DataQualityScoringService itself returns, converted once already
        // at the point that score was persisted).
        qualityScore: score ? score.overallScore : undefined,
        provenanceReferenceIds: provenanceForRun.map((p) => p.id),
        limitations: input.limitations ?? [],
        correlationId: run.correlationId,
      });
      return publicationPackages.markReadyOn(client, pkg.id);
    });
  }

  async publishPackage(
    ctx: TenantContext,
    businessId: string,
    packageId: string
  ): Promise<PublicationPackage> {
    const pkg = await publicationPackages.findById(ctx, packageId);
    assertOwnedByBusiness(pkg.businessId, businessId, 'PublicationPackage', packageId);

    const dataReference = pkg.dataReference as { collectionRunId?: string };
    const runId = dataReference.collectionRunId;
    if (!runId) {
      throw new ValidationError(`Publication package ${packageId} has no associated collection run.`);
    }

    publication.assertReadyForPublish({
      packageStatus: pkg.status,
      targetLayer: pkg.targetLayer,
      qualityScore: pkg.qualityScore !== null ? pkg.qualityScore * 100 : null,
    });

    return withTenantTransaction(ctx, (client) => publicationPackages.publishOn(client, ctx, packageId, runId));
  }

  async listPublicationPackages(
    ctx: TenantContext,
    businessId: string,
    opts: { status?: PublicationPackageStatus } & PageOptions = {}
  ): Promise<PublicationPackage[]> {
    return publicationPackages.listByBusinessAndStatus(ctx, businessId, opts);
  }

  async getPublicationPackage(
    ctx: TenantContext,
    businessId: string,
    packageId: string
  ): Promise<PublicationPackage> {
    const pkg = await publicationPackages.findById(ctx, packageId);
    assertOwnedByBusiness(pkg.businessId, businessId, 'PublicationPackage', packageId);
    return pkg;
  }
}

function assertOwnedByBusiness(
  actualBusinessId: string | null,
  expectedBusinessId: string,
  entity: string,
  id: string
): void {
  if (actualBusinessId !== expectedBusinessId) {
    // A resource that exists but belongs to a different business is
    // reported as not-found, not as a permission error — this fails closed
    // on cross-business/cross-tenant access without revealing that the
    // resource exists elsewhere (BUILD-31 §5.6: "other workspace data" must
    // not be exposed).
    throw new NotFoundError(entity, id);
  }
}
