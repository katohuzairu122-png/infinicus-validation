#!/bin/bash
# Runs automatically on the *first* container start only (Postgres's
# docker-entrypoint-initdb.d mechanism skips this once the data volume
# already has a database) — creates the least-privilege app_role login
# that grant-app-role.sh then grants schema access to. Mirrors what every
# prior environment in this repo has needed done by hand; here it's
# automated so a fresh Hetzner VM doesn't need a manual psql step.
set -euo pipefail

: "${POSTGRES_APP_PASSWORD:?POSTGRES_APP_PASSWORD must be set for the postgres container}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE ROLE app_role LOGIN PASSWORD '${POSTGRES_APP_PASSWORD}';
EOSQL
