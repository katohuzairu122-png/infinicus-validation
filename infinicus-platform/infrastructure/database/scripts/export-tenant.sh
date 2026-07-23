#!/usr/bin/env bash
# BUILD-22 — Export one tenant's full data footprint as a human-readable
# SQL dump, for data-portability / "right to export" requests.
#
# Reuses the exact same RLS mechanism every domain repository already
# relies on (current_setting('app.tenant_id', true)) instead of building
# a second, parallel notion of "which tables belong to a tenant" — the
# set of tenant-scoped tables is discovered dynamically from Postgres's
# own pg_policies catalog (every table with an RLS policy referencing
# app.tenant_id), so this script never drifts out of sync as new domains
# are added. Platform-wide, non-tenant-scoped tables (e.g. identity.users
# — a user's global identity, not tenant data; a user can belong to
# multiple tenants via tenancy.memberships) are correctly excluded, since
# they carry no such policy.
#
# Usage:
#   DATABASE_URL="postgresql://app_test_user:pw@host:5432/db" \
#   TENANT_ID="<uuid>" \
#   OUTPUT_FILE="/path/to/export.sql" \
#     ./export-tenant.sh
#
# Required:
#   DATABASE_URL — must be an RLS-restricted role (the application role,
#     NOT an admin/superuser or BYPASSRLS role — a superuser connection
#     bypasses row-level security entirely regardless of
#     --enable-row-security, and would export every tenant's data).
#   TENANT_ID    — the tenant to export.
# Optional:
#   OUTPUT_FILE  — default: ./tenant-<TENANT_ID>-<UTC timestamp>.sql

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is required" >&2
  exit 1
fi
if [[ -z "${TENANT_ID:-}" ]]; then
  echo "ERROR: TENANT_ID is required" >&2
  exit 1
fi

TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUTPUT_FILE="${OUTPUT_FILE:-./tenant-${TENANT_ID}-${TIMESTAMP}.sql}"

# A superuser or BYPASSRLS role ignores row-level security entirely,
# regardless of --enable-row-security — running this script as one would
# silently export every tenant's data instead of just TENANT_ID's. Refuse
# up front rather than producing a cross-tenant data leak that looks like
# a correctly-scoped export.
IS_RLS_EXEMPT=$(psql "$DATABASE_URL" -tAc "SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname = current_user;")
if [[ "$IS_RLS_EXEMPT" == "t" ]]; then
  echo "ERROR: the connecting role bypasses row-level security (superuser or BYPASSRLS) — refusing to export, since this would leak every tenant's data instead of just TENANT_ID's. Use the RLS-restricted application role instead." >&2
  exit 1
fi

echo "Discovering tenant-scoped tables (RLS policies referencing app.tenant_id) ..."
TABLES=$(psql "$DATABASE_URL" -tAc "
  SELECT schemaname || '.' || tablename FROM pg_policies WHERE qual LIKE '%app.tenant_id%' ORDER BY 1;
")
TABLE_COUNT=$(echo "$TABLES" | grep -c . || true)
if [[ "$TABLE_COUNT" -eq 0 ]]; then
  echo "ERROR: no tenant-scoped tables discovered — refusing to produce an empty/suspicious export" >&2
  exit 1
fi
echo "Found ${TABLE_COUNT} tenant-scoped tables."

TABLE_ARGS=()
while IFS= read -r table; do
  [[ -n "$table" ]] && TABLE_ARGS+=(--table="$table")
done <<< "$TABLES"

echo "Exporting tenant ${TENANT_ID} to ${OUTPUT_FILE} ..."
PGOPTIONS="-c app.tenant_id=${TENANT_ID}" pg_dump "$DATABASE_URL" \
  --data-only \
  --enable-row-security \
  --no-owner \
  --no-privileges \
  --format=plain \
  "${TABLE_ARGS[@]}" \
  --file="$OUTPUT_FILE"

echo "Export complete: ${OUTPUT_FILE} ($(du -h "$OUTPUT_FILE" | cut -f1))"
echo "$OUTPUT_FILE"
