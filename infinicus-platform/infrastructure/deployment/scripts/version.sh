#!/usr/bin/env bash
# BUILD-23 — Deterministic release version string, the basis for
# immutable build tagging (spec §2 "immutable builds", "release
# versioning"). Every build of this repository gets exactly one version
# string for its exact git state; the same commit always produces the
# same version, and a dirty working tree is flagged rather than silently
# treated as equivalent to a clean commit.
#
# Format: <base-version>+sha.<short-sha>[.dirty]
#   e.g. 0.0.1+sha.0976652          (clean commit)
#        0.0.1+sha.0976652.dirty    (uncommitted changes present)
#
# <base-version> comes from infinicus-platform/package.json's own
# "version" field (root workspace manifest) — reusing the version this
# repository already declares rather than inventing a second, parallel
# versioning scheme. The `+sha...` build-metadata suffix (valid semver
# syntax) is what actually makes each build immutable/traceable: two
# builds from the same base version but different commits get different,
# unambiguous version strings.
#
# Usage:
#   ./version.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PACKAGE_JSON="$REPO_ROOT/package.json"

if [[ ! -f "$PACKAGE_JSON" ]]; then
  echo "ERROR: could not find $PACKAGE_JSON" >&2
  exit 1
fi

BASE_VERSION=$(node -p "require('$PACKAGE_JSON').version")
SHORT_SHA=$(git -C "$REPO_ROOT" rev-parse --short=7 HEAD)

DIRTY=""
if [[ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]]; then
  DIRTY=".dirty"
fi

echo "${BASE_VERSION}+sha.${SHORT_SHA}${DIRTY}"
