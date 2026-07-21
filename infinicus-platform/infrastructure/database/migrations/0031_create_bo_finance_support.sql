-- Migration: 0031_create_bo_finance_support
-- Stage 2C — Expense claims, expense items, support cases, case activities (append-only)

BEGIN;

-- ── business_operations.expense_claims ───────────────────────────────────────

CREATE TABLE business_operations.expense_claims (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  employee_id      uuid          NOT NULL REFERENCES platform.employees(id)   ON DELETE RESTRICT,
  claim_number     text          NOT NULL,
  claim_date       date          NOT NULL DEFAULT CURRENT_DATE,
  currency_code    text          NOT NULL DEFAULT 'USD',
  total_amount     numeric(18,4) NOT NULL DEFAULT 0,
  claim_status     text          NOT NULL DEFAULT 'draft' CHECK (claim_status IN (
                                   'draft','submitted','approved','rejected','paid','cancelled'
                                 )),
  submitted_at     timestamptz,
  approved_by      uuid          REFERENCES platform.employees(id) ON DELETE SET NULL,
  approved_at      timestamptz,
  paid_at          timestamptz,
  payment_reference text,
  purpose          text          NOT NULL,
  notes            text,
  status           text          NOT NULL DEFAULT 'active',
  version          integer       NOT NULL DEFAULT 1,
  source_system    text          NOT NULL DEFAULT 'INFINICUS',
  correlation_id   uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  created_by       uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT expense_claims_number_business_unique UNIQUE (business_id, claim_number)
);

-- ── business_operations.expense_items ────────────────────────────────────────

CREATE TABLE business_operations.expense_items (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)                  ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)               ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)              ON DELETE RESTRICT,
  expense_claim_id uuid          NOT NULL REFERENCES business_operations.expense_claims(id) ON DELETE RESTRICT,
  line_number      integer       NOT NULL CHECK (line_number > 0),
  expense_date     date          NOT NULL,
  category         text          NOT NULL CHECK (category IN (
                                   'travel','accommodation','meals','entertainment',
                                   'communication','supplies','training','other'
                                 )),
  description      text          NOT NULL,
  amount           numeric(18,4) NOT NULL CHECK (amount > 0),
  currency_code    text          NOT NULL DEFAULT 'USD',
  receipt_reference text,
  billable         boolean       NOT NULL DEFAULT false,
  customer_id      uuid          REFERENCES platform.customers(id) ON DELETE SET NULL,
  correlation_id   uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT expense_items_unique UNIQUE (expense_claim_id, line_number)
);

-- ── business_operations.support_cases ────────────────────────────────────────

CREATE TABLE business_operations.support_cases (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  customer_id      uuid          NOT NULL REFERENCES platform.customers(id)   ON DELETE RESTRICT,
  case_number      text          NOT NULL,
  subject          text          NOT NULL,
  description      text,
  category         text          NOT NULL DEFAULT 'general' CHECK (category IN (
                                   'billing','product','service','delivery','technical',
                                   'complaint','general','other'
                                 )),
  priority         text          NOT NULL DEFAULT 'normal' CHECK (priority IN (
                                   'critical','high','normal','low'
                                 )),
  case_status      text          NOT NULL DEFAULT 'open' CHECK (case_status IN (
                                   'open','in_progress','pending_customer','pending_internal',
                                   'resolved','closed','escalated'
                                 )),
  assigned_to      uuid          REFERENCES platform.employees(id) ON DELETE SET NULL,
  opened_at        timestamptz   NOT NULL DEFAULT now(),
  resolved_at      timestamptz,
  closed_at        timestamptz,
  resolution_notes text,
  sla_due_at       timestamptz,
  order_id         uuid          REFERENCES platform.orders(id) ON DELETE SET NULL,
  invoice_id       uuid          REFERENCES platform.invoices(id) ON DELETE SET NULL,
  status           text          NOT NULL DEFAULT 'active',
  version          integer       NOT NULL DEFAULT 1,
  source_system    text          NOT NULL DEFAULT 'INFINICUS',
  source_record_id text,
  correlation_id   uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  created_by       uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT support_cases_number_business_unique UNIQUE (business_id, case_number)
);

-- ── business_operations.case_activities ──────────────────────────────────────
-- Append-only interaction log for support cases.

CREATE TABLE business_operations.case_activities (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)                  ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)               ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)              ON DELETE RESTRICT,
  support_case_id  uuid          NOT NULL REFERENCES business_operations.support_cases(id) ON DELETE RESTRICT,
  activity_type    text          NOT NULL CHECK (activity_type IN (
                                   'note','reply_to_customer','internal_comment',
                                   'status_change','assignment','escalation','resolution','other'
                                 )),
  performed_by     uuid          REFERENCES platform.employees(id) ON DELETE SET NULL,
  content          text          NOT NULL,
  previous_status  text,
  new_status       text,
  is_customer_visible boolean    NOT NULL DEFAULT false,
  occurred_at      timestamptz   NOT NULL DEFAULT now(),
  correlation_id   uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at       timestamptz   NOT NULL DEFAULT now()
);

INSERT INTO _migrations (filename) VALUES ('0031_create_bo_finance_support.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
