#!/usr/bin/env bash
# BUILD-22 — Logical backup of the INFINICUS PostgreSQL database.
#
# Produces a single pg_dump custom-format (-Fc) archive: compressed,
# restorable with pg_restore (supports parallel restore and selective
# table/schema restore), and self-describing (pg_restore --list works
# without needing the original database).
#
# Usage:
#   DATABASE_URL="postgresql://user:pass@host:5432/dbname" \
#   BACKUP_DIR="/path/to/backups" \
#     ./backup.sh
#
# Required:
#   DATABASE_URL — connection string for the database to back up. Must be a
#     role with read access to every schema (e.g. the admin/migration role
#     used elsewhere in this repo, not the RLS-restricted application
#     role) — the least-privilege app role deliberately has no grant on
#     bookkeeping tables like _migrations, and pg_dump needs to lock and
#     read every table in the database to produce a complete backup.
# Optional:
#   BACKUP_DIR   — directory backups are written to (default: ./backups).
#
# Output: $BACKUP_DIR/infinicus-<dbname>-<UTC timestamp>.dump
# Exit code: 0 on success, non-zero on any pg_dump failure (fail loud, not silent).

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is required" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

DB_NAME=$(psql "$DATABASE_URL" -tAc "SELECT current_database();")
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUTPUT_FILE="$BACKUP_DIR/infinicus-${DB_NAME}-${TIMESTAMP}.dump"

echo "Backing up '${DB_NAME}' to ${OUTPUT_FILE} ..."
pg_dump "$DATABASE_URL" \
  --format=custom \
  --compress=6 \
  --no-owner \
  --no-privileges \
  --file="$OUTPUT_FILE"

echo "Backup complete: ${OUTPUT_FILE} ($(du -h "$OUTPUT_FILE" | cut -f1))"
echo "$OUTPUT_FILE"
