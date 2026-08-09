/**
 * Persistence for data_acquisition.manual_submissions (BUILD-31 §4.8).
 *
 * Five constraints are recorded here because each is a decision, not an
 * oversight:
 *
 * 1. Intake-contract gap. BUILD-31 §4.5 lists `connector ID`, `source
 *    reference`, and `metadata` among the manual-intake request fields, but
 *    manual_submissions has no column for any of them (verified against
 *    0014_create_da_collection_runs.sql). They are deliberately NOT folded
 *    into `payload` — doing so would silently invent a storage contract.
 *    Persisting them requires either a migration or an explicit decision to
 *    nest them; neither belongs to this slice.
 *
 * 2. No frozen status matrix. §4.6 defines a state machine for collection runs
 *    only. §4.8 requires "guarded updates" without naming a single legal edge
 *    among submitted/reviewing/accepted/rejected/superseded, so this module
 *    makes no claim about which edges are legal — see updateStatus.
 *
 * 3. Revisions out of scope. revision_number and parent_submission_id are
 *    mapped for reading, but no revision behaviour is offered and neither is
 *    settable on create: the frozen §4.5 endpoint does not expose revisions.
 *
 * 4. No supporting index. manual_submissions carries only its primary-key
 *    index — 0020_create_da_indexes.sql adds none — so listByCollectionRun
 *    will sequential-scan. A deliberate index migration is likely required
 *    before production-scale intake.
 *
 * 5. Atomicity caveat. Every public method here opens its own
 *    withTenantTransaction, as in the other DA repositories. The §4.5
 *    fourteen-step intake must complete as one synchronous transaction, so
 *    these methods cannot be sequentially composed and called atomic.
 *    Client-scoped internal variants are a prerequisite for the intake
 *    orchestration and are not introduced here.
 *
 * RLS note: manual_submissions_isolation (0021) predicates on BOTH tenant_id
 * and workspace_id, which is stricter than most DA tables. withTenantTransaction
 * sets both GUCs, so the standard pattern satisfies it.
 */

import { randomUUID } from 'crypto';
import type { QueryResult } from 'pg';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError, ValidationError } from './errors.js';
import { runGuardedTransition } from './guards.js';
import { boundedPage } from './pagination.js';
import type { PageOptions } from './pagination.js';

/**
 * Submission states, mirroring manual_submissions_status_check in
 * migration 0014_create_da_collection_runs.sql.
 *
 * This is a set of permitted values, not a lifecycle policy — see note 2.
 */
export type ManualSubmissionStatus =
  | 'submitted'
  | 'reviewing'
  | 'accepted'
  | 'rejected'
  | 'superseded';

export const MANUAL_SUBMISSION_STATUSES: readonly ManualSubmissionStatus[] = Object.freeze([
  'submitted',
  'reviewing',
  'accepted',
  'rejected',
  'superseded',
]);

/**
 * Runtime membership check for a status value.
 *
 * Exported rather than module-private so it is not flagged by
 * @typescript-eslint/no-unused-vars before updateStatus exists, and so tests
 * can assert the permitted set against the CHECK constraint directly.
 */
export function isManualSubmissionStatus(value: string): value is ManualSubmissionStatus {
  return (MANUAL_SUBMISSION_STATUSES as readonly string[]).includes(value);
}

export interface ManualSubmission {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string | null;
  dataSourceId: string;
  collectionRunId: string;
  submittedBy: string | null;
  /**
   * No CHECK constraint, enum, or frozen value set exists for this column, and
   * §4.5 does not enumerate submission types, so it is carried as free text
   * and deliberately not runtime-validated.
   */
  submissionType: string;
  /**
   * jsonb accepts any JSON value — object, array, or scalar — and the DEFAULT
   * expression constrains nothing about what may be stored. BUILD-31 has not
   * frozen how the §4.5 `records` request field maps into this column, so the
   * type asserts no shape. Record-shape validation belongs to the intake and
   * validation layers, not to persistence.
   */
  payload: unknown;
  /** Read-only here; no revision behaviour is offered — see note 3. */
  revisionNumber: number;
  /** Read-only here; no parent-chain traversal is offered — see note 3. */
  parentSubmissionId: string | null;
  submissionNotes: string | null;
  status: string;
  correlationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateManualSubmissionInput {
  businessId?: string;
  dataSourceId: string;
  collectionRunId: string;
  submittedBy?: string;
  submissionType: string;
  /** Any JSON value; see the note on ManualSubmission.payload. */
  payload?: unknown;
  submissionNotes?: string;
  correlationId?: string;
}

function rowToManualSubmission(row: Record<string, unknown>): ManualSubmission {
  return {
    id:                 row.id                   as string,
    tenantId:           row.tenant_id            as string,
    workspaceId:        row.workspace_id         as string,
    businessId:         row.business_id          as string | null,
    dataSourceId:       row.data_source_id       as string,
    collectionRunId:    row.collection_run_id    as string,
    submittedBy:        row.submitted_by         as string | null,
    submissionType:     row.submission_type      as string,
    payload:            row.payload,
    revisionNumber:     row.revision_number      as number,
    parentSubmissionId: row.parent_submission_id as string | null,
    submissionNotes:    row.submission_notes     as string | null,
    status:             row.status               as string,
    correlationId:      row.correlation_id       as string,
    createdAt:          row.created_at           as Date,
    updatedAt:          row.updated_at           as Date,
  };
}

export class ManualSubmissionRepository {
  /**
   * Persists one manual submission.
   *
   * Emits nothing: migration 0022 defines no manual-submission wrapper, and
   * BUILD-31 §4.5 treats "persist the manual submission" as step 7 of an
   * intake sequence whose events are emitted around it, not by it.
   *
   * status, revision_number, and parent_submission_id are deliberately absent
   * from the INSERT so the column defaults ('submitted', 1, NULL) apply —
   * see notes 2 and 3 in the file header.
   */
  async create(
    ctx: TenantContext,
    input: CreateManualSubmissionInput
  ): Promise<ManualSubmission> {
    return withTenantTransaction(ctx, async (client) => {
      const result: QueryResult<Record<string, unknown>> = await client.query(
        `INSERT INTO data_acquisition.manual_submissions
           (tenant_id, workspace_id, business_id, data_source_id, collection_run_id,
            submitted_by, submission_type, payload, submission_notes, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING *`,
        [
          ctx.tenantId,
          ctx.workspaceId,
          input.businessId      ?? null,
          input.dataSourceId,
          input.collectionRunId,
          input.submittedBy     ?? null,
          input.submissionType,
          // payload is NOT NULL and currently defaults to '{}'. Because this
          // INSERT supplies the payload column explicitly, an omitted
          // application value is written as '{}' here rather than invoking the
          // database DEFAULT. Any supplied JSON value — including null — is
          // serialized faithfully.
          input.payload !== undefined ? JSON.stringify(input.payload) : '{}',
          input.submissionNotes ?? null,
          input.correlationId   ?? randomUUID(),
        ]
      );
      return rowToManualSubmission(result.rows[0]);
    });
  }

  async findById(ctx: TenantContext, id: string): Promise<ManualSubmission> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM data_acquisition.manual_submissions WHERE id = $1',
        [id]
      );
      if (result.rows.length === 0) throw new NotFoundError('ManualSubmission', id);
      return rowToManualSubmission(result.rows[0]);
    });
  }

  /**
   * Lists submissions for one collection run, newest first.
   *
   * BUILD-31 §4 requires every list to be bounded, so `page` is clamped
   * through boundedPage; omitting it yields DEFAULT_PAGE_SIZE rather than an
   * unbounded scan. Tenant and workspace confinement comes from
   * manual_submissions_isolation via withTenantTransaction — that policy
   * predicates on both tenant_id and workspace_id, so no predicate is
   * hand-written here.
   *
   * No index backs this query: manual_submissions carries only its primary
   * key, so both the filter and the ordering are unindexed. See note 4 in the
   * file header.
   */
  async listByCollectionRun(
    ctx: TenantContext,
    collectionRunId: string,
    page: PageOptions = {}
  ): Promise<ManualSubmission[]> {
    const { limit, offset } = boundedPage(page);

    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM data_acquisition.manual_submissions
         WHERE collection_run_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [collectionRunId, limit, offset]
      );
      return result.rows.map(rowToManualSubmission);
    });
  }

  /**
   * Sets the submission's status under an optimistic concurrency guard.
   *
   * This method encodes NO lifecycle policy. BUILD-31 §4.6 freezes a state
   * machine for collection runs only; §4.8 requires "guarded updates" for
   * manual submissions without naming a single legal edge among
   * submitted/reviewing/accepted/rejected/superseded. The caller therefore
   * supplies the status it believes is persisted, and that value alone becomes
   * the guard — asserting "nobody moved this row since I read it", not "this
   * edge is legal". statesAllowing() is deliberately not used: there is no
   * matrix to derive from, and inventing one would fabricate architecture.
   *
   * A self-transition (expectedStatus === nextStatus) therefore succeeds when
   * the persisted status matches. Rejecting it would be a policy decision, so
   * it is not imposed.
   *
   * Both arguments are validated before any SQL runs, so an out-of-set value
   * raises a controlled error rather than a raw manual_submissions_status_check
   * violation, which BUILD-31 §7 forbids surfacing.
   *
   * Emits nothing: migration 0022 defines no manual-submission wrapper.
   *
   * @throws ValidationError             either status is outside the permitted set
   * @throws NotFoundError               submission not visible to this tenant
   * @throws InvalidStateTransitionError persisted status is not expectedStatus
   */
  async updateStatus(
    ctx: TenantContext,
    id: string,
    expectedStatus: ManualSubmissionStatus,
    nextStatus: ManualSubmissionStatus
  ): Promise<ManualSubmission> {
    if (!isManualSubmissionStatus(expectedStatus)) {
      throw new ValidationError(
        'Unsupported manual submission status: ' + String(expectedStatus)
      );
    }

    if (!isManualSubmissionStatus(nextStatus)) {
      throw new ValidationError(
        'Unsupported manual submission status: ' + String(nextStatus)
      );
    }

    return withTenantTransaction(ctx, async (client) => {
      const row = await runGuardedTransition(client, {
        table:       'data_acquisition.manual_submissions',
        stateColumn: 'status',
        entity:      'ManualSubmission',
        id,
        // The caller's expected value only — never a policy-derived list.
        expected:    [expectedStatus],
        next:        nextStatus,
      });
      return rowToManualSubmission(row);
    });
  }
}
