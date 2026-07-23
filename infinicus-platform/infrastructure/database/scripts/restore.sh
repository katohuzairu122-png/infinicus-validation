#!/usr/bin/env bash
# BUILD-22 — Restore a pg_dump custom-format backup (produced by
# backup.sh) into a target database.
#
# Usage:
#   MAINTENANCE_DATABASE_URL="postgresql://admin:pass@host:5432/postgres" \
#   TARGET_DATABASE_URL="postgresql://admin:pass@host:5432/infinicus_restore_test" \
#     ./restore.sh /path/to/infinicus-infinicus_test-20260723T085046Z.dump
#
# Required:
#   MAINTENANCE_DATABASE_URL — connection string with CREATEDB privilege,
#     pointed at any database OTHER than the restore target (typically
#     the `postgres` maintenance database) — CREATE DATABASE cannot run
#     against the database it is creating.
#   TARGET_DATABASE_URL      — connection string for the (new) database
#     to restore into. Its database name is extracted and created via
#     MAINTENANCE_DATABASE_URL before pg_restore runs against it
#     directly. Refuses to run if this database already exists, to avoid
#     silently overwriting a live database — drop it first if that is
#     genuinely intended.
#   $1                        — path to the backup file to restore.
#
# Exit code: 0 on success, non-zero if the restore could not proceed at
# all (missing args, target already exists, or pg_restore fails outright).

set -euo pipefail

if [[ -z "${MAINTENANCE_DATABASE_URL:-}" ]]; then
  echo "ERROR: MAINTENANCE_DATABASE_URL is required" >&2
  exit 1
fi
if [[ -z "${TARGET_DATABASE_URL:-}" ]]; then
  echo "ERROR: TARGET_DATABASE_URL is required" >&2
  exit 1
fi
BACKUP_FILE="${1:-}"
if [[ -z "$BACKUP_FILE" || ! -f "$BACKUP_FILE" ]]; then
  echo "ERROR: usage: $0 <path-to-backup-file>" >&2
  exit 1
fi

TARGET_DB=$(psql "$TARGET_DATABASE_URL" -tAc "SELECT current_database()" 2>/dev/null || true)
if [[ -z "$TARGET_DB" ]]; then
  # Target database doesn't exist yet (connection failed) — extract its
  # name from the URL's path component to create it.
  TARGET_DB=$(basename "${TARGET_DATABASE_URL%%\?*}")
else
  echo "ERROR: database '${TARGET_DB}' already exists — refusing to restore over a live database. Drop it first if that is intended." >&2
  exit 1
fi

echo "Creating database '${TARGET_DB}' ..."
psql "$MAINTENANCE_DATABASE_URL" -c "CREATE DATABASE ${TARGET_DB}"

echo "Restoring ${BACKUP_FILE} into '${TARGET_DB}' ..."
pg_restore \
  --dbname="$TARGET_DATABASE_URL" \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  "$BACKUP_FILE"

echo "Restore complete: ${TARGET_DB}"
