import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError } from './errors.js';

export interface Lead {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  leadCode: string;
  companyName: string | null;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  leadSource: string;
  leadStatus: string;
  score: number;
  assignedTo: string | null;
  notes: string | null;
  convertedAt: Date | null;
  customerId: string | null;
  status: string;
  version: number;
  correlationId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

export interface CreateLeadInput {
  businessId: string;
  leadCode: string;
  companyName?: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  leadSource?: string;
  score?: number;
  assignedTo?: string;
  notes?: string;
  correlationId?: string;
  createdBy?: string;
}

function rowToLead(row: Record<string, unknown>): Lead {
  return {
    id:           row.id            as string,
    tenantId:     row.tenant_id     as string,
    workspaceId:  row.workspace_id  as string,
    businessId:   row.business_id   as string,
    leadCode:     row.lead_code     as string,
    companyName:  row.company_name  as string | null,
    contactName:  row.contact_name  as string,
    contactEmail: row.contact_email as string | null,
    contactPhone: row.contact_phone as string | null,
    leadSource:   row.lead_source   as string,
    leadStatus:   row.lead_status   as string,
    score:        row.score         as number,
    assignedTo:   row.assigned_to   as string | null,
    notes:        row.notes         as string | null,
    convertedAt:  row.converted_at  as Date | null,
    customerId:   row.customer_id   as string | null,
    status:       row.status        as string,
    version:      row.version       as number,
    correlationId: row.correlation_id as string,
    createdAt:    row.created_at    as Date,
    updatedAt:    row.updated_at    as Date,
    createdBy:    row.created_by    as string | null,
  };
}

export class LeadRepository {
  async create(ctx: TenantContext, input: CreateLeadInput): Promise<Lead> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_operations.leads
           (tenant_id, workspace_id, business_id, lead_code, company_name, contact_name,
            contact_email, contact_phone, lead_source, score, assigned_to, notes,
            correlation_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING *`,
        [
          ctx.tenantId, ctx.workspaceId,
          input.businessId,
          input.leadCode,
          input.companyName     ?? null,
          input.contactName,
          input.contactEmail    ?? null,
          input.contactPhone    ?? null,
          input.leadSource      ?? 'unknown',
          input.score           ?? 0,
          input.assignedTo      ?? null,
          input.notes           ?? null,
          input.correlationId   ?? randomUUID(),
          input.createdBy       ?? null,
        ]
      );
      return rowToLead(result.rows[0]);
    });
  }

  async findById(ctx: TenantContext, id: string): Promise<Lead> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM business_operations.leads WHERE id = $1',
        [id]
      );
      if (result.rows.length === 0) throw new NotFoundError('Lead', id);
      return rowToLead(result.rows[0]);
    });
  }

  async listByStatus(ctx: TenantContext, leadStatus: string): Promise<Lead[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM business_operations.leads
         WHERE lead_status = $1
         ORDER BY created_at DESC`,
        [leadStatus]
      );
      return result.rows.map(rowToLead);
    });
  }

  async updateStatus(ctx: TenantContext, id: string, leadStatus: string): Promise<Lead> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_operations.leads
         SET lead_status = $2, version = version + 1
         WHERE id = $1
         RETURNING *`,
        [id, leadStatus]
      );
      if (result.rows.length === 0) throw new NotFoundError('Lead', id);
      return rowToLead(result.rows[0]);
    });
  }

  async convert(ctx: TenantContext, id: string, customerId: string): Promise<Lead> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_operations.leads
         SET lead_status = 'converted', customer_id = $2, converted_at = now(), version = version + 1
         WHERE id = $1
         RETURNING *`,
        [id, customerId]
      );
      if (result.rows.length === 0) throw new NotFoundError('Lead', id);
      return rowToLead(result.rows[0]);
    });
  }
}
