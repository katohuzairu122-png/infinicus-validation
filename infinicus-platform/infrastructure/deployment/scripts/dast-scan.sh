#!/usr/bin/env bash
# BUILD-26 — Lightweight DAST (dynamic application security testing)
# scan: fires real HTTP requests at a live, running apps/api instance
# and checks the actual responses — not a reimplementation of the
# app's logic, a black-box probe against it, mirroring smoke-test.sh's
# (BUILD-23) live-target pattern. No OWASP ZAP or similar full DAST
# suite is installable in this sandboxed environment (no reachable
# download source) — this script covers the specific, real checks that
# are: (a) genuinely automatable with curl alone, and (b) meaningful for
# this API's actual shape (JSON-only, Bearer-token auth, no HTML views).
#
# Usage:
#   BASE_URL="http://localhost:3000" ./dast-scan.sh
#
# Exit code: 0 if every check passes, 1 on the first failure (printed).

set -euo pipefail

BASE_URL="${BASE_URL:?ERROR: BASE_URL is required}"
FAILURES=0

check_header_present() {
  local path="$1" header="$2"
  local headers
  headers=$(curl -s -D - -o /dev/null --max-time 10 "${BASE_URL}${path}" || true)
  if ! echo "$headers" | grep -qi "^${header}:"; then
    echo "FAIL: ${path} missing security header '${header}'"
    FAILURES=$((FAILURES + 1))
  else
    echo "OK: ${path} sets '${header}'"
  fi
}

check_no_stack_trace_leak() {
  local path="$1"
  local body
  body=$(curl -s --max-time 10 "${BASE_URL}${path}" || true)
  if echo "$body" | grep -qE '\.ts:[0-9]+|at [A-Za-z]+ \(|node_modules'; then
    echo "FAIL: ${path} response appears to leak a stack trace or internal path: ${body:0:200}"
    FAILURES=$((FAILURES + 1))
  else
    echo "OK: ${path} does not leak a stack trace"
  fi
}

check_sqli_probe_rejected() {
  local status
  status=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
    -X POST "${BASE_URL}/v1/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"'"'"' OR 1=1 --","password":"x"}' || echo "000")
  if [[ "$status" != "400" ]]; then
    echo "FAIL: SQLi-style login payload expected 400, got ${status}"
    FAILURES=$((FAILURES + 1))
  else
    echo "OK: SQLi-style login payload rejected with 400"
  fi
}

check_xss_probe_not_reflected() {
  local body
  body=$(curl -s --max-time 10 \
    -X POST "${BASE_URL}/v1/auth/register" \
    -H 'Content-Type: application/json' \
    -d '{"email":"<script>alert(1)</script>","password":"x"}' || true)
  if echo "$body" | grep -q '<script>'; then
    echo "FAIL: XSS-style payload was reflected unescaped in the response body"
    FAILURES=$((FAILURES + 1))
  else
    echo "OK: XSS-style payload was not reflected"
  fi
}

check_unauthenticated_admin_route_rejected() {
  local status
  status=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "${BASE_URL}/v1/metrics" || echo "000")
  if [[ "$status" != "401" ]]; then
    echo "FAIL: GET /v1/metrics without auth expected 401, got ${status}"
    FAILURES=$((FAILURES + 1))
  else
    echo "OK: GET /v1/metrics without auth correctly rejected (401)"
  fi
}

echo "=== DAST scan against ${BASE_URL} ==="
check_header_present "/v1/health" "x-content-type-options"
check_header_present "/v1/health" "x-frame-options"
check_header_present "/v1/health" "strict-transport-security"
check_no_stack_trace_leak "/v1/nonexistent-route"
check_sqli_probe_rejected
check_xss_probe_not_reflected
check_unauthenticated_admin_route_rejected

if [[ "$FAILURES" -gt 0 ]]; then
  echo "=== DAST scan FAILED: ${FAILURES} check(s) failed ==="
  exit 1
fi

echo "=== DAST scan passed: all checks green ==="
