#!/usr/bin/env bash
# BUILD-23 — Promotion orchestrator: ties version.sh, migration-gate.sh,
# smoke-test.sh, and the deployment-audit record (platform.deployment_events)
# into one gated sequence. This is what "promotion gate" and "deployment
# audit" mean concretely in this codebase — not separate, disconnected
# capabilities, but one script that a real deploy pipeline invokes.
#
# What this script does NOT do: start, stop, or supervise the
# application process/container itself. Process supervision is
# environment-specific (systemd, Kubernetes, Docker Compose, a PaaS's
# own mechanism) and deliberately out of this build's scope — this
# script assumes the caller starts/restarts the new version separately
# (step 3 below), then calls this script to gate promotion and record
# the outcome. See docs/production-readiness/operating-procedure-build23.md
# for a full worked example of the surrounding steps.
#
# Sequence:
#   1. Compute the immutable version string (version.sh).
#   2. Record a deployment_events row with status 'started'.
#   3. Promotion gate: staging requires this exact version to already have
#      a 'succeeded' deployment to 'test'; production requires this exact
#      version to already have a 'succeeded' deployment to 'staging'.
#      local/test have no prerequisite. Refuses to proceed on failure.
#   4. Run the migration gate — refuses to proceed on failure.
#   5. (caller's responsibility, not this script: start/restart the app)
#   6. Run the smoke test against the now-running instance.
#   7. Record the outcome: 'succeeded' or 'failed'.
#
# Exit code: 0 only if every gate passed and the smoke test succeeded.
# A non-zero exit means the deployment_events row is left as 'failed' —
# an operator (or the calling pipeline) must decide whether to retry or
# roll back (see rollback-procedure-build23.md).
#
# Usage:
#   ENVIRONMENT=staging \
#   DATABASE_URL="postgresql://<admin-role>:<pw>@<host>:5432/<db>" \
#   BASE_URL="http://localhost:3000" \
#   DEPLOYED_BY="ci" \
#     ./deploy.sh

set -euo pipefail

ENVIRONMENT="${ENVIRONMENT:?ENVIRONMENT is required (local|test|staging|production)}"
DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"
BASE_URL="${BASE_URL:-http://localhost:3000}"
DEPLOYED_BY="${DEPLOYED_BY:-unknown}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
DIST_INDEX="$REPO_ROOT/packages/database/dist/index.js"

if [[ ! -f "$DIST_INDEX" ]]; then
  echo "ERROR: $DIST_INDEX not found — build @infinicus/database first" >&2
  exit 1
fi

VERSION=$("$SCRIPT_DIR/version.sh")
GIT_SHA=$(git -C "$REPO_ROOT" rev-parse HEAD)
AUDIT_CLI="$SCRIPT_DIR/deployment-audit.cjs"

echo "=== Deploying ${VERSION} (${GIT_SHA}) to ${ENVIRONMENT} ==="

# Every value below crosses into Node as a plain argv element (see
# deployment-audit.cjs) — never interpolated into an eval'd script
# string, so a value containing a quote or shell metacharacter (a commit
# message, a CI actor name, anything caller-supplied) cannot break out
# and execute arbitrary code.
DEPLOYMENT_ID=$(DATABASE_URL="$DATABASE_URL" node "$AUDIT_CLI" start "$VERSION" "$ENVIRONMENT" "$GIT_SHA" "$DEPLOYED_BY")
echo "Recorded deployment_events row: ${DEPLOYMENT_ID}"

mark_outcome() {
  local status="$1"
  local notes="$2"
  DATABASE_URL="$DATABASE_URL" node "$AUDIT_CLI" "$status" "$DEPLOYMENT_ID" "$notes"
}

echo "--- Promotion gate ---"
if ! DATABASE_URL="$DATABASE_URL" node "$AUDIT_CLI" check-promotion "$VERSION" "$ENVIRONMENT"; then
  echo "Promotion gate FAILED — aborting promotion." >&2
  mark_outcome failed "promotion gate rejected: no prior succeeded deployment of this version to the required environment"
  exit 1
fi

echo "--- Migration gate ---"
if ! DATABASE_URL="$DATABASE_URL" "$SCRIPT_DIR/migration-gate.sh"; then
  echo "Migration gate FAILED — aborting promotion." >&2
  mark_outcome failed "migration gate failed"
  exit 1
fi

echo "--- Smoke test (${BASE_URL}) ---"
echo "NOTE: this assumes the new version is already running at ${BASE_URL} — start/restart it before running this script."
if ! BASE_URL="$BASE_URL" "$SCRIPT_DIR/smoke-test.sh"; then
  echo "Smoke test FAILED — deployment did not pass promotion gate." >&2
  mark_outcome failed "smoke test failed"
  exit 1
fi

mark_outcome succeeded "migration gate and smoke test both passed"
echo "=== Deployment ${VERSION} to ${ENVIRONMENT} succeeded (deployment_events id: ${DEPLOYMENT_ID}) ==="
