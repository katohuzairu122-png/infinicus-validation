import { randomUUID } from 'crypto';
import type { QueryResult } from 'pg';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError } from './DataSourceRepository.js';

export interface ValidationResult {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string | null;
  collectionRunId: string;
  validationPolicyId: string | null;
  recordReference: string | null;
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  resultDetails: Record<string, unknown>;
  validatedAt: Date;
  correlationId: string;
  createdAt: Date;
}

export interface CreateValidationResultInput {
  businessId?: string;
  collectionRunId: string;
  validationPolicyId?: string;
  recordReference?: string;
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  resultDetails?: Record<string, unknown>;
  correlationId?: string;
}

export interface ValidationIssue {
  id: string;
  validationResultId: string;
  tenantId: string;
  ruleCode: string;
  fieldPath: string | null;
  severity: string;
  issueType: string;
  message: string;
  observedValue: unknown | null;
  expectedValue: unknown | null;
  resolutionStatus: string;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
}

export interface CreateValidationIssueInput {
  ruleCode: string;
  fieldPath?: string;
  severity: string;
  issueType: string;
  message: string;
  observedValue?: unknown;
  expectedValue?: unknown;
}

function rowToValidationResult(row: Record<string, unknown>): ValidationResult {
  return {
    id:                 row.id                  as string,
    tenantId:           row.tenant_id           as string,
    workspaceId:        row.workspace_id        as string,
    businessId:         row.business_id         as string | null,
    collectionRunId:    row.collection_run_id   as string,
    validationPolicyId: row.validation_policy_id as string | null,
    recordReference:    row.record_reference    as string | null,
    isValid:            row.is_valid            as boolean,
    errorCount:         row.error_count         as number,
    warningCount:       row.warning_count       as number,
    resultDetails:      row.result_details      as Record<string, unknown>,
    validatedAt:        row.validated_at        as Date,
    correlationId:      row.correlation_id      as string,
    createdAt:          row.created_at          as Date,
  };
}

function rowToValidationIssue(row: Record<string, unknown>): ValidationIssue {
  return {
    id:                 row.id                   as string,
    validationResultId: row.validation_result_id as string,
    tenantId:           row.tenant_id            as string,
    ruleCode:           row.rule_code            as string,
    fieldPath:          row.field_path           as string | null,
    severity:           row.severity             as string,
    issueType:          row.issue_type           as string,
    message:            row.message              as string,
    observedValue:      row.observed_value       ?? null,
    expectedValue:      row.expected_value       ?? null,
    resolutionStatus:   row.resolution_status    as string,
    createdAt:          row.created_at           as Date,
    resolvedAt:         row.resolved_at          as Date | null,
    resolvedBy:         row.resolved_by          as string | null,
  };
}

export class ValidationResultRepository {
  async create(
    ctx: TenantContext,
    input: CreateValidationResultInput,
    issues: CreateValidationIssueInput[] = []
  ): Promise<{ result: ValidationResult; issues: ValidationIssue[] }> {
    return withTenantTransaction(ctx, async (client) => {
      const resultRow: QueryResult<Record<string, unknown>> = await client.query(
        `INSERT INTO data_acquisition.validation_results
           (tenant_id, workspace_id, business_id, collection_run_id, validation_policy_id,
            record_reference, is_valid, error_count, warning_count, result_details, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [
          ctx.tenantId,
          ctx.workspaceId,
          input.businessId         ?? null,
          input.collectionRunId,
          input.validationPolicyId ?? null,
          input.recordReference    ?? null,
          input.isValid,
          input.errorCount,
          input.warningCount,
          JSON.stringify(input.resultDetails ?? {}),
          input.correlationId      ?? randomUUID(),
        ]
      );
      const result = rowToValidationResult(resultRow.rows[0]);
      const createdIssues: ValidationIssue[] = [];

      for (const issue of issues) {
        const issueRow = await client.query<Record<string, unknown>>(
          `INSERT INTO data_acquisition.validation_issues
             (validation_result_id, tenant_id, rule_code, field_path, severity,
              issue_type, message, observed_value, expected_value)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           RETURNING *`,
          [
            result.id,
            ctx.tenantId,
            issue.ruleCode,
            issue.fieldPath     ?? null,
            issue.severity,
            issue.issueType,
            issue.message,
            issue.observedValue !== undefined ? JSON.stringify(issue.observedValue) : null,
            issue.expectedValue !== undefined ? JSON.stringify(issue.expectedValue) : null,
          ]
        );
        createdIssues.push(rowToValidationIssue(issueRow.rows[0]));
      }

      return { result, issues: createdIssues };
    });
  }

  async findById(ctx: TenantContext, id: string): Promise<ValidationResult> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM data_acquisition.validation_results WHERE id = $1',
        [id]
      );
      if (result.rows.length === 0) throw new NotFoundError('ValidationResult', id);
      return rowToValidationResult(result.rows[0]);
    });
  }

  async listByCollectionRun(ctx: TenantContext, collectionRunId: string): Promise<ValidationResult[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM data_acquisition.validation_results
         WHERE collection_run_id = $1
         ORDER BY validated_at DESC`,
        [collectionRunId]
      );
      return result.rows.map(rowToValidationResult);
    });
  }

  async listIssues(ctx: TenantContext, validationResultId: string): Promise<ValidationIssue[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM data_acquisition.validation_issues
         WHERE validation_result_id = $1
         ORDER BY severity DESC, created_at ASC`,
        [validationResultId]
      );
      return result.rows.map(rowToValidationIssue);
    });
  }
}
