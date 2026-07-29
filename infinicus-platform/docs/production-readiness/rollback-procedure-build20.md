# BUILD-20 — Customer Decision Workflows: Rollback Procedure

## Database rollback

This build added **zero migrations** — no schema, table, column, or RLS
policy was created or modified. The only database-adjacent changes are
six additive read methods on existing repository classes (plain
`SELECT ... WHERE business_id = $1` queries against already-existing,
already-indexed columns). There is nothing to roll back at the database
level; deleting these methods (via the application-code rollback below)
fully reverses this build's database-layer footprint.

## Application-code rollback

Because this build touched no migration and no existing repository
method's behavior, rolling back is a plain revert of this build's
commits:

```bash
git revert <BUILD-20 implementation commit> <BUILD-20 report/queue commit>
```

This removes:
- `packages/workflow` (new package, no other package depends on it).
- The six additive `listForBusiness`/`listForWorkspace` methods (purely
  additive — reverting them cannot break any existing caller, since
  nothing outside this build's own new code calls them).
- `apps/web`'s Next.js application (reverting restores the prior bare
  TypeScript placeholder `src/index.ts`).
- The `turbo.json` and `.gitignore` additions (`@infinicus/web#build`
  task override, `.next/`/`next-env.d.ts` ignores).

No data migration, backfill, or coordinated deploy sequencing is
required in either direction.

## Verifying a rollback

After rollback, confirm:

```bash
# packages/workflow should no longer exist
test ! -d infinicus-platform/packages/workflow && echo "workflow package removed"

# apps/web should be back to a plain TypeScript placeholder
grep -q '"next"' infinicus-platform/apps/web/package.json && echo "STILL HAS NEXT (rollback incomplete)" || echo "next dependency removed"
```

and re-run the full `@infinicus/database` regression suite to confirm no
other domain was affected (it wasn't touched by this build's additive
methods, so this is a sanity check, not an expectation of change).
