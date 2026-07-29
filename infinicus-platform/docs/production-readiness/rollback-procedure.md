# BUILD-18 — Authentication and Authorization: Rollback Procedure

## Database rollback

This build's only database change is the single seed migration
`0137_seed_auth_roles_permissions.sql`. It performs only
`INSERT … ON CONFLICT DO NOTHING` statements against the pre-existing
`tenancy.permissions`, `tenancy.roles`, and `tenancy.role_permissions`
tables — it creates no tables, columns, indexes, or constraints, and
drops nothing.

To roll back the seed data only (leaving the frozen `0001`–`0136` schema
untouched):

```sql
BEGIN;
DELETE FROM tenancy.role_permissions
  WHERE role_id IN (SELECT id FROM tenancy.roles WHERE tenant_id IS NULL AND is_system = true);
DELETE FROM tenancy.roles WHERE tenant_id IS NULL AND is_system = true;
DELETE FROM tenancy.permissions
  WHERE code IN (
    'da:read','da:write','da:admin','bo:read','bo:write','bo:admin',
    'bi:read','bi:write','bi:admin','dt:read','dt:write','dt:admin',
    'sim:read','sim:write','sim:admin','adi:read','adi:write','adi:admin',
    'aba:read','aba:write','aba:admin','om:read','om:write','om:admin',
    'cl:read','cl:write','cl:admin','platform:member_manage','platform:admin'
  );
DELETE FROM _migrations WHERE filename = '0137_seed_auth_roles_permissions.sql';
COMMIT;
```

**Caution:** if any tenant-scoped membership already has a
`membership_roles` row pointing at one of the deleted system roles, the
first `DELETE FROM tenancy.roles` will fail on the foreign key rather
than silently orphaning data (fail-closed by construction — no
`ON DELETE CASCADE` exists on that relationship). Resolve any such
memberships (reassign or remove the role grant) before rolling back.

This is a low-risk rollback: the seed data has no dependents until an
application actually assigns a system role to a membership, which this
build itself does not do automatically for any existing account.

## Application-code rollback

Because this build introduced no schema changes beyond the seed data,
rolling back the application code is a plain revert of this build's
commits — no data migration, backfill, or coordinated deploy sequencing
is required. The three new/changed packages
(`@infinicus/database`'s `repositories/auth/*`,
`@infinicus/authentication`, `@infinicus/authorization`) are additive:
no existing export, repository, or table from any prior build (BI, DT,
SIM, ADI, ABA, OM, CL, or the Stage 1 foundation) was modified.

```bash
git revert <BUILD-18 implementation commit> <BUILD-18 report/queue commit>
```

## Verifying a rollback

After rollback, confirm:

```sql
SELECT count(*) FROM tenancy.permissions;                                  -- back to pre-BUILD-18 count
SELECT count(*) FROM tenancy.roles WHERE tenant_id IS NULL AND is_system;  -- 0
SELECT filename FROM _migrations WHERE filename = '0137_seed_auth_roles_permissions.sql'; -- 0 rows
```

and re-run the full `@infinicus/database` regression suite to confirm no
other domain was affected (it wasn't touched by this build, so this is
a sanity check, not an expectation of change).
