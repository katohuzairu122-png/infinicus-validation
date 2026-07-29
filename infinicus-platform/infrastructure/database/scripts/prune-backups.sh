#!/usr/bin/env bash
# BUILD-22 — Enforce a retention policy over backup.sh's output directory:
# delete any backup file older than BACKUP_RETENTION_DAYS.
#
# Usage:
#   BACKUP_DIR="/path/to/backups" BACKUP_RETENTION_DAYS=30 ./prune-backups.sh
#   BACKUP_DIR="/path/to/backups" BACKUP_RETENTION_DAYS=30 ./prune-backups.sh --dry-run
#
# Required:
#   BACKUP_DIR — directory backup.sh writes into.
# Optional:
#   BACKUP_RETENTION_DAYS — default 30.
#   --dry-run              — list what would be deleted without deleting.
#
# Only touches files matching backup.sh's own naming convention
# (infinicus-*.dump), so running this against a shared directory never
# risks deleting an unrelated file.

set -euo pipefail

if [[ -z "${BACKUP_DIR:-}" ]]; then
  echo "ERROR: BACKUP_DIR is required" >&2
  exit 1
fi
if [[ ! -d "$BACKUP_DIR" ]]; then
  echo "ERROR: BACKUP_DIR '${BACKUP_DIR}' does not exist" >&2
  exit 1
fi

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

echo "Pruning backups older than ${RETENTION_DAYS} days in ${BACKUP_DIR} ..."

DELETED=0
KEPT=0
while IFS= read -r -d '' file; do
  if [[ "$DRY_RUN" == true ]]; then
    echo "  would delete: ${file}"
  else
    echo "  delete: ${file}"
    rm -f "$file"
  fi
  DELETED=$((DELETED + 1))
done < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'infinicus-*.dump' -mtime "+${RETENTION_DAYS}" -print0)

KEPT=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'infinicus-*.dump' -mtime "-${RETENTION_DAYS}" | wc -l)

if [[ "$DRY_RUN" == true ]]; then
  echo "Dry run complete: ${DELETED} would be deleted, ${KEPT} would be kept."
else
  echo "Prune complete: ${DELETED} deleted, ${KEPT} kept."
fi
