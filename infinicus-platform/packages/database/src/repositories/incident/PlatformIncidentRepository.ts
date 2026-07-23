import { withTransaction } from '../../client.js';
import { PlatformIncidentNotFoundError, PlatformIncidentAlreadyResolvedError } from './errors.js';

export type PlatformIncidentSeverity = 'sev1' | 'sev2' | 'sev3' | 'sev4';
export type PlatformIncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';

export interface PlatformIncident {
  id: string;
  severity: PlatformIncidentSeverity;
  title: string;
  description: string;
  status: PlatformIncidentStatus;
  affectedSystems: string[];
  affectedTenantIds: string[];
  declaredBy: string;
  postmortemUrl: string | null;
  correlationId: string;
  declaredAt: Date;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformIncidentUpdate {
  id: string;
  incidentId: string;
  message: string;
  statusAtUpdate: PlatformIncidentStatus;
  isCustomerFacing: boolean;
  postedBy: string;
  correlationId: string;
  postedAt: Date;
}

export interface DeclarePlatformIncidentInput {
  severity: PlatformIncidentSeverity;
  title: string;
  description: string;
  declaredBy: string;
  affectedSystems?: string[];
  affectedTenantIds?: string[];
}

function rowToIncident(row: Record<string, unknown>): PlatformIncident {
  return {
    id: row.id as string,
    severity: row.severity as PlatformIncidentSeverity,
    title: row.title as string,
    description: row.description as string,
    status: row.status as PlatformIncidentStatus,
    affectedSystems: row.affected_systems as string[],
    affectedTenantIds: row.affected_tenant_ids as string[],
    declaredBy: row.declared_by as string,
    postmortemUrl: (row.postmortem_url as string | null) ?? null,
    correlationId: row.correlation_id as string,
    declaredAt: row.declared_at as Date,
    resolvedAt: (row.resolved_at as Date | null) ?? null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

function rowToUpdate(row: Record<string, unknown>): PlatformIncidentUpdate {
  return {
    id: row.id as string,
    incidentId: row.incident_id as string,
    message: row.message as string,
    statusAtUpdate: row.status_at_update as PlatformIncidentStatus,
    isCustomerFacing: row.is_customer_facing as boolean,
    postedBy: row.posted_by as string,
    correlationId: row.correlation_id as string,
    postedAt: row.posted_at as Date,
  };
}

/**
 * platform.incidents/incident_updates have no RLS — a platform incident
 * record is operator/on-call metadata, not tenant business data (same
 * reasoning as platform.deployment_events, see DeploymentEventRepository).
 * No outbox emission (events.outbox_events.tenant_id is NOT NULL — see
 * migration 0156's own comment).
 *
 * Named PlatformIncident*, not Incident*, to avoid colliding with the
 * pre-existing business_operations.incidents domain (BUILD-08) — a
 * distinct concept (an operational/workplace incident within a tenant's
 * business, e.g. business_operations.IncidentRepository) from this
 * build's platform/system incident (an outage, security event, etc.).
 */
export class PlatformIncidentRepository {
  /** Declares a new incident and writes its first timeline entry atomically. */
  async declare(input: DeclarePlatformIncidentInput): Promise<{ incident: PlatformIncident; firstUpdate: PlatformIncidentUpdate }> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO platform.incidents (severity, title, description, declared_by, affected_systems, affected_tenant_ids)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [
          input.severity, input.title, input.description, input.declaredBy,
          JSON.stringify(input.affectedSystems ?? []), input.affectedTenantIds ?? [],
        ]
      );
      const incident = rowToIncident(result.rows[0]);

      const updateResult = await client.query<Record<string, unknown>>(
        `INSERT INTO platform.incident_updates (incident_id, message, status_at_update, is_customer_facing, posted_by)
         VALUES ($1,$2,'investigating',$3,$4)
         RETURNING *`,
        [incident.id, `Incident declared: ${input.title}`, false, input.declaredBy]
      );
      return { incident, firstUpdate: rowToUpdate(updateResult.rows[0]) };
    });
  }

  async getById(id: string): Promise<PlatformIncident> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM platform.incidents WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new PlatformIncidentNotFoundError('PlatformIncident', id);
      return rowToIncident(result.rows[0]);
    });
  }

  async listActive(): Promise<PlatformIncident[]> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM platform.incidents WHERE status <> 'resolved' ORDER BY declared_at DESC`
      );
      return result.rows.map(rowToIncident);
    });
  }

  async listBySeverity(severity: PlatformIncidentSeverity): Promise<PlatformIncident[]> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM platform.incidents WHERE severity = $1 ORDER BY declared_at DESC`, [severity]
      );
      return result.rows.map(rowToIncident);
    });
  }

  /**
   * Adds a timeline entry and keeps the incident's own `status` column in
   * sync with the entry's statusAtUpdate — the status column is a
   * denormalized "current status" convenience over the append-only
   * timeline, not a second source of truth.
   */
  async addUpdate(
    incidentId: string, message: string, statusAtUpdate: PlatformIncidentStatus, postedBy: string, isCustomerFacing = false
  ): Promise<PlatformIncidentUpdate> {
    return withTransaction(async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT status FROM platform.incidents WHERE id = $1', [incidentId]);
      if (current.rows.length === 0) throw new PlatformIncidentNotFoundError('PlatformIncident', incidentId);
      if (current.rows[0].status === 'resolved') throw new PlatformIncidentAlreadyResolvedError(incidentId);

      const updateResult = await client.query<Record<string, unknown>>(
        `INSERT INTO platform.incident_updates (incident_id, message, status_at_update, is_customer_facing, posted_by)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING *`,
        [incidentId, message, statusAtUpdate, isCustomerFacing, postedBy]
      );
      await client.query(`UPDATE platform.incidents SET status = $2 WHERE id = $1`, [incidentId, statusAtUpdate]);
      return rowToUpdate(updateResult.rows[0]);
    });
  }

  async resolve(incidentId: string, resolvedBy: string, postmortemUrl: string | null = null): Promise<PlatformIncident> {
    return withTransaction(async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT status FROM platform.incidents WHERE id = $1', [incidentId]);
      if (current.rows.length === 0) throw new PlatformIncidentNotFoundError('PlatformIncident', incidentId);
      if (current.rows[0].status === 'resolved') throw new PlatformIncidentAlreadyResolvedError(incidentId);

      const result = await client.query<Record<string, unknown>>(
        `UPDATE platform.incidents SET status = 'resolved', resolved_at = now(), postmortem_url = $2 WHERE id = $1 RETURNING *`,
        [incidentId, postmortemUrl]
      );
      await client.query(
        `INSERT INTO platform.incident_updates (incident_id, message, status_at_update, is_customer_facing, posted_by)
         VALUES ($1,'Incident resolved','resolved',$2,$3)`,
        [incidentId, true, resolvedBy]
      );
      return rowToIncident(result.rows[0]);
    });
  }

  async listUpdates(incidentId: string): Promise<PlatformIncidentUpdate[]> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM platform.incident_updates WHERE incident_id = $1 ORDER BY posted_at', [incidentId]
      );
      return result.rows.map(rowToUpdate);
    });
  }
}
