-- Migration: 0137_seed_auth_roles_permissions
-- BUILD-18 — Authentication and Authorization: seed baseline system roles
-- and the platform permission catalog. No schema changes — tenancy.roles,
-- tenancy.permissions, and tenancy.role_permissions already exist from
-- 0003_create_tenancy_schema.sql (Stage 1 foundation).
--
-- System roles have tenant_id IS NULL and are visible platform-wide
-- (see tenancy.roles' own comment and the roles_isolation RLS policy in
-- 0011_create_rls_policies.sql). Tenants may additionally define their own
-- tenant-scoped roles at runtime; this migration seeds only the four
-- baseline system roles every tenant can assign from day one.

BEGIN;

-- ── Permission catalog: read/write/admin per business layer + platform ──────

INSERT INTO tenancy.permissions (code, resource, action, description) VALUES
  ('da:read',   'data_acquisition',           'read',  'View data acquisition sources, connectors, and collected data'),
  ('da:write',  'data_acquisition',           'write', 'Manage data acquisition sources, connectors, and collection runs'),
  ('da:admin',  'data_acquisition',           'admin', 'Administer data acquisition configuration and credentials'),
  ('bo:read',   'business_operations',        'read',  'View business operations records'),
  ('bo:write',  'business_operations',        'write', 'Manage business operations records'),
  ('bo:admin',  'business_operations',        'admin', 'Administer business operations configuration'),
  ('bi:read',   'business_intelligence',      'read',  'View business intelligence insights and analyses'),
  ('bi:write',  'business_intelligence',      'write', 'Manage business intelligence analyses and metrics'),
  ('bi:admin',  'business_intelligence',      'admin', 'Administer business intelligence configuration'),
  ('dt:read',   'business_digital_twin',      'read',  'View digital twin definitions and snapshots'),
  ('dt:write',  'business_digital_twin',      'write', 'Manage digital twin definitions and snapshots'),
  ('dt:admin',  'business_digital_twin',      'admin', 'Administer digital twin configuration'),
  ('sim:read',  'simulation',                 'read',  'View simulation models and results'),
  ('sim:write', 'simulation',                 'write', 'Manage simulation models and runs'),
  ('sim:admin', 'simulation',                 'admin', 'Administer simulation configuration'),
  ('adi:read',  'ai_decision_intelligence',   'read',  'View AI decision recommendations'),
  ('adi:write', 'ai_decision_intelligence',   'write', 'Manage AI decision cases and reasoning runs'),
  ('adi:admin', 'ai_decision_intelligence',   'admin', 'Administer AI decision intelligence configuration'),
  ('aba:read',  'approved_business_action',   'read',  'View approved business actions and decisions'),
  ('aba:write', 'approved_business_action',   'write', 'Render approval decisions and manage approved actions'),
  ('aba:admin', 'approved_business_action',   'admin', 'Administer approval policy and authority configuration'),
  ('om:read',   'outcome_monitoring',         'read',  'View outcome observations and reviews'),
  ('om:write',  'outcome_monitoring',         'write', 'Manage monitoring plans and outcome observations'),
  ('om:admin',  'outcome_monitoring',         'admin', 'Administer outcome monitoring configuration'),
  ('cl:read',   'continuous_learning',        'read',  'View learning cases, lessons, and improvement proposals'),
  ('cl:write',  'continuous_learning',        'write', 'Manage learning cases and improvement proposals'),
  ('cl:admin',  'continuous_learning',        'admin', 'Administer continuous learning configuration'),
  ('platform:member_manage', 'platform',      'manage_members', 'Invite, remove, and reassign roles for workspace members'),
  ('platform:admin',         'platform',      'admin',          'Full tenant and workspace administration, including billing and role management')
ON CONFLICT (code) DO NOTHING;

-- ── System roles (tenant_id IS NULL — visible to every tenant) ──────────────

INSERT INTO tenancy.roles (tenant_id, code, name, description, scope, is_system) VALUES
  (NULL, 'owner',  'Owner',  'Full control of the tenant, including billing and role management', 'tenant', true),
  (NULL, 'admin',  'Admin',  'Full operational control across all layers, excluding tenant administration', 'tenant', true),
  (NULL, 'member', 'Member', 'Read and write access across all layers', 'tenant', true),
  (NULL, 'viewer', 'Viewer', 'Read-only access across all layers', 'tenant', true)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ── Role/permission mappings ─────────────────────────────────────────────────

-- owner: every permission
INSERT INTO tenancy.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM tenancy.roles r
CROSS JOIN tenancy.permissions p
WHERE r.tenant_id IS NULL AND r.code = 'owner'
ON CONFLICT DO NOTHING;

-- admin: every permission except platform:admin
INSERT INTO tenancy.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM tenancy.roles r
CROSS JOIN tenancy.permissions p
WHERE r.tenant_id IS NULL AND r.code = 'admin' AND p.code <> 'platform:admin'
ON CONFLICT DO NOTHING;

-- member: read and write on every layer, no admin/platform permissions
INSERT INTO tenancy.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM tenancy.roles r
CROSS JOIN tenancy.permissions p
WHERE r.tenant_id IS NULL AND r.code = 'member' AND p.action IN ('read','write')
ON CONFLICT DO NOTHING;

-- viewer: read-only on every layer
INSERT INTO tenancy.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM tenancy.roles r
CROSS JOIN tenancy.permissions p
WHERE r.tenant_id IS NULL AND r.code = 'viewer' AND p.action = 'read'
ON CONFLICT DO NOTHING;

INSERT INTO _migrations (filename) VALUES ('0137_seed_auth_roles_permissions.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
