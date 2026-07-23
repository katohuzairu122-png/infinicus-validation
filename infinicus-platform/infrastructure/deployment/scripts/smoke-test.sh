#!/usr/bin/env bash
# BUILD-23 — Post-deploy smoke test: the minimum set of checks that must
# pass before a newly-promoted instance is considered healthy. Run this
# against a freshly started/deployed apps/api instance before routing
# real traffic to it (or, in a rollback scenario, before considering a
# rollback target healthy).
#
# Exit code: 0 if every check passes, non-zero (with the failing check
# named) on the first failure — a CI/deploy pipeline should treat
# non-zero here as a hard stop / automatic rollback trigger.
#
# Usage:
#   BASE_URL="http://localhost:3000" ./smoke-test.sh

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

check() {
  local path="$1"
  local expected="$2"
  local status
  # curl's -w '%{http_code}' already writes "000" on a connection failure
  # (refused/timeout/DNS) — the `|| true` only stops set -e from aborting
  # on curl's own non-zero exit in that case; it must not print anything
  # itself, or the two "000"s concatenate into a bogus "000000".
  status=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "${BASE_URL}${path}" || true)
  if [[ "$status" != "$expected" ]]; then
    echo "FAIL: GET ${path} expected ${expected}, got ${status:-<no response>}" >&2
    exit 1
  fi
  echo "OK:   GET ${path} -> ${status}"
}

echo "Smoke testing ${BASE_URL} ..."
check "/v1/health" "200"
check "/v1/ready" "200"
check "/documentation/json" "200"

echo "Smoke test passed: process is live, database is reachable, OpenAPI spec is being served."
