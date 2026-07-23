#!/usr/bin/env bash
# BUILD-22 — Point-in-time recovery restore. Takes a physical base backup
# (from pitr-base-backup.sh) plus the archived WAL segments it depends on,
# and replays WAL up to RECOVERY_TARGET_TIME on a separate, scratch
# PostgreSQL instance — never against the live cluster.
#
# Usage:
#   BASE_BACKUP_DIR="/var/lib/postgresql/pitr_base" \
#   ARCHIVE_DIR="/var/lib/postgresql/wal_archive" \
#   RECOVERY_DATA_DIR="/var/lib/postgresql/pitr_recovery" \
#   RECOVERY_PORT=5433 \
#   RECOVERY_TARGET_TIME="2026-07-23 08:55:00.000000+00" \
#     ./pitr-restore.sh
#
# On success, a running PostgreSQL instance is listening on
# RECOVERY_PORT, its data reflecting the cluster's state as of
# RECOVERY_TARGET_TIME (not a moment later). Use verify-and-stop.sh (or
# connect directly) to inspect it, then stop it with:
#   sudo -u postgres /usr/lib/postgresql/16/bin/pg_ctl stop -D RECOVERY_DATA_DIR
# and remove RECOVERY_DATA_DIR when done — this script never deletes it
# automatically, since inspecting the recovered state is the entire point.

set -euo pipefail

BASE_BACKUP_DIR="${BASE_BACKUP_DIR:?BASE_BACKUP_DIR is required}"
ARCHIVE_DIR="${ARCHIVE_DIR:?ARCHIVE_DIR is required}"
RECOVERY_DATA_DIR="${RECOVERY_DATA_DIR:?RECOVERY_DATA_DIR is required}"
RECOVERY_PORT="${RECOVERY_PORT:?RECOVERY_PORT is required}"
RECOVERY_TARGET_TIME="${RECOVERY_TARGET_TIME:?RECOVERY_TARGET_TIME is required, e.g. '2026-07-23 08:55:00+00'}"
PG_BINDIR="${PG_BINDIR:-/usr/lib/postgresql/16/bin}"

if [[ -e "$RECOVERY_DATA_DIR" ]]; then
  echo "ERROR: ${RECOVERY_DATA_DIR} already exists — remove it first." >&2
  exit 1
fi

echo "Copying base backup ${BASE_BACKUP_DIR} -> ${RECOVERY_DATA_DIR} ..."
cp -a "$BASE_BACKUP_DIR" "$RECOVERY_DATA_DIR"
chown -R postgres:postgres "$RECOVERY_DATA_DIR"
chmod 700 "$RECOVERY_DATA_DIR"
rm -f "$RECOVERY_DATA_DIR/postmaster.pid"

# Debian/Ubuntu's PostgreSQL packaging keeps postgresql.conf/pg_hba.conf
# OUTSIDE $PGDATA (under /etc/postgresql/<ver>/<cluster>/), driven by a
# data_directory GUC baked into that external postgresql.conf — so a
# base backup's copy of $PGDATA has neither file, and the external conf
# (if reused as-is) would redirect this scratch instance right back at
# the live cluster's own data directory. This scratch recovery instance
# instead gets its own minimal, self-contained postgresql.conf and
# pg_hba.conf written directly into $PGDATA, exactly as a non-Debian
# PostgreSQL install would already have out of the box.
echo "Writing recovery configuration (target time: ${RECOVERY_TARGET_TIME}) ..."
sudo -u postgres touch "$RECOVERY_DATA_DIR/recovery.signal"
cat <<EOF | sudo -u postgres tee "$RECOVERY_DATA_DIR/postgresql.conf" >/dev/null
listen_addresses = 'localhost'
port = ${RECOVERY_PORT}
unix_socket_directories = '/tmp'
restore_command = 'cp ${ARCHIVE_DIR}/%f %p'
recovery_target_time = '${RECOVERY_TARGET_TIME}'
recovery_target_action = 'promote'
EOF
cat <<'EOF' | sudo -u postgres tee "$RECOVERY_DATA_DIR/pg_hba.conf" >/dev/null
local   all             all                                     trust
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust
EOF

LOG_FILE="${RECOVERY_DATA_DIR}.log"
echo "Starting recovery instance on port ${RECOVERY_PORT} (log: ${LOG_FILE}) ..."
sudo -u postgres "$PG_BINDIR/pg_ctl" start -D "$RECOVERY_DATA_DIR" -l "$LOG_FILE" -w -t 60

echo "Recovery complete and instance promoted. Connect with:"
echo "  sudo -u postgres psql -p ${RECOVERY_PORT} -h /tmp -d <dbname>"
