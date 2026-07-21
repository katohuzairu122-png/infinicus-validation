-- Migration: 0024_create_bo_customer_pipeline
-- Stage 2C — CRM pipeline: leads, opportunities, opportunity activities, customer accounts

BEGIN;

-- ── business_operations.leads ────────────────────────────────────────────────

CREATE TABLE business_operations.leads (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)     ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)  ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id) ON DELETE RESTRICT,
  lead_code        text          NOT NULL,
  company_name     text,
  contact_name     text          NOT NULL,
  contact_email    citext,
  contact_phone    text,
  lead_source      text          NOT NULL DEFAULT 'unknown' CHECK (lead_source IN (
                                   'web','referral','cold_call','event','social',
                                   'partner','advertising','unknown','other'
                                 )),
  lead_status      text          NOT NULL DEFAULT 'new' CHECK (lead_status IN (
                                   'new','contacted','qualified','disqualified','converted'
                                 )),
  score            integer       NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  assigned_to      uuid          REFERENCES platform.employees(id) ON DELETE SET NULL,
  notes            text,
  converted_at     timestamptz,
  customer_id      uuid          REFERENCES platform.customers(id) ON DELETE SET NULL,
  status           text          NOT NULL DEFAULT 'active',
  version          integer       NOT NULL DEFAULT 1,
  source_system    text          NOT NULL DEFAULT 'INFINICUS',
  source_record_id text,
  correlation_id   uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  created_by       uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT leads_code_business_unique UNIQUE (business_id, lead_code)
);

-- ── business_operations.opportunities ────────────────────────────────────────

CREATE TABLE business_operations.opportunities (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id        uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id         uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  customer_id         uuid          NOT NULL REFERENCES platform.customers(id)   ON DELETE RESTRICT,
  lead_id             uuid          REFERENCES business_operations.leads(id)     ON DELETE SET NULL,
  opportunity_code    text          NOT NULL,
  name                text          NOT NULL,
  stage               text          NOT NULL DEFAULT 'qualification' CHECK (stage IN (
                                      'qualification','needs_analysis','proposal',
                                      'negotiation','closed_won','closed_lost'
                                    )),
  probability         numeric(5,2)  NOT NULL DEFAULT 0
                                    CHECK (probability BETWEEN 0 AND 100),
  estimated_value     numeric(18,4) NOT NULL DEFAULT 0,
  currency_code       text          NOT NULL DEFAULT 'USD',
  expected_close_date date,
  actual_close_date   date,
  assigned_to         uuid          REFERENCES platform.employees(id) ON DELETE SET NULL,
  lost_reason         text,
  status              text          NOT NULL DEFAULT 'active',
  version             integer       NOT NULL DEFAULT 1,
  source_system       text          NOT NULL DEFAULT 'INFINICUS',
  source_record_id    text,
  correlation_id      uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),
  created_by          uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT opportunities_code_business_unique UNIQUE (business_id, opportunity_code)
);

-- ── business_operations.opportunity_activities ────────────────────────────────
-- Append-only activity log for opportunities.

CREATE TABLE business_operations.opportunity_activities (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)                   ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)                ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)               ON DELETE RESTRICT,
  opportunity_id   uuid          NOT NULL REFERENCES business_operations.opportunities(id) ON DELETE RESTRICT,
  activity_type    text          NOT NULL CHECK (activity_type IN (
                                   'call','email','meeting','demo','proposal_sent',
                                   'follow_up','stage_change','note','other'
                                 )),
  subject          text          NOT NULL,
  notes            text,
  performed_by     uuid          REFERENCES platform.employees(id) ON DELETE SET NULL,
  occurred_at      timestamptz   NOT NULL DEFAULT now(),
  correlation_id   uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at       timestamptz   NOT NULL DEFAULT now()
);

-- ── business_operations.customer_accounts ─────────────────────────────────────
-- BO-layer extension for platform.customers with account management details.

CREATE TABLE business_operations.customer_accounts (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id        uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id         uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  customer_id         uuid          NOT NULL REFERENCES platform.customers(id)   ON DELETE RESTRICT,
  account_manager_id  uuid          REFERENCES platform.employees(id)            ON DELETE SET NULL,
  credit_limit        numeric(18,4) NOT NULL DEFAULT 0,
  payment_terms_days  integer       NOT NULL DEFAULT 30 CHECK (payment_terms_days >= 0),
  discount_rate       numeric(5,4)  NOT NULL DEFAULT 0
                                    CHECK (discount_rate BETWEEN 0 AND 1),
  account_tier        text          NOT NULL DEFAULT 'standard' CHECK (account_tier IN (
                                      'strategic','premium','standard','basic'
                                    )),
  notes               text,
  status              text          NOT NULL DEFAULT 'active',
  version             integer       NOT NULL DEFAULT 1,
  source_system       text          NOT NULL DEFAULT 'INFINICUS',
  correlation_id      uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),
  created_by          uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT customer_accounts_customer_business_unique UNIQUE (business_id, customer_id)
);

INSERT INTO _migrations (filename) VALUES ('0024_create_bo_customer_pipeline.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
