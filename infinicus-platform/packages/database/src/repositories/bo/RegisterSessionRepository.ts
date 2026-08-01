import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError, ConflictError } from './errors.js';

export interface OpenRegisterSessionInput {
  businessId: string;
  openingCash: number;
  registerName?: string;
  openedBy?: string;
  notes?: string;
}

export interface CloseRegisterSessionInput {
  closingCash: number;
  closedBy?: string;
  notes?: string;
}

export interface RegisterSession {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  registerName: string;
  status: 'open' | 'closed';
  openedBy: string | null;
  closedBy: string | null;
  openingCash: number;
  closingCash: number | null;
  expectedCash: number | null;
  variance: number | null;
  notes: string | null;
  openedAt: Date;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function round2(n: number): number {
  return Math.round((n || 0) * 100) / 100;
}

function rowToSession(row: Record<string, unknown>): RegisterSession {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    registerName: row.register_name as string,
    status: row.status as 'open' | 'closed',
    openedBy: row.opened_by as string | null,
    closedBy: row.closed_by as string | null,
    openingCash: parseFloat(String(row.opening_cash)),
    closingCash: row.closing_cash === null ? null : parseFloat(String(row.closing_cash)),
    expectedCash: row.expected_cash === null ? null : parseFloat(String(row.expected_cash)),
    variance: row.variance === null ? null : parseFloat(String(row.variance)),
    notes: row.notes as string | null,
    openedAt: row.opened_at as Date,
    closedAt: row.closed_at as Date | null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

/**
 * Register/shift open-close and cash reconciliation — the first slice of
 * the POS/Commerce buildout (see the "Foodics-comparable" build spec):
 * before orders or payments can exist, a business needs a real register
 * session to operate against. expected_cash/variance are computed at
 * close time from business_events sale totals during the session window,
 * treating every sale as cash-equivalent — business_events has no
 * payment-method field yet, so a real cash/card split is a later
 * increment once orders/payments exist, not assumed here.
 */
export class RegisterSessionRepository {
  async open(ctx: TenantContext, input: OpenRegisterSessionInput): Promise<RegisterSession> {
    return withTenantTransaction(ctx, async (client) => {
      const existing = await client.query(
        `SELECT id FROM business_operations.register_sessions WHERE business_id = $1 AND status = 'open'`,
        [input.businessId]
      );
      if (existing.rows.length > 0) {
        throw new ConflictError('RegisterSession', `a register session is already open for business ${input.businessId}`);
      }
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_operations.register_sessions
           (tenant_id, workspace_id, business_id, register_name, opened_by, opening_cash, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING *`,
        [
          ctx.tenantId, ctx.workspaceId, input.businessId,
          input.registerName ?? 'Main Register', input.openedBy ?? null,
          input.openingCash, input.notes ?? null,
        ]
      );
      return rowToSession(result.rows[0]);
    });
  }

  async getOpen(ctx: TenantContext, businessId: string): Promise<RegisterSession | null> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM business_operations.register_sessions WHERE business_id = $1 AND status = 'open'`,
        [businessId]
      );
      return result.rows.length === 0 ? null : rowToSession(result.rows[0]);
    });
  }

  async close(ctx: TenantContext, sessionId: string, input: CloseRegisterSessionInput): Promise<RegisterSession> {
    return withTenantTransaction(ctx, async (client) => {
      const existing = await client.query<Record<string, unknown>>(
        `SELECT * FROM business_operations.register_sessions WHERE id = $1`,
        [sessionId]
      );
      if (existing.rows.length === 0) throw new NotFoundError('RegisterSession', sessionId);
      const session = rowToSession(existing.rows[0]);
      if (session.status === 'closed') {
        throw new ConflictError('RegisterSession', `session ${sessionId} is already closed`);
      }

      const salesDuring = await client.query<Record<string, unknown>>(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM business_operations.business_events
         WHERE business_id = $1 AND event_type = 'sale' AND occurred_at >= $2`,
        [session.businessId, session.openedAt]
      );
      const salesTotal = round2(Number(salesDuring.rows[0]?.total ?? 0));
      const expectedCash = round2(session.openingCash + salesTotal);
      const variance = round2(input.closingCash - expectedCash);

      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_operations.register_sessions SET
           status        = 'closed',
           closing_cash  = $2,
           expected_cash = $3,
           variance      = $4,
           closed_by     = $5,
           notes         = COALESCE($6, notes),
           closed_at     = now()
         WHERE id = $1
         RETURNING *`,
        [sessionId, input.closingCash, expectedCash, variance, input.closedBy ?? null, input.notes ?? null]
      );
      return rowToSession(result.rows[0]);
    });
  }

  async list(ctx: TenantContext, businessId: string, limit = 20): Promise<RegisterSession[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM business_operations.register_sessions
         WHERE business_id = $1
         ORDER BY opened_at DESC
         LIMIT $2`,
        [businessId, limit]
      );
      return result.rows.map(rowToSession);
    });
  }
}
