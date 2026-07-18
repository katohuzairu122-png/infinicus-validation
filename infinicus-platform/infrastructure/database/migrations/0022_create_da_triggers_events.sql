-- Migration: 0022_create_da_triggers_events
-- Stage 2B — updated_at triggers for mutable DA tables
--            + SQL helper functions for atomic outbox event publication

BEGIN;

-- ── updated_at triggers ───────────────────────────────────────────────────────
-- Reuses set_updated_at() function defined in Stage 1 (0001_foundation.sql).

CREATE TRIGGER set_updated_at_data_sources
  BEFORE UPDATE ON data_acquisition.data_sources
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_connectors
  BEFORE UPDATE ON data_acquisition.connectors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_credential_references
  BEFORE UPDATE ON data_acquisition.credential_references
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_collection_schedules
  BEFORE UPDATE ON data_acquisition.collection_schedules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_collection_runs
  BEFORE UPDATE ON data_acquisition.collection_runs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_file_intakes
  BEFORE UPDATE ON data_acquisition.file_intakes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_api_collection_runs
  BEFORE UPDATE ON data_acquisition.api_collection_runs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_database_collection_runs
  BEFORE UPDATE ON data_acquisition.database_collection_runs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_manual_submissions
  BEFORE UPDATE ON data_acquisition.manual_submissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_detected_schemas
  BEFORE UPDATE ON data_acquisition.detected_schemas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_validation_policies
  BEFORE UPDATE ON data_acquisition.validation_policies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_normalization_mappings
  BEFORE UPDATE ON data_acquisition.normalization_mappings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_entity_resolution_results
  BEFORE UPDATE ON data_acquisition.entity_resolution_results
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_duplicate_groups
  BEFORE UPDATE ON data_acquisition.duplicate_groups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_data_classifications
  BEFORE UPDATE ON data_acquisition.data_classifications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_missing_data_actions
  BEFORE UPDATE ON data_acquisition.missing_data_actions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_publication_packages
  BEFORE UPDATE ON data_acquisition.publication_packages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_publication_deliveries
  BEFORE UPDATE ON data_acquisition.publication_deliveries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- NOT applied to append-only tables:
--   webhook_receipts, stream_events, cleaning_actions, sensitive_data_actions,
--   provenance_records, transformation_records, validation_issues (immutable)
--   entity_match_candidates, duplicate_group_members (detail records)
--   layer_assemblies, layer_deployments, layer_rollbacks (deployment metadata)

-- ── outbox event helper function ─────────────────────────────────────────────
-- Inserts one event row into events.outbox_events inside the caller's transaction.
-- Call this from within the same transaction that creates the domain record.

CREATE OR REPLACE FUNCTION data_acquisition.emit_outbox_event(
  p_tenant_id       uuid,
  p_workspace_id    uuid,
  p_event_type      text,
  p_event_version   text,
  p_correlation_id  uuid,
  p_causation_id    uuid,
  p_payload         jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO events.outbox_events (
    id,
    tenant_id,
    workspace_id,
    event_type,
    event_version,
    payload,
    correlation_id,
    causation_id,
    status,
    created_at
  ) VALUES (
    gen_random_uuid(),
    p_tenant_id,
    p_workspace_id,
    p_event_type,
    p_event_version,
    p_payload,
    p_correlation_id,
    p_causation_id,
    'pending',
    now()
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- ── per-event convenience wrappers ────────────────────────────────────────────

-- da.source.registered
CREATE OR REPLACE FUNCTION data_acquisition.emit_source_registered(
  p_tenant_id      uuid,
  p_workspace_id   uuid,
  p_source_id      uuid,
  p_source_code    text,
  p_source_type    text,
  p_correlation_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN data_acquisition.emit_outbox_event(
    p_tenant_id, p_workspace_id,
    'da.source.registered', '1.0',
    p_correlation_id, NULL,
    jsonb_build_object(
      'sourceId',   p_source_id,
      'sourceCode', p_source_code,
      'sourceType', p_source_type
    )
  );
END;
$$;

-- da.connector.registered
CREATE OR REPLACE FUNCTION data_acquisition.emit_connector_registered(
  p_tenant_id      uuid,
  p_workspace_id   uuid,
  p_connector_id   uuid,
  p_source_id      uuid,
  p_connector_type text,
  p_correlation_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN data_acquisition.emit_outbox_event(
    p_tenant_id, p_workspace_id,
    'da.connector.registered', '1.0',
    p_correlation_id, NULL,
    jsonb_build_object(
      'connectorId',   p_connector_id,
      'sourceId',      p_source_id,
      'connectorType', p_connector_type
    )
  );
END;
$$;

-- da.collection.started
CREATE OR REPLACE FUNCTION data_acquisition.emit_collection_started(
  p_tenant_id         uuid,
  p_workspace_id      uuid,
  p_collection_run_id uuid,
  p_source_id         uuid,
  p_collection_type   text,
  p_correlation_id    uuid,
  p_causation_id      uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN data_acquisition.emit_outbox_event(
    p_tenant_id, p_workspace_id,
    'da.collection.started', '1.0',
    p_correlation_id, p_causation_id,
    jsonb_build_object(
      'collectionRunId', p_collection_run_id,
      'sourceId',        p_source_id,
      'collectionType',  p_collection_type
    )
  );
END;
$$;

-- da.collection.completed
CREATE OR REPLACE FUNCTION data_acquisition.emit_collection_completed(
  p_tenant_id         uuid,
  p_workspace_id      uuid,
  p_collection_run_id uuid,
  p_source_id         uuid,
  p_records_received  integer,
  p_records_accepted  integer,
  p_records_rejected  integer,
  p_correlation_id    uuid,
  p_causation_id      uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN data_acquisition.emit_outbox_event(
    p_tenant_id, p_workspace_id,
    'da.collection.completed', '1.0',
    p_correlation_id, p_causation_id,
    jsonb_build_object(
      'collectionRunId', p_collection_run_id,
      'sourceId',        p_source_id,
      'recordsReceived', p_records_received,
      'recordsAccepted', p_records_accepted,
      'recordsRejected', p_records_rejected
    )
  );
END;
$$;

-- da.collection.failed
CREATE OR REPLACE FUNCTION data_acquisition.emit_collection_failed(
  p_tenant_id         uuid,
  p_workspace_id      uuid,
  p_collection_run_id uuid,
  p_source_id         uuid,
  p_error_code        text,
  p_correlation_id    uuid,
  p_causation_id      uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN data_acquisition.emit_outbox_event(
    p_tenant_id, p_workspace_id,
    'da.collection.failed', '1.0',
    p_correlation_id, p_causation_id,
    jsonb_build_object(
      'collectionRunId', p_collection_run_id,
      'sourceId',        p_source_id,
      'errorCode',       p_error_code
    )
  );
END;
$$;

-- da.validation.completed
CREATE OR REPLACE FUNCTION data_acquisition.emit_validation_completed(
  p_tenant_id            uuid,
  p_workspace_id         uuid,
  p_validation_result_id uuid,
  p_collection_run_id    uuid,
  p_is_valid             boolean,
  p_error_count          integer,
  p_warning_count        integer,
  p_correlation_id       uuid,
  p_causation_id         uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN data_acquisition.emit_outbox_event(
    p_tenant_id, p_workspace_id,
    'da.validation.completed', '1.0',
    p_correlation_id, p_causation_id,
    jsonb_build_object(
      'validationResultId', p_validation_result_id,
      'collectionRunId',    p_collection_run_id,
      'isValid',            p_is_valid,
      'errorCount',         p_error_count,
      'warningCount',       p_warning_count
    )
  );
END;
$$;

-- da.data.quarantined
CREATE OR REPLACE FUNCTION data_acquisition.emit_data_quarantined(
  p_tenant_id         uuid,
  p_workspace_id      uuid,
  p_collection_run_id uuid,
  p_record_reference  text,
  p_reason            text,
  p_correlation_id    uuid,
  p_causation_id      uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN data_acquisition.emit_outbox_event(
    p_tenant_id, p_workspace_id,
    'da.data.quarantined', '1.0',
    p_correlation_id, p_causation_id,
    jsonb_build_object(
      'collectionRunId', p_collection_run_id,
      'recordReference', p_record_reference,
      'reason',          p_reason
    )
  );
END;
$$;

-- da.data.quality_scored
CREATE OR REPLACE FUNCTION data_acquisition.emit_data_quality_scored(
  p_tenant_id      uuid,
  p_workspace_id   uuid,
  p_score_id       uuid,
  p_source_id      uuid,
  p_overall_score  numeric,
  p_correlation_id uuid,
  p_causation_id   uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN data_acquisition.emit_outbox_event(
    p_tenant_id, p_workspace_id,
    'da.data.quality_scored', '1.0',
    p_correlation_id, p_causation_id,
    jsonb_build_object(
      'scoreId',      p_score_id,
      'sourceId',     p_source_id,
      'overallScore', p_overall_score
    )
  );
END;
$$;

-- da.data.published
CREATE OR REPLACE FUNCTION data_acquisition.emit_data_published(
  p_tenant_id      uuid,
  p_workspace_id   uuid,
  p_package_id     uuid,
  p_target_layer   text,
  p_target_block   text,
  p_record_count   integer,
  p_correlation_id uuid,
  p_causation_id   uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN data_acquisition.emit_outbox_event(
    p_tenant_id, p_workspace_id,
    'da.data.published', '1.0',
    p_correlation_id, p_causation_id,
    jsonb_build_object(
      'packageId',   p_package_id,
      'targetLayer', p_target_layer,
      'targetBlock', p_target_block,
      'recordCount', p_record_count
    )
  );
END;
$$;

INSERT INTO _migrations (filename) VALUES ('0022_create_da_triggers_events.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
