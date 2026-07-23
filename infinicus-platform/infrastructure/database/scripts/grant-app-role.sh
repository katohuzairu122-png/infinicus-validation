#!/usr/bin/env bash
# BUILD-23 — Grants the least-privilege application role usage/CRUD
# access to every actively-used schema in a freshly migrated database.
#
# Migrations deliberately contain no GRANT statements anywhere in this
# repository (role provisioning is environment-specific, not part of
# the versioned schema — see every migration file's own absence of
# GRANT). Throughout this project's development this grant step was
# applied by hand, live, against one long-lived local database — never
# a problem until an automated pipeline (this build's CI workflow) needs
# a *fresh*, ephemeral database on every run. This script is that
# missing, now-scripted, idempotent step.
#
# Deliberately excludes the `public` schema: it holds only vestigial
# tables from the very first scaffolding migration (0001_foundation.sql)
# — _migrations plus a handful of superseded duplicates
# (public.tenants/users/businesses/etc.) that every real domain has its
# own properly namespaced replacement for (tenancy.tenants,
# identity.users, platform.businesses, ...). The application role has
# never had — and should not have — access to public schema; granting
# it broadly would silently re-expose _migrations, which every prior
# build's own testing (see backup.sh's requirements) established as
# deliberately off-limits to the app role.
#
# Usage:
#   ADMIN_DATABASE_URL="postgresql://<admin-role>:<pw>@<host>:5432/<db>" \
#   APP_ROLE="app_test_user" \
#     ./grant-app-role.sh

set -euo pipefail

if [[ -z "${ADMIN_DATABASE_URL:-}" ]]; then
  echo "ERROR: ADMIN_DATABASE_URL is required" >&2
  exit 1
fi
APP_ROLE="${APP_ROLE:-app_test_user}"

SCHEMAS=$(psql "$ADMIN_DATABASE_URL" -tAc "
  SELECT schema_name FROM information_schema.schemata
  WHERE schema_name NOT IN ('pg_catalog','information_schema','pg_toast','public')
    AND schema_name NOT LIKE 'pg_temp%' AND schema_name NOT LIKE 'pg_toast_temp%'
  ORDER BY 1;
")

if [[ -z "$SCHEMAS" ]]; then
  echo "ERROR: no schemas found — has the database been migrated yet?" >&2
  exit 1
fi

for schema in $SCHEMAS; do
  echo "Granting ${APP_ROLE} access to schema ${schema} ..."
  psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 -v schema="$schema" -v role="$APP_ROLE" <<'SQL'
GRANT USAGE ON SCHEMA :"schema" TO :"role";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA :"schema" TO :"role";
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA :"schema" TO :"role";
ALTER DEFAULT PRIVILEGES IN SCHEMA :"schema" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"role";
ALTER DEFAULT PRIVILEGES IN SCHEMA :"schema" GRANT EXECUTE ON FUNCTIONS TO :"role";
SQL
done

echo "Granted ${APP_ROLE} access to $(echo "$SCHEMAS" | wc -l) schemas."
