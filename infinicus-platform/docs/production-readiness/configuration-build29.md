# BUILD-29 — Incident Response and Rollback: Configuration

## No new required environment variables

The incident-tracking API and repository use the same `DATABASE_URL`/pool already configured by BUILD-21/22 — no new variable name. The runbooks reference existing scripts' existing required variables (`ADMIN_DATABASE_URL`, `MAINTENANCE_DATABASE_URL`/`TARGET_DATABASE_URL` for `restore.sh`, `BASE_BACKUP_DIR`/`ARCHIVE_DIR`/`RECOVERY_DATA_DIR`/`RECOVERY_PORT`/`RECOVERY_TARGET_TIME` for `pitr-restore.sh`, `ADMIN_DATABASE_URL`/`APP_ROLE`/`DB_HOST`/`DB_PORT`/`DB_NAME`/`ENVIRONMENT` for `rotate-db-credential.sh`) — this build introduces none of its own.

## Severity/status values are database CHECK constraints, not configuration

`platform.incidents.severity` (`sev1`–`sev4`) and `platform.incidents.status`/`platform.incident_updates.status_at_update` (`investigating`/`identified`/`monitoring`/`resolved`) are enforced by database `CHECK` constraints (migration `0154`), matching every other domain's status-enum convention in this codebase — not environment-configurable, and not meant to be (the severity model is a fixed operational taxonomy, not a per-deployment setting).

## Permission gate is existing seed data, not new configuration

Every incident route requires `platform:admin`, a permission seeded by migration `0137` (BUILD-18) — this build adds no new permission code, migration, or role-seeding of its own.

## No new secrets

No new credential is introduced. The security-incident runbook references BUILD-24's existing rotation tooling and secret inventory rather than adding any new secret this build itself owns.
