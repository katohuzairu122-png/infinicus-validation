-- Migration: 0169_add_manual_json_connector_type
-- BUILD-31 — Data Acquisition runtime: permit the 'manual_json' connector type.
--
-- BUILD-31 §4.4 requires manual_json to be the first implemented connector
-- type, and the BUILD-31 preparation report lists it in the frozen first
-- production slice. connectors_type_check, created in
-- 0013_create_da_sources_connectors.sql, does not permit that value, so
-- registering such a connector currently fails the CHECK constraint with a
-- raw PostgreSQL error.
--
-- This migration replaces the constraint with the same twelve values plus
-- 'manual_json'. It is a strict superset: every row that satisfies the current
-- constraint satisfies the new one, so the revalidation scan performed by ADD
-- CONSTRAINT cannot fail on existing data.
--
-- DROP ... IF EXISTS keeps the migration rerunnable; the runner also skips
-- files already recorded in _migrations.

BEGIN;

ALTER TABLE data_acquisition.connectors
  DROP CONSTRAINT IF EXISTS connectors_type_check;

ALTER TABLE data_acquisition.connectors
  ADD CONSTRAINT connectors_type_check CHECK (connector_type IN (
    'rest_api','graphql','webhook','postgres','mysql','mssql','sqlite',
    'sftp','object_storage','file_upload','event_stream','custom',
    'manual_json'
  ));

INSERT INTO _migrations (filename) VALUES ('0169_add_manual_json_connector_type.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
