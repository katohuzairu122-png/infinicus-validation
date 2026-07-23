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

# Most tenant-scoped tables' RLS policy ANDs a second predicate —
# workspace_id = current_setting('app.workspace_id', true)::uuid — not
# just tenant_id. A single pg_dump pass with only app.tenant_id set (the
# original approach) leaves that second predicate comparing against NULL
# for every one of those tables, so RLS silently admits zero rows and
# pg_dump produces an empty COPY block for them — no error, just an
# incomplete export (found live during BUILD-27 testing, alongside the
# identical gap in delete-tenant-data.mjs). Tables requiring
# app.workspace_id must be dumped once per workspace the tenant owns,
# with both session variables set for each pass; the results are
# appended into the same output file.
WORKSPACE_SCOPED_TABLES=$(psql "$DATABASE_URL" -tAc "
  SELECT DISTINCT schemaname || '.' || tablename FROM pg_policies
  WHERE qual LIKE '%app.tenant_id%' AND qual LIKE '%app.workspace_id%' ORDER BY 1;
")
TENANT_ONLY_TABLES=$(comm -23 <(echo "$TABLES" | sort) <(echo "$WORKSPACE_SCOPED_TABLES" | sort))
WORKSPACE_IDS=$(psql "$DATABASE_URL" -tAc "SELECT id FROM tenancy.workspaces WHERE tenant_id = '${TENANT_ID}';" \
  --set=app.tenant_id="${TENANT_ID}" 2>/dev/null || true)
if [[ -z "$WORKSPACE_IDS" ]]; then
  WORKSPACE_IDS=$(PGOPTIONS="-c app.tenant_id=${TENANT_ID}" psql "$DATABASE_URL" -tAc "SELECT id FROM tenancy.workspaces WHERE tenant_id = '${TENANT_ID}';")
fi

echo "Exporting tenant ${TENANT_ID} to ${OUTPUT_FILE} ..."
: > "$OUTPUT_FILE"

if [[ -n "$(echo "$TENANT_ONLY_TABLES" | grep -c . || true)" ]] && [[ "$(echo "$TENANT_ONLY_TABLES" | grep -c . || true)" -gt 0 ]]; then
  TENANT_ONLY_ARGS=()
  while IFS= read -r table; do
    [[ -n "$table" ]] && TENANT_ONLY_ARGS+=(--table="$table")
  done <<< "$TENANT_ONLY_TABLES"
  PGOPTIONS="-c app.tenant_id=${TENANT_ID}" pg_dump "$DATABASE_URL" \
    --data-only --enable-row-security --no-owner --no-privileges --format=plain \
    "${TENANT_ONLY_ARGS[@]}" >> "$OUTPUT_FILE"
fi

if [[ "$(echo "$WORKSPACE_SCOPED_TABLES" | grep -c . || true)" -gt 0 ]]; then
  WORKSPACE_SCOPED_ARGS=()
  while IFS= read -r table; do
    [[ -n "$table" ]] && WORKSPACE_SCOPED_ARGS+=(--table="$table")
  done <<< "$WORKSPACE_SCOPED_TABLES"
  while IFS= read -r ws; do
    [[ -z "$ws" ]] && continue
    PGOPTIONS="-c app.tenant_id=${TENANT_ID} -c app.workspace_id=${ws}" pg_dump "$DATABASE_URL" \
      --data-only --enable-row-security --no-owner --no-privileges --format=plain \
      "${WORKSPACE_SCOPED_ARGS[@]}" >> "$OUTPUT_FILE"
  done <<< "$WORKSPACE_IDS"
fi

echo "Export complete: ${OUTPUT_FILE} ($(du -h "$OUTPUT_FILE" | cut -f1))"
echo "$OUTPUT_FILE"
