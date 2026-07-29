-- Seed: 0001_system_roles
-- Development-only seed: system roles, sample permissions, role-permission mappings.
-- Execute explicitly against a development/test database only.
-- NEVER run against production. No real accounts or credentials are created.

BEGIN;

-- System roles: tenant_id IS NULL marks them as platform-wide.
INSERT INTO tenancy.roles (code, name, description, scope, is_system) VALUES
  ('platform_owner',         'Platform Owner',         'Full platform access',                           'platform',  true),
  ('platform_administrator', 'Platform Administrator', 'Platform-level administration',                  'platform',  true),
  ('business_owner',         'Business Owner',         'Full access within an assigned business',        'business',  true),
  ('business_administrator', 'Business Administrator', 'Administrative access within a business',        'business',  true),
  ('manager',                'Manager',                'Management access across assigned workspace',     'workspace', true),
  ('analyst',                'Analyst',                'Read and analyse data; cannot modify records',   'workspace', true),
  ('operator',               'Operator',               'Execute operational tasks within workspace',     'workspace', true),
  ('reviewer',               'Reviewer',               'Review and approve pending items',               'workspace', true),
  ('auditor',                'Auditor',                'Read-only access to audit records',              'workspace', true),
  ('read_only',              'Read Only',              'Read-only access to non-sensitive records',      'workspace', true)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- Sample permissions using resource:action notation.
INSERT INTO tenancy.permissions (code, resource, action, description) VALUES
  ('platform:read',          'platform',    'read',    'Read platform-level settings'),
  ('platform:write',         'platform',    'write',   'Write platform-level settings'),
  ('tenants:read',           'tenants',     'read',    'Read tenant records'),
  ('tenants:write',          'tenants',     'write',   'Write tenant records'),
  ('workspaces:read',        'workspaces',  'read',    'Read workspace records'),
  ('workspaces:write',       'workspaces',  'write',   'Write workspace records'),
  ('users:read',             'users',       'read',    'Read user records'),
  ('users:write',            'users',       'write',   'Write user records'),
  ('businesses:read',        'businesses',  'read',    'Read business records'),
  ('businesses:write',       'businesses',  'write',   'Write business records'),
  ('audit:read',             'audit',       'read',    'Read audit events'),
  ('simulations:run',        'simulations', 'run',     'Trigger and run simulations'),
  ('decisions:read',         'decisions',   'read',    'Read AI-generated decisions'),
  ('decisions:approve',      'decisions',   'approve', 'Approve AI-generated decisions'),
  ('outcomes:read',          'outcomes',    'read',    'Read outcome evaluation records'),
  ('files:read',             'files',       'read',    'Read file metadata'),
  ('files:write',            'files',       'write',   'Upload and manage files')
ON CONFLICT (code) DO NOTHING;

COMMIT;
