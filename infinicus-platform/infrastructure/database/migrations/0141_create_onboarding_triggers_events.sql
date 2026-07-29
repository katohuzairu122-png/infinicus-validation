-- Migration: 0141_create_onboarding_triggers_events
-- BUILD-19 — updated_at trigger + outbox event emission for onboarding

BEGIN;

-- ── updated_at trigger ───────────────────────────────────────────────────────
-- Reuses set_updated_at() from Stage 1 (0001_foundation.sql).

CREATE TRIGGER set_updated_at_tenant_onboarding
  BEFORE UPDATE ON onboarding.tenant_onboarding
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── outbox event base function ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION onboarding.emit_outbox_event(
  p_tenant_id       uuid,
  p_workspace_id    uuid,
  p_event_type      text,
  p_event_version   text,
  p_correlation_id  uuid,
  p_causation_id    uuid,
  p_payload         jsonb,
  p_aggregate_type  text DEFAULT NULL,
  p_aggregate_id    uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO events.outbox_events (
    id, tenant_id, workspace_id, event_type, event_version,
    payload, correlation_id, causation_id,
    aggregate_type, aggregate_id, status, created_at
  ) VALUES (
    gen_random_uuid(),
    p_tenant_id, p_workspace_id,
    p_event_type, p_event_version,
    p_payload, p_correlation_id, p_causation_id,
    COALESCE(p_aggregate_type, split_part(p_event_type, '.', 2)),
    COALESCE(p_aggregate_id, gen_random_uuid()),
    'pending', now()
  )
  RETURNING id INTO v_event_id;
  RETURN v_event_id;
END;
$$;

-- ── Event 1: onboarding.step.completed ──────────────────────────────────────
CREATE OR REPLACE FUNCTION onboarding.emit_step_completed(
  p_tenant_id      uuid, p_workspace_id uuid,
  p_onboarding_id  uuid, p_step         text,
  p_correlation_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN onboarding.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'onboarding.step.completed', '1.0',
    p_correlation_id, NULL,
    jsonb_build_object('onboardingId', p_onboarding_id, 'step', p_step),
    'tenant_onboarding', p_onboarding_id
  );
END; $$;

-- ── Event 2: onboarding.completed ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION onboarding.emit_onboarding_completed(
  p_tenant_id      uuid, p_workspace_id uuid,
  p_onboarding_id  uuid,
  p_correlation_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN onboarding.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'onboarding.completed', '1.0',
    p_correlation_id, NULL,
    jsonb_build_object('onboardingId', p_onboarding_id),
    'tenant_onboarding', p_onboarding_id
  );
END; $$;

-- ── Event 3: onboarding.abandoned ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION onboarding.emit_onboarding_abandoned(
  p_tenant_id      uuid, p_workspace_id uuid,
  p_onboarding_id  uuid,
  p_correlation_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN onboarding.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'onboarding.abandoned', '1.0',
    p_correlation_id, NULL,
    jsonb_build_object('onboardingId', p_onboarding_id),
    'tenant_onboarding', p_onboarding_id
  );
END; $$;

INSERT INTO _migrations (filename) VALUES ('0141_create_onboarding_triggers_events.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
