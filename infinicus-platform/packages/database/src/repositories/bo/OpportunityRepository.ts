import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError } from './errors.js';

export interface Opportunity {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  customerId: string;
  leadId: string | null;
  opportunityCode: string;
  name: string;
  stage: string;
  probability: number;
  estimatedValue: number;
  currencyCode: string;
  expectedCloseDate: Date | null;
  actualCloseDate: Date | null;
  assignedTo: string | null;
  lostReason: string | null;
  status: string;
  version: number;
  correlationId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

export interface CreateOpportunityInput {
  businessId: string;
  customerId: string;
  leadId?: string;
  opportunityCode: string;
  name: string;
  stage?: string;
  probability?: number;
  estimatedValue?: number;
  currencyCode?: string;
  expectedCloseDate?: Date;
  assignedTo?: string;
  correlationId?: string;
  createdBy?: string;
}

function rowToOpportunity(row: Record<string, unknown>): Opportunity {
  return {
    id:                  row.id                   as string,
    tenantId:            row.tenant_id            as string,
    workspaceId:         row.workspace_id         as string,
    businessId:          row.business_id          as string,
    customerId:          row.customer_id          as string,
    leadId:              row.lead_id              as string | null,
    opportunityCode:     row.opportunity_code     as string,
    name:                row.name                 as string,
    stage:               row.stage                as string,
    probability:         parseFloat(String(row.probability)),
    estimatedValue:      parseFloat(String(row.estimated_value)),
    currencyCode:        row.currency_code        as string,
    expectedCloseDate:   row.expected_close_date  as Date | null,
    actualCloseDate:     row.actual_close_date    as Date | null,
    assignedTo:          row.assigned_to          as string | null,
    lostReason:          row.lost_reason          as string | null,
    status:              row.status               as string,
    version:             row.version              as number,
    correlationId:       row.correlation_id       as string,
    createdAt:           row.created_at           as Date,
    updatedAt:           row.updated_at           as Date,
    createdBy:           row.created_by           as string | null,
  };
}

export class OpportunityRepository {
  async create(ctx: TenantContext, input: CreateOpportunityInput): Promise<Opportunity> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_operations.opportunities
           (tenant_id, workspace_id, business_id, customer_id, lead_id, opportunity_code,
            name, stage, probability, estimated_value, currency_code, expected_close_date,
            assigned_to, correlation_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         RETURNING *`,
        [
          ctx.tenantId, ctx.workspaceId,
          input.businessId,
          input.customerId,
          input.leadId            ?? null,
          input.opportunityCode,
          input.name,
          input.stage             ?? 'qualification',
          input.probability       ?? 0,
          input.estimatedValue    ?? 0,
          input.currencyCode      ?? 'USD',
          input.expectedCloseDate ?? null,
          input.assignedTo        ?? null,
          input.correlationId     ?? randomUUID(),
          input.createdBy         ?? null,
        ]
      );
      return rowToOpportunity(result.rows[0]);
    });
  }

  async findById(ctx: TenantContext, id: string): Promise<Opportunity> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM business_operations.opportunities WHERE id = $1',
        [id]
      );
      if (result.rows.length === 0) throw new NotFoundError('Opportunity', id);
      return rowToOpportunity(result.rows[0]);
    });
  }

  async listByStage(ctx: TenantContext, stage: string): Promise<Opportunity[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM business_operations.opportunities
         WHERE stage = $1 AND status = 'active'
         ORDER BY created_at DESC`,
        [stage]
      );
      return result.rows.map(rowToOpportunity);
    });
  }

  async advanceStage(ctx: TenantContext, id: string, stage: string): Promise<Opportunity> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_operations.opportunities
         SET stage = $2, version = version + 1
         WHERE id = $1
         RETURNING *`,
        [id, stage]
      );
      if (result.rows.length === 0) throw new NotFoundError('Opportunity', id);
      return rowToOpportunity(result.rows[0]);
    });
  }

  async close(
    ctx: TenantContext,
    id: string,
    won: boolean,
    lostReason?: string
  ): Promise<Opportunity> {
    return withTenantTransaction(ctx, async (client) => {
      const stage = won ? 'closed_won' : 'closed_lost';
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_operations.opportunities
         SET stage = $2, actual_close_date = CURRENT_DATE,
             lost_reason = $3, version = version + 1
         WHERE id = $1
         RETURNING *`,
        [id, stage, lostReason ?? null]
      );
      if (result.rows.length === 0) throw new NotFoundError('Opportunity', id);
      return rowToOpportunity(result.rows[0]);
    });
  }
}
