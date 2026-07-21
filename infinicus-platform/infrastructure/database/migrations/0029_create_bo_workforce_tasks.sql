-- Migration: 0029_create_bo_workforce_tasks
-- Stage 2C — Employee assignments, work schedules, tasks, workflow instances

BEGIN;

-- ── business_operations.employee_assignments ──────────────────────────────────

CREATE TABLE business_operations.employee_assignments (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id      uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id       uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  employee_id       uuid          NOT NULL REFERENCES platform.employees(id)   ON DELETE RESTRICT,
  assignment_code   text          NOT NULL,
  assignment_type   text          NOT NULL DEFAULT 'project' CHECK (assignment_type IN (
                                    'project','department','function','temporary','other'
                                  )),
  title             text          NOT NULL,
  reference_type    text,
  reference_id      uuid,
  valid_from        date          NOT NULL DEFAULT CURRENT_DATE,
  valid_to          date,
  allocation_pct    numeric(5,2)  NOT NULL DEFAULT 100
                                  CHECK (allocation_pct > 0 AND allocation_pct <= 100),
  status            text          NOT NULL DEFAULT 'active',
  version           integer       NOT NULL DEFAULT 1,
  source_system     text          NOT NULL DEFAULT 'INFINICUS',
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  created_by        uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT employee_assignments_code_business_unique UNIQUE (business_id, assignment_code),
  CONSTRAINT employee_assignments_period_check CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

-- ── business_operations.work_schedules ───────────────────────────────────────

CREATE TABLE business_operations.work_schedules (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  employee_id      uuid          NOT NULL REFERENCES platform.employees(id)   ON DELETE RESTRICT,
  schedule_code    text          NOT NULL,
  schedule_type    text          NOT NULL DEFAULT 'fixed' CHECK (schedule_type IN (
                                   'fixed','flexible','shift','on_call','remote','other'
                                 )),
  valid_from       date          NOT NULL,
  valid_to         date,
  weekly_hours     numeric(5,2)  NOT NULL DEFAULT 40 CHECK (weekly_hours > 0),
  schedule_detail  jsonb         NOT NULL DEFAULT '{}',
  status           text          NOT NULL DEFAULT 'active',
  version          integer       NOT NULL DEFAULT 1,
  source_system    text          NOT NULL DEFAULT 'INFINICUS',
  correlation_id   uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  created_by       uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT work_schedules_code_business_unique UNIQUE (business_id, schedule_code),
  CONSTRAINT work_schedules_period_check CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

-- ── business_operations.tasks ─────────────────────────────────────────────────

CREATE TABLE business_operations.tasks (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  task_code        text          NOT NULL,
  title            text          NOT NULL,
  description      text,
  task_type        text          NOT NULL DEFAULT 'general' CHECK (task_type IN (
                                   'sales','procurement','operations','finance',
                                   'support','compliance','hr','general','other'
                                 )),
  priority         text          NOT NULL DEFAULT 'normal' CHECK (priority IN (
                                   'critical','high','normal','low'
                                 )),
  task_status      text          NOT NULL DEFAULT 'open' CHECK (task_status IN (
                                   'open','in_progress','blocked','completed','cancelled'
                                 )),
  due_date         date,
  completed_at     timestamptz,
  reference_type   text,
  reference_id     uuid,
  parent_task_id   uuid          REFERENCES business_operations.tasks(id) ON DELETE SET NULL,
  status           text          NOT NULL DEFAULT 'active',
  version          integer       NOT NULL DEFAULT 1,
  source_system    text          NOT NULL DEFAULT 'INFINICUS',
  correlation_id   uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  created_by       uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT tasks_code_business_unique UNIQUE (business_id, task_code)
);

-- ── business_operations.task_assignments ──────────────────────────────────────

CREATE TABLE business_operations.task_assignments (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid          NOT NULL REFERENCES tenancy.tenants(id)          ON DELETE RESTRICT,
  workspace_id   uuid          NOT NULL REFERENCES tenancy.workspaces(id)       ON DELETE RESTRICT,
  business_id    uuid          NOT NULL REFERENCES platform.businesses(id)      ON DELETE RESTRICT,
  task_id        uuid          NOT NULL REFERENCES business_operations.tasks(id) ON DELETE RESTRICT,
  employee_id    uuid          NOT NULL REFERENCES platform.employees(id)       ON DELETE RESTRICT,
  role           text          NOT NULL DEFAULT 'assignee' CHECK (role IN (
                                 'assignee','reviewer','observer','approver'
                               )),
  assigned_at    timestamptz   NOT NULL DEFAULT now(),
  accepted_at    timestamptz,
  status         text          NOT NULL DEFAULT 'active',
  correlation_id uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT task_assignments_unique UNIQUE (task_id, employee_id, role)
);

-- ── business_operations.workflow_instances ────────────────────────────────────

CREATE TABLE business_operations.workflow_instances (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id      uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id       uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  workflow_code     text          NOT NULL,
  workflow_type     text          NOT NULL CHECK (workflow_type IN (
                                    'order_approval','po_approval','expense_approval',
                                    'credit_approval','onboarding','offboarding',
                                    'compliance_review','other'
                                  )),
  current_stage     text          NOT NULL DEFAULT 'initiated',
  trigger_type      text,
  trigger_id        uuid,
  workflow_status   text          NOT NULL DEFAULT 'active' CHECK (workflow_status IN (
                                    'active','completed','failed','cancelled'
                                  )),
  started_at        timestamptz   NOT NULL DEFAULT now(),
  completed_at      timestamptz,
  context_data      jsonb         NOT NULL DEFAULT '{}',
  status            text          NOT NULL DEFAULT 'active',
  version           integer       NOT NULL DEFAULT 1,
  source_system     text          NOT NULL DEFAULT 'INFINICUS',
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  created_by        uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT workflow_instances_code_business_unique UNIQUE (business_id, workflow_code)
);

INSERT INTO _migrations (filename) VALUES ('0029_create_bo_workforce_tasks.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
