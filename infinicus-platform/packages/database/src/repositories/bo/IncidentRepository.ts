import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError } from './errors.js';

export interface Incident {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  incidentCode: string;
  title: string;
  description: string | null;
  incidentType: string;
  severity: string;
  incidentStatus: string;
  occurredAt: Date;
  detectedAt: Date | null;
  containedAt: Date | null;
  resolvedAt: Date | null;
  reportedBy: string | null;
  assignedTo: string | null;
  riskAssessmentId: string | null;
  rootCause: string | null;
  correctiveActions: string | null;
  customerImpacted: boolean;
  status: string;
  version: number;
  correlationId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

export interface CreateIncidentInput {
  businessId: string;
  incidentCode: string;
  title: string;
  description?: string;
  incidentType: string;
  severity?: string;
  reportedBy?: string;
  assignedTo?: string;
  riskAssessmentId?: string;
  customerImpacted?: boolean;
  correlationId?: string;
  createdBy?: string;
}

function rowToIncident(row: Record<string, unknown>): Incident {
  return {
    id:                row.id                 as string,
    tenantId:          row.tenant_id          as string,
    workspaceId:       row.workspace_id       as string,
    businessId:        row.business_id        as string,
    incidentCode:      row.incident_code      as string,
    title:             row.title              as string,
    description:       row.description        as string | null,
    incidentType:      row.incident_type      as string,
    severity:          row.severity           as string,
    incidentStatus:    row.incident_status    as string,
    occurredAt:        row.occurred_at        as Date,
    detectedAt:        row.detected_at        as Date | null,
    containedAt:       row.contained_at       as Date | null,
    resolvedAt:        row.resolved_at        as Date | null,
    reportedBy:        row.reported_by        as string | null,
    assignedTo:        row.assigned_to        as string | null,
    riskAssessmentId:  row.risk_assessment_id as string | null,
    rootCause:         row.root_cause         as string | null,
    correctiveActions: row.corrective_actions as string | null,
    customerImpacted:  row.customer_impacted  as boolean,
    status:            row.status             as string,
    version:           row.version            as number,
    correlationId:     row.correlation_id     as string,
    createdAt:         row.created_at         as Date,
    updatedAt:         row.updated_at         as Date,
    createdBy:         row.created_by         as string | null,
  };
}

export class IncidentRepository {
  async create(ctx: TenantContext, input: CreateIncidentInput): Promise<Incident> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_operations.incidents
           (tenant_id, workspace_id, business_id, incident_code, title, description,
            incident_type, severity, reported_by, assigned_to,
            risk_assessment_id, customer_impacted, correlation_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING *`,
        [
          ctx.tenantId, ctx.workspaceId,
          input.businessId,
          input.incidentCode,
          input.title,
          input.description      ?? null,
          input.incidentType,
          input.severity         ?? 'medium',
          input.reportedBy       ?? null,
          input.assignedTo       ?? null,
          input.riskAssessmentId ?? null,
          input.customerImpacted ?? false,
          input.correlationId    ?? randomUUID(),
          input.createdBy        ?? null,
        ]
      );
      return rowToIncident(result.rows[0]);
    });
  }

  async findById(ctx: TenantContext, id: string): Promise<Incident> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM business_operations.incidents WHERE id = $1',
        [id]
      );
      if (result.rows.length === 0) throw new NotFoundError('Incident', id);
      return rowToIncident(result.rows[0]);
    });
  }

  async listOpen(ctx: TenantContext): Promise<Incident[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM business_operations.incidents
         WHERE incident_status IN ('open','investigating','contained')
         ORDER BY occurred_at DESC`,
        []
      );
      return result.rows.map(rowToIncident);
    });
  }

  async updateStatus(
    ctx: TenantContext,
    id: string,
    incidentStatus: string
  ): Promise<Incident> {
    return withTenantTransaction(ctx, async (client) => {
      const now = new Date();
      const params: unknown[] = [id, incidentStatus];
      let containedClause = '';
      let resolvedClause = '';
      if (incidentStatus === 'contained') {
        containedClause = ', contained_at = $3';
        params.push(now);
      } else if (incidentStatus === 'resolved') {
        resolvedClause = ', resolved_at = $3';
        params.push(now);
      }
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_operations.incidents
         SET incident_status = $2${containedClause}${resolvedClause}, version = version + 1
         WHERE id = $1
         RETURNING *`,
        params
      );
      if (result.rows.length === 0) throw new NotFoundError('Incident', id);
      return rowToIncident(result.rows[0]);
    });
  }

  async resolve(
    ctx: TenantContext,
    id: string,
    rootCause: string,
    correctiveActions: string
  ): Promise<Incident> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_operations.incidents
         SET incident_status = 'resolved', resolved_at = now(),
             root_cause = $2, corrective_actions = $3, version = version + 1
         WHERE id = $1
         RETURNING *`,
        [id, rootCause, correctiveActions]
      );
      if (result.rows.length === 0) throw new NotFoundError('Incident', id);
      return rowToIncident(result.rows[0]);
    });
  }
}
