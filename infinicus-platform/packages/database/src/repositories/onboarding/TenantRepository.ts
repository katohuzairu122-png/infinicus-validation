import { randomUUID } from 'node:crypto';
import { withTransaction } from '../../client.js';
import { TenantNotFoundError, TenantSlugConflictError } from './errors.js';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  planCode: string | null;
  defaultTimezone: string;
  defaultCurrency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  planCode?: string;
  createdBy: string;
}

function rowToTenant(row: Record<string, unknown>): Tenant {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    status: row.status as string,
    planCode: row.plan_code as string | null,
    defaultTimezone: row.default_timezone as string,
    defaultCurrency: row.default_currency as string,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

function isUniqueViolation(err: unknown, constraint: string): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === '23505'
    && 'constraint' in err && (err as { constraint: unknown }).constraint === constraint;
}

/**
 * tenancy.tenants' RLS policy (tenants_isolation) checks `id =
 * current_setting('app.tenant_id')` — the only way to satisfy it for a
 * brand-new tenant is to generate its id client-side and set the session
 * variable to that exact value before the insert, which create() does.
 * Slug availability cannot be pre-checked via a SELECT (RLS fail-closed
 * hides every tenant except the caller's own) — uniqueness is enforced by
 * catching the database's own unique-constraint violation instead.
 */
export class TenantRepository {
  async create(input: CreateTenantInput): Promise<Tenant> {
    const id = randomUUID();
    return withTransaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', id]);
      await client.query('SELECT set_config($1, $2, true)', ['app.user_id', input.createdBy]);
      try {
        const result = await client.query<Record<string, unknown>>(
          `INSERT INTO tenancy.tenants (id, name, slug, plan_code, created_by)
           VALUES ($1,$2,$3,$4,$5) RETURNING *`,
          [id, input.name, input.slug, input.planCode ?? null, input.createdBy]
        );
        return rowToTenant(result.rows[0]);
      } catch (err) {
        if (isUniqueViolation(err, 'tenants_slug_key')) {
          throw new TenantSlugConflictError('Tenant', `slug already taken: ${input.slug}`);
        }
        throw err;
      }
    });
  }

  /** Requires the caller's session to already be scoped to this tenant (app.tenant_id = id). */
  async getById(id: string): Promise<Tenant> {
    return withTransaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', id]);
      const result = await client.query<Record<string, unknown>>('SELECT * FROM tenancy.tenants WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new TenantNotFoundError('Tenant', id);
      return rowToTenant(result.rows[0]);
    });
  }
}
