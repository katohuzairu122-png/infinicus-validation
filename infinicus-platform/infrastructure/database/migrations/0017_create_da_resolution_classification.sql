-- Migration: 0017_create_da_resolution_classification
-- Stage 2B — Entity resolution, duplicate detection, classification tables
-- Tables: entity_resolution_results, entity_match_candidates,
--         duplicate_groups, duplicate_group_members,
--         data_classifications, sensitive_data_actions

BEGIN;

-- ── data_acquisition.entity_resolution_results ───────────────────────────────

CREATE TABLE data_acquisition.entity_resolution_results (
  id                       uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid          NOT NULL REFERENCES tenancy.tenants(id)              ON DELETE RESTRICT,
  workspace_id             uuid          NOT NULL REFERENCES tenancy.workspaces(id)           ON DELETE RESTRICT,
  business_id              uuid          REFERENCES platform.businesses(id)                   ON DELETE SET NULL,
  collection_run_id        uuid          NOT NULL REFERENCES data_acquisition.collection_runs(id) ON DELETE RESTRICT,
  source_record_reference  text          NOT NULL,
  candidate_entity_type    text          NOT NULL,
  candidate_entity_id      uuid,
  match_method             text          NOT NULL,
  match_score              numeric(5,4)  NOT NULL,
  resolution_status        text          NOT NULL DEFAULT 'review_required',
  resolved_entity_id       uuid,
  reviewed_by              uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  reviewed_at              timestamptz,
  evidence                 jsonb         NOT NULL DEFAULT '{}',
  correlation_id           uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at               timestamptz   NOT NULL DEFAULT now(),
  updated_at               timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT entity_resolution_score_check CHECK (match_score >= 0 AND match_score <= 1),
  CONSTRAINT entity_resolution_status_check CHECK (resolution_status IN (
    'matched','possible_match','new_entity','rejected','review_required'
  ))
);

-- ── data_acquisition.entity_match_candidates ─────────────────────────────────

CREATE TABLE data_acquisition.entity_match_candidates (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_resolution_result_id uuid          NOT NULL REFERENCES data_acquisition.entity_resolution_results(id) ON DELETE CASCADE,
  candidate_entity_id         uuid          NOT NULL,
  candidate_entity_type       text          NOT NULL,
  match_score                 numeric(5,4)  NOT NULL,
  matching_features           jsonb         NOT NULL DEFAULT '{}',
  rank                        integer       NOT NULL,
  created_at                  timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT entity_match_score_check CHECK (match_score >= 0 AND match_score <= 1),
  CONSTRAINT entity_match_rank_pos    CHECK (rank >= 1)
);

-- ── data_acquisition.duplicate_groups ────────────────────────────────────────

CREATE TABLE data_acquisition.duplicate_groups (
  id                       uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid          NOT NULL REFERENCES tenancy.tenants(id)              ON DELETE RESTRICT,
  workspace_id             uuid          NOT NULL REFERENCES tenancy.workspaces(id)           ON DELETE RESTRICT,
  business_id              uuid          REFERENCES platform.businesses(id)                   ON DELETE SET NULL,
  collection_run_id        uuid          REFERENCES data_acquisition.collection_runs(id)      ON DELETE SET NULL,
  entity_type              text          NOT NULL,
  duplicate_type           text          NOT NULL,
  fingerprint              text,
  status                   text          NOT NULL DEFAULT 'open',
  canonical_record_reference text,
  confidence               numeric(5,4)  NOT NULL DEFAULT 0,
  created_at               timestamptz   NOT NULL DEFAULT now(),
  updated_at               timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT duplicate_groups_type_check CHECK (duplicate_type IN (
    'exact','fuzzy','source_duplicate','cross_source','suspected'
  )),
  CONSTRAINT duplicate_groups_status_check CHECK (status IN (
    'open','resolved','merged','rejected','ignored'
  )),
  CONSTRAINT duplicate_groups_confidence_check CHECK (confidence >= 0 AND confidence <= 1)
);

-- ── data_acquisition.duplicate_group_members ─────────────────────────────────
-- Append-only duplicate evidence. Do not delete members.

CREATE TABLE data_acquisition.duplicate_group_members (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  duplicate_group_id  uuid          NOT NULL REFERENCES data_acquisition.duplicate_groups(id) ON DELETE RESTRICT,
  record_reference    text          NOT NULL,
  source_id           uuid          REFERENCES data_acquisition.data_sources(id) ON DELETE SET NULL,
  similarity_score    numeric(5,4)  NOT NULL,
  is_canonical        boolean       NOT NULL DEFAULT false,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT duplicate_members_score_check CHECK (similarity_score >= 0 AND similarity_score <= 1),
  CONSTRAINT duplicate_members_unique UNIQUE (duplicate_group_id, record_reference)
);

-- ── data_acquisition.data_classifications ────────────────────────────────────

CREATE TABLE data_acquisition.data_classifications (
  id                      uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid          NOT NULL REFERENCES tenancy.tenants(id)              ON DELETE RESTRICT,
  workspace_id            uuid          NOT NULL REFERENCES tenancy.workspaces(id)           ON DELETE RESTRICT,
  business_id             uuid          REFERENCES platform.businesses(id)                   ON DELETE SET NULL,
  collection_run_id       uuid          REFERENCES data_acquisition.collection_runs(id)      ON DELETE SET NULL,
  record_reference        text          NOT NULL,
  domain                  text          NOT NULL,
  entity_type             text,
  operational_use         text,
  sensitivity_level       text          NOT NULL DEFAULT 'internal',
  retention_category      text          NOT NULL,
  classification_method   text          NOT NULL,
  confidence              numeric(5,4)  NOT NULL DEFAULT 0,
  review_status           text          NOT NULL DEFAULT 'pending',
  classified_at           timestamptz   NOT NULL DEFAULT now(),
  classified_by           uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  correlation_id          uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at              timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT data_classifications_sensitivity_check CHECK (sensitivity_level IN (
    'public','internal','confidential','restricted','highly_restricted'
  )),
  CONSTRAINT data_classifications_review_check CHECK (review_status IN (
    'pending','approved','rejected','overridden'
  )),
  CONSTRAINT data_classifications_confidence_check CHECK (confidence >= 0 AND confidence <= 1)
);

-- ── data_acquisition.sensitive_data_actions ──────────────────────────────────
-- Append-only action log. Do not store removed plaintext in action logs.

CREATE TABLE data_acquisition.sensitive_data_actions (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid        NOT NULL REFERENCES tenancy.tenants(id)                        ON DELETE RESTRICT,
  workspace_id            uuid        NOT NULL REFERENCES tenancy.workspaces(id)                     ON DELETE RESTRICT,
  business_id             uuid        REFERENCES platform.businesses(id)                              ON DELETE SET NULL,
  data_classification_id  uuid        NOT NULL REFERENCES data_acquisition.data_classifications(id)  ON DELETE RESTRICT,
  record_reference        text        NOT NULL,
  field_path              text,
  action_type             text        NOT NULL,
  policy_reference        text,
  before_hash             text,
  after_hash              text,
  reason                  text        NOT NULL,
  performed_at            timestamptz NOT NULL DEFAULT now(),
  performed_by            uuid        REFERENCES identity.users(id) ON DELETE SET NULL,
  correlation_id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sensitive_data_action_type_check CHECK (action_type IN (
    'masked','redacted','tokenized','encrypted','restricted',
    'quarantined','deleted_by_policy'
  ))
);

INSERT INTO _migrations (filename) VALUES ('0017_create_da_resolution_classification.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
