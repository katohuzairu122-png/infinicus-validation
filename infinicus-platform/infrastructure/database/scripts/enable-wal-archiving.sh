#!/usr/bin/env bash
# BUILD-22 — Enable continuous WAL archiving on a PostgreSQL 16 cluster,
# the prerequisite for point-in-time recovery (PITR). Must be run with
# privileges to ALTER SYSTEM and restart the cluster (typically as the
# `postgres` OS user, or root via sudo -u postgres).
#
# Usage:
#   PGCLUSTER_VERSION=16 PGCLUSTER_NAME=main \
#   ARCHIVE_DIR="/var/lib/postgresql/wal_archive" \
#     ./enable-wal-archiving.sh
#
# What this does:
#   1. Creates ARCHIVE_DIR (owned by the postgres OS user).
#   2. ALTER SYSTEM SET archive_mode = 'on'
#   3. ALTER SYSTEM SET archive_command to copy each completed WAL segment
#      into ARCHIVE_DIR (refusing to overwrite a segment that's already
#      archived, per PostgreSQL's own documented archive_command contract).
#   4. Restarts the cluster (archive_mode is not reloadable; a restart is
#      required for it to take effect — this cannot be done with a plain
#      reload).
#
# wal_level must already be at least 'replica' (PostgreSQL 16's default) —
# this script does not change it, since changing wal_level also requires a
# restart and this repository's disposable local test cluster already runs
# at 'replica'.
#
# To reverse: see disable-wal-archiving.sh.

set -euo pipefail

PGCLUSTER_VERSION="${PGCLUSTER_VERSION:-16}"
PGCLUSTER_NAME="${PGCLUSTER_NAME:-main}"
ARCHIVE_DIR="${ARCHIVE_DIR:-/var/lib/postgresql/wal_archive}"

echo "Creating archive directory ${ARCHIVE_DIR} ..."
mkdir -p "$ARCHIVE_DIR"
chown postgres:postgres "$ARCHIVE_DIR"
chmod 700 "$ARCHIVE_DIR"

echo "Setting archive_mode and archive_command ..."
sudo -u postgres psql -c "ALTER SYSTEM SET archive_mode = 'on';"
sudo -u postgres psql -c "ALTER SYSTEM SET archive_command = 'test ! -f ${ARCHIVE_DIR}/%f && cp %p ${ARCHIVE_DIR}/%f';"

echo "Restarting cluster ${PGCLUSTER_VERSION}/${PGCLUSTER_NAME} (archive_mode requires a restart) ..."
pg_ctlcluster "$PGCLUSTER_VERSION" "$PGCLUSTER_NAME" restart

sleep 2
ACTUAL_MODE=$(sudo -u postgres psql -tAc "SHOW archive_mode;")
echo "archive_mode is now: ${ACTUAL_MODE}"
if [[ "$ACTUAL_MODE" != "on" ]]; then
  echo "ERROR: archive_mode did not take effect" >&2
  exit 1
fi

echo "WAL archiving enabled. Force a segment switch with: SELECT pg_switch_wal(); to archive the current segment immediately."
