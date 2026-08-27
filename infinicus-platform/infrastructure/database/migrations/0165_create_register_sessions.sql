-- Migration: 0165_create_register_sessions
-- Business Operations — register/shift open-close and cash reconciliation.
-- First slice of the POS/Commerce buildout (see
-- docs/production-readiness/ for the full staged roadmap): before orders,
-- payments, or tables can exist, a business needs a real register-session
-- concept — open with a starting float, operate, close with a counted
-- amount, see the variance.
--
-- expected_cash/variance are computed at close time from
-- business_operations.business_events sale totals logged during the
-- session window (opened_at..closed_at) — see RegisterSessionRepository.
-- This treats every sale as cash-equivalent for now, since business_events
-- has no payment-method field yet; a real payment-method split is a later
-- increment once orders/payments exist, not assumed here.

BEGIN;

CREATE TABLE business_operations.register_sessions (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid          NOT NULL REFERENCES tenancy.tenants(id)     ON DELETE RESTRICT,
  workspace_id    uuid          NOT NULL REFERENCES tenancy.workspaces(id)  ON DELETE RESTRICT,
  business_id     uuid          NOT NULL REFERENCES platform.businesses(id) ON DELETE RESTRICT,
  register_name   text          NOT NULL DEFAULT 'Main Register',
  status          text          NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  opened_by       text,
  closed_by       text,
  opening_cash    numeric(18,4) NOT NULL CHECK (opening_cash >= 0),
  closing_cash    numeric(18,4)          CHECK (closing_cash IS NULL OR closing_cash >= 0),
  expected_cash   numeric(18,4),
  variance        numeric(18,4),
  notes           text,
  opened_at       timestamptz   NOT NULL DEFAULT now(),
  closed_at       timestamptz,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now(),
  CHECK (
    (status = 'open'  AND closed_at IS NULL     AND closing_cash IS NULL) OR
    (status = 'closed' AND closed_at IS NOT NULL AND closing_cash IS NOT NULL)
  )
);

INSERT INTO _migrations (filename) VALUES ('0165_create_register_sessions.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
