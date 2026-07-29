import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError } from './errors.js';

export interface SupportCase {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  customerId: string;
  caseNumber: string;
  subject: string;
  description: string | null;
  category: string;
  priority: string;
  caseStatus: string;
  assignedTo: string | null;
  openedAt: Date;
  resolvedAt: Date | null;
  closedAt: Date | null;
  resolutionNotes: string | null;
  slaDueAt: Date | null;
  orderId: string | null;
  invoiceId: string | null;
  status: string;
  version: number;
  correlationId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

export interface CreateSupportCaseInput {
  businessId: string;
  customerId: string;
  caseNumber: string;
  subject: string;
  description?: string;
  category?: string;
  priority?: string;
  assignedTo?: string;
  slaDueAt?: Date;
  orderId?: string;
  invoiceId?: string;
  correlationId?: string;
  createdBy?: string;
}

function rowToCase(row: Record<string, unknown>): SupportCase {
  return {
    id:              row.id               as string,
    tenantId:        row.tenant_id        as string,
    workspaceId:     row.workspace_id     as string,
    businessId:      row.business_id      as string,
    customerId:      row.customer_id      as string,
    caseNumber:      row.case_number      as string,
    subject:         row.subject          as string,
    description:     row.description      as string | null,
    category:        row.category         as string,
    priority:        row.priority         as string,
    caseStatus:      row.case_status      as string,
    assignedTo:      row.assigned_to      as string | null,
    openedAt:        row.opened_at        as Date,
    resolvedAt:      row.resolved_at      as Date | null,
    closedAt:        row.closed_at        as Date | null,
    resolutionNotes: row.resolution_notes as string | null,
    slaDueAt:        row.sla_due_at       as Date | null,
    orderId:         row.order_id         as string | null,
    invoiceId:       row.invoice_id       as string | null,
    status:          row.status           as string,
    version:         row.version          as number,
    correlationId:   row.correlation_id   as string,
    createdAt:       row.created_at       as Date,
    updatedAt:       row.updated_at       as Date,
    createdBy:       row.created_by       as string | null,
  };
}

export class SupportCaseRepository {
  async create(ctx: TenantContext, input: CreateSupportCaseInput): Promise<SupportCase> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_operations.support_cases
           (tenant_id, workspace_id, business_id, customer_id, case_number, subject,
            description, category, priority, assigned_to, sla_due_at,
            order_id, invoice_id, correlation_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         RETURNING *`,
        [
          ctx.tenantId, ctx.workspaceId,
          input.businessId,
          input.customerId,
          input.caseNumber,
          input.subject,
          input.description  ?? null,
          input.category     ?? 'general',
          input.priority     ?? 'normal',
          input.assignedTo   ?? null,
          input.slaDueAt     ?? null,
          input.orderId      ?? null,
          input.invoiceId    ?? null,
          input.correlationId ?? randomUUID(),
          input.createdBy    ?? null,
        ]
      );
      return rowToCase(result.rows[0]);
    });
  }

  async findById(ctx: TenantContext, id: string): Promise<SupportCase> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM business_operations.support_cases WHERE id = $1',
        [id]
      );
      if (result.rows.length === 0) throw new NotFoundError('SupportCase', id);
      return rowToCase(result.rows[0]);
    });
  }

  async listOpen(ctx: TenantContext): Promise<SupportCase[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM business_operations.support_cases
         WHERE case_status IN ('open','in_progress','pending_customer','pending_internal')
         ORDER BY opened_at DESC`,
        []
      );
      return result.rows.map(rowToCase);
    });
  }

  async resolve(
    ctx: TenantContext,
    id: string,
    resolutionNotes: string
  ): Promise<SupportCase> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_operations.support_cases
         SET case_status = 'resolved', resolved_at = now(),
             resolution_notes = $2, version = version + 1
         WHERE id = $1
         RETURNING *`,
        [id, resolutionNotes]
      );
      if (result.rows.length === 0) throw new NotFoundError('SupportCase', id);
      return rowToCase(result.rows[0]);
    });
  }

  async assign(
    ctx: TenantContext,
    id: string,
    assignedTo: string
  ): Promise<SupportCase> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_operations.support_cases
         SET assigned_to = $2, case_status = 'in_progress', version = version + 1
         WHERE id = $1
         RETURNING *`,
        [id, assignedTo]
      );
      if (result.rows.length === 0) throw new NotFoundError('SupportCase', id);
      return rowToCase(result.rows[0]);
    });
  }
}
