# Database Schema Map

## Schema ownership

| Schema    | Owner                            | Tables |
|-----------|----------------------------------|--------|
| `public`  | Stage 1 foundation               | `_migrations`, `tenants`, `workspaces`, `users`, `workspace_members`, `businesses`, `audit_log`, `platform_events` |
| `tenancy` | Tenancy & RBAC layer             | `tenants`, `workspaces`, `roles`, `permissions`, `role_permissions`, `memberships`, `membership_roles`, `invitations` |
| `identity`| Identity & authentication layer  | `users`, `user_profiles`, `service_accounts`, `api_key_references`, `sessions` |
| `platform`| Core business structures + entities | `businesses`, `organization_units`, `departments`, `locations`, `system_settings`, `feature_flags`, `customers`, `suppliers`, `employees`, `products`, `services`, `orders`, `invoices`, `payments`, `inventory_items`, `warehouses`, `assets`, `operational_events`, `metrics`, `simulations`, `decisions`, `approved_actions`, `outcomes`, `learning_items` |
| `audit`   | Audit trail (append-only)        | `audit_events`, `entity_versions`, `access_events` |
| `events`  | Transactional event backbone     | `outbox_events`, `inbox_events`, `dead_letter_events`, `event_subscriptions`, `event_delivery_attempts` |
| `files`   | File object metadata             | `file_objects`, `file_versions`, `file_links`, `file_access_events` |

## Foreign key hierarchy

```
tenancy.tenants
  └─ tenancy.workspaces
       └─ tenancy.memberships ─── identity.users
       └─ tenancy.invitations
       └─ identity.service_accounts
       └─ platform.businesses
            ├─ platform.organization_units (self-ref parent_unit_id)
            ├─ platform.departments
            ├─ platform.locations
            ├─ platform.customers
            ├─ platform.suppliers
            ├─ platform.employees ─── identity.users
            ├─ platform.products
            ├─ platform.services
            ├─ platform.orders ──── platform.customers
            ├─ platform.invoices ── platform.customers, platform.orders
            ├─ platform.payments ── platform.customers, platform.invoices
            ├─ platform.inventory_items ── platform.products
            ├─ platform.warehouses ── platform.locations
            ├─ platform.assets ── platform.locations
            ├─ platform.simulations
            ├─ platform.decisions
            ├─ platform.approved_actions ── platform.decisions
            ├─ platform.outcomes ── platform.approved_actions
            └─ platform.learning_items ── platform.outcomes

identity.users
  └─ identity.user_profiles ── files.file_objects (avatar)
  └─ identity.sessions
  └─ identity.service_accounts
       └─ identity.api_key_references

files.file_objects
  └─ files.file_versions
  └─ files.file_links
  └─ files.file_access_events ── tenancy.tenants, identity.users

audit.audit_events ── tenancy.tenants
audit.entity_versions ── tenancy.tenants
audit.access_events ── tenancy.tenants, identity.users

events.outbox_events ── tenancy.tenants
  └─ events.event_delivery_attempts
events.inbox_events ── tenancy.tenants
```

## RLS-enabled tables

All tables with a `tenant_id` column have RLS enabled. `identity.users` and `identity.user_profiles` are global (no `tenant_id`). Append-only tables have RLS enabled for read isolation but no `updated_at` trigger.

## Append-only tables (no UPDATE/DELETE by application role)

- `audit.audit_events`
- `audit.entity_versions`
- `audit.access_events`
- `events.event_delivery_attempts`
- `files.file_access_events`
- `platform.operational_events`
