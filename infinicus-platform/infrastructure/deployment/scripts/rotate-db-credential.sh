#!/usr/bin/env bash
# BUILD-24 — Rotates the application database role's password.
#
# Generates (or accepts) a new password, applies it via ALTER ROLE with a
# VALID UNTIL expiry (Postgres enforces this at login — a connection
# attempt after that timestamp is refused server-side, not merely
# documented as expired), records the rotation in
# platform.secret_rotation_events via secret-rotation-audit.cjs, and
# prints the new DATABASE_URL for the operator to store in the actual
# secret manager. This script never persists the plaintext password
# anywhere itself — only prints it once, to stdout, for the caller to
# capture.
#
# Usage:
#   ADMIN_DATABASE_URL="postgresql://<admin-role>:<pw>@<host>:5432/<db>" \
#   APP_ROLE="app_test_user" \
#   DB_HOST="localhost" DB_PORT="5432" DB_NAME="infinicus_test" \
#   ENVIRONMENT="test" \
#     ./rotate-db-credential.sh
#
# Optional:
#   NEW_PASSWORD          — supplied password; generated via openssl if unset.
#   ROTATION_POLICY_DAYS  — VALID UNTIL horizon in days (default: 90).
#   ROTATED_BY            — audit-trail actor (default: $(whoami)).
#   DATABASE_URL           — passed through to secret-rotation-audit.cjs
#                            for the audit write (defaults to ADMIN_DATABASE_URL).

set -euo pipefail

if [[ -z "${ADMIN_DATABASE_URL:-}" ]]; then
  echo "ERROR: ADMIN_DATABASE_URL is required" >&2
  exit 1
fi
if [[ -z "${APP_ROLE:-}" ]]; then
  echo "ERROR: APP_ROLE is required" >&2
  exit 1
fi
if [[ -z "${DB_HOST:-}" || -z "${DB_PORT:-}" || -z "${DB_NAME:-}" ]]; then
  echo "ERROR: DB_HOST, DB_PORT, and DB_NAME are required (used to construct the new DATABASE_URL)" >&2
  exit 1
fi
if [[ -z "${ENVIRONMENT:-}" ]]; then
  echo "ERROR: ENVIRONMENT is required" >&2
  exit 1
fi

ROTATION_POLICY_DAYS="${ROTATION_POLICY_DAYS:-90}"
ROTATED_BY="${ROTATED_BY:-$(whoami)}"
NEW_PASSWORD="${NEW_PASSWORD:-$(openssl rand -base64 24 | tr -d '/+=')}"

EXPIRES_AT=$(date -u -d "+${ROTATION_POLICY_DAYS} days" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null \
  || date -u -v+"${ROTATION_POLICY_DAYS}"d +%Y-%m-%dT%H:%M:%SZ)

echo "Rotating password for role '${APP_ROLE}' (expires ${EXPIRES_AT}) ..."
psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 -v role="$APP_ROLE" -v pw="$NEW_PASSWORD" -v until="$EXPIRES_AT" <<'SQL'
ALTER ROLE :"role" WITH PASSWORD :'pw' VALID UNTIL :'until';
SQL

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATABASE_URL="${DATABASE_URL:-$ADMIN_DATABASE_URL}" \
  node "$SCRIPT_DIR/secret-rotation-audit.cjs" record \
    "DATABASE_URL" "$ENVIRONMENT" "$ROTATED_BY" "$EXPIRES_AT" "rotated via rotate-db-credential.sh, role=${APP_ROLE}" \
  > /dev/null

NEW_DATABASE_URL="postgresql://${APP_ROLE}:${NEW_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "Rotation complete. Store this new DATABASE_URL in the secret manager now — it is not saved anywhere by this script:"
echo "$NEW_DATABASE_URL"
