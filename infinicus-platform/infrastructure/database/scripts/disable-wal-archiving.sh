#!/usr/bin/env bash
# BUILD-22 — Reverse enable-wal-archiving.sh: reset archive_mode and
# archive_command to their cluster defaults and restart.
#
# Usage:
#   PGCLUSTER_VERSION=16 PGCLUSTER_NAME=main ./disable-wal-archiving.sh

set -euo pipefail

PGCLUSTER_VERSION="${PGCLUSTER_VERSION:-16}"
PGCLUSTER_NAME="${PGCLUSTER_NAME:-main}"

sudo -u postgres psql -c "ALTER SYSTEM RESET archive_mode;"
sudo -u postgres psql -c "ALTER SYSTEM RESET archive_command;"

echo "Restarting cluster ${PGCLUSTER_VERSION}/${PGCLUSTER_NAME} ..."
pg_ctlcluster "$PGCLUSTER_VERSION" "$PGCLUSTER_NAME" restart

sleep 2
sudo -u postgres psql -tAc "SHOW archive_mode;"
