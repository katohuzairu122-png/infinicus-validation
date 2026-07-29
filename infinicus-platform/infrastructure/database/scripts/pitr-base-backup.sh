#!/usr/bin/env bash
# BUILD-22 — Take a physical base backup for point-in-time recovery.
# Requires WAL archiving to already be enabled (enable-wal-archiving.sh).
#
# Usage:
#   PGCLUSTER_VERSION=16 PGCLUSTER_NAME=main \
#   BASE_BACKUP_DIR="/var/lib/postgresql/pitr_base" \
#     ./pitr-base-backup.sh
#
# Output: BASE_BACKUP_DIR, a full physical copy of the cluster's data
# directory as of the moment the backup completed, suitable as the
# starting point for pitr-restore.sh's WAL replay.

set -euo pipefail

PGCLUSTER_VERSION="${PGCLUSTER_VERSION:-16}"
PGCLUSTER_NAME="${PGCLUSTER_NAME:-main}"
BASE_BACKUP_DIR="${BASE_BACKUP_DIR:-/var/lib/postgresql/pitr_base}"

if [[ -e "$BASE_BACKUP_DIR" ]]; then
  echo "ERROR: ${BASE_BACKUP_DIR} already exists — remove it first (a base backup target directory must be empty)." >&2
  exit 1
fi

ACTUAL_MODE=$(sudo -u postgres psql -tAc "SHOW archive_mode;")
if [[ "$ACTUAL_MODE" != "on" ]]; then
  echo "ERROR: archive_mode is '${ACTUAL_MODE}', not 'on' — run enable-wal-archiving.sh first." >&2
  exit 1
fi

echo "Taking base backup into ${BASE_BACKUP_DIR} ..."
sudo -u postgres pg_basebackup -D "$BASE_BACKUP_DIR" --format=plain --wal-method=stream --checkpoint=fast --progress

echo "Base backup complete: ${BASE_BACKUP_DIR} ($(du -sh "$BASE_BACKUP_DIR" | cut -f1))"
