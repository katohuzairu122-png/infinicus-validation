# Runbook: Security Incident Handling

**When to use:** suspected or confirmed credential compromise, unauthorized data access, a successful injection/exploit attempt, or any finding from BUILD-26's security tooling (dependency scan, SAST, DAST, rate-limit/injection tests) escalating to an active exploit rather than a caught-in-testing finding.

This is always **Sev1**, regardless of apparent scope — a security incident's true blast radius is often unknown at declaration time, and downgrading prematurely is the more dangerous failure mode.

## Steps

1. **Declare immediately** at `sev1`, even before full triage: `POST /v1/incidents`.
2. **Contain first, investigate second** — do not wait for full root-cause understanding before cutting off active harm:
   - **Compromised credential** (API key, session token, database credential): reuse BUILD-24's rotation tooling immediately.
     ```bash
     ADMIN_DATABASE_URL="<admin connection>" \
     APP_ROLE="<the compromised role>" \
     DB_HOST="<host>" DB_PORT="5432" DB_NAME="<db>" \
     ENVIRONMENT="<environment>" \
       infrastructure/deployment/scripts/rotate-db-credential.sh
     ```
     For an API key/session, revoke it directly via the existing `identity.api_key_references`/session-invalidation repository methods (BUILD-18/21) — do not wait for the user to notice.
   - **Suspected unauthorized data access to a specific tenant**: confirm via `audit.access_events`/`audit.audit_events` (BUILD-18) which rows/routes were actually touched — this is the same audit trail every prior build's RLS/tenant-isolation testing already relies on being complete and accurate.
   - **Active exploit against a known vulnerability class** (SQLi/XSS/injection): confirm BUILD-26's mitigations are actually in place and not bypassed (parameterized queries, input validation, `@fastify/helmet` headers) — if a bypass is found, that is itself the root cause to fix, not a separate incident.
3. **Post regular timeline updates** (every 30 minutes per severity-model.md for Sev1) — internal-only (`isCustomerFacing: false`) until legal/communications has approved customer-facing language, per communication-templates.md's security-incident template.
4. **Assess whether tenant data was genuinely exposed.** If yes: this becomes a data-breach notification matter (jurisdiction-dependent legal obligations — outside this codebase's scope; escalate to whoever owns compliance in a real deployment) as well as a technical incident.
5. **Consider whether BUILD-26's right-to-erasure/audit tooling is relevant** to the response (e.g., if a specific tenant's data must be purged as part of remediation, `delete-tenant-data.mjs` is the same audited mechanism a normal erasure request uses — see BUILD-26/27's own docs for its safety properties and known limitations around append-only audit tables).
6. **Root cause and fix** before resolving — a security incident is not "resolved" merely because active exploitation stopped; the vulnerability that enabled it must be closed.
7. **Resolve with a mandatory postmortem** (see post-incident-review-template.md) — every security incident requires one, no exceptions, and the review should explicitly re-run BUILD-26's dependency-scan/SAST/DAST tooling to confirm the specific gap is now caught by automated checks going forward, not just manually fixed once.
