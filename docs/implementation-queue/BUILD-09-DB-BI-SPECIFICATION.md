# BUILD-09 Specification — DB-BI: Database Stage 2D Business Intelligence Persistence

- **Build ID:** BUILD-09
- **Layer:** DB-BI (database persistence tier for the BI layer — distinct from the completed browser BI root blocks, BUILD-02)
- **Status:** ready (specification frozen 2026-07-21; implementation not started)
- **Depends on:** Stage 2C (Business Operations persistence) — completed and frozen
- **Authorized by:** repository owner scope decision, 2026-07-21

---

## 1. Objective

Implement **Database Stage 2D — Business Intelligence persistence** only:
a new PostgreSQL schema `business_intelligence`, its tables, RLS, triggers,
outbox event functions, and the corresponding strict-TypeScript repository
adapters — so that Business Intelligence has an authoritative, tenant-isolated
persistence tier consuming validated Business Operations publication
packages and producing analytical evidence (metrics, analyses, findings,
trends, forecasts, anomalies, benchmarks, risk intelligence) that it can
publish onward to Business Digital Twin, Simulation, and AI Decision
Intelligence.

BUILD-09 is **database and repository work only**. It does not touch the
browser BI root blocks (`business-intelligence/`, completed in BUILD-02), it
does not implement analytical algorithms, and it does not implement any
downstream consumer.

## 2. Pre-Authoring Findings (verified 2026-07-21 — do not re-guess)

| Question | Finding | Evidence |
|---|---|---|
| Final frozen Stage 2C migration | **0036** (`0036_create_bo_triggers_events.sql`) | `infinicus-platform/infrastructure/database/migrations/` directory listing; confirmed in `docs/database/IMPLEMENTATION_STATUS.md` ("Frozen migration range: 0001–0036") |
| Next available Stage 2D migration | **0037** | Directly follows 0036; no gap, no guess |
| Canonical BO publication-package table | `business_operations.bo_publication_packages` — columns `id, tenant_id, workspace_id, business_id, package_code, target_layer (CHECK includes 'business_intelligence'), target_block, period_start, period_end, record_count, payload_reference jsonb, package_status (draft/ready/dispatched/received/failed/cancelled), dispatched_at, acknowledged_at, correlation_id` | `infrastructure/database/migrations/0033_create_bo_performance_publication.sql` |
| Canonical BO handoff audit table | `business_operations.bo_handoff_records` (append-only; `handoff_type` dispatch/acknowledgement/failure/retry/cancellation; FK to `bo_publication_packages`) | same file |
| BO-to-BI handoff placeholder | `packages/handoff-contracts/src/bo-to-bi.ts` — exists, currently `{ correlationId: string; // TODO }` | file read directly |
| BI event definitions | Only `'bi.insight.generated'` exists in `packages/event-contracts/src/index.ts`'s `LayerEventType` union; the type has an open extension point (`\| (string & {})`) so additional `bi.*` events are additive, not breaking |
| BI repository interfaces/stubs | None exist yet in `packages/database/src/repositories/` (only `bo/` and `da/` directories exist) |
| BI architecture blocks (browser, completed BUILD-02) | 25 blocks in `business-intelligence/INFINICUS-BI-01…25`: BI-08 Warehouse/Analytical Storage, BI-09 Metric/KPI Registry, BI-10 Metric Calculation/Aggregation, BI-11…18 domain intelligence engines (financial, sales, customer, marketing, operations, inventory, workforce, market), BI-19 Trend/Variance/Benchmark, BI-20 Anomaly/Signal Detection, BI-21 Root-Cause/Driver Analysis, BI-22 Dashboard/Reporting, BI-23 Alert/Notification, BI-24 Digital Twin Publication Handoff, BI-25 Master Integration. These define the domain vocabulary the schema must mirror (metrics, KPIs, findings/root-cause, trends, anomalies, benchmarks, risk — BI-11/16/17/24 explicitly reference "risk"; BI-24 explicitly publishes "Risk and anomaly" and preserves "Intelligence lineage" and "confidence") |
| RLS convention (Stage 2A–2C) | `ENABLE ROW LEVEL SECURITY` + null-safe policy `tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid`. **No table currently uses `FORCE ROW LEVEL SECURITY`.** |
| Trigger convention | Reuses `set_updated_at()` from `0001_foundation.sql`; NOT applied to append-only tables (documented per-migration) |
| Outbox convention | `SECURITY DEFINER` SQL functions per schema calling a local `emit_outbox_event(...)` helper, writing to `events.outbox_events`; application role has no direct grant on the outbox table |
| Canonical identity | `tenancy.tenants`, `tenancy.workspaces`, `platform.businesses`, `identity.users`, `identity.service_accounts` — reused, never duplicated |

**Stage 2C freeze conflict check:** none found. `docs/database/IMPLEMENTATION_STATUS.md` and the actual migrations directory agree on migration 0036 as the final frozen file; `docs/database-stage-2c-business-operations.md` independently confirms the same range. No blocker.

## 3. Canonical Schema

`business_intelligence` — the only schema this build may create. Forbidden
competing schema names: `bi`, `analytics`, `intelligence`, or any other
alias. BUILD-09 is the persistence/repository layer; it must not be confused
with the browser BI root blocks (already complete), or with DA/BO/DT/SIM/ADI
persistence.

## 4. Business Intelligence Ownership Boundary

**Owns (Stage 2D persists these):** validated analytical intake, analytical
datasets and versions, metric definitions and calculated values,
time-series values, analysis requests/runs, findings and evidence, trends,
forecasts and forecast accuracy, anomaly rules and detections, benchmarks
and comparisons, risk intelligence, insight publication, BI publication
packages, BI component registry and deployment state.

**Must NOT own or duplicate:** tenant/workspace/business identity, users or
service accounts, operational customers/orders/payments/expenses/suppliers/
inventory/operational transactions (all `business_operations` /
`platform`), Data Acquisition raw records, Digital Twin state, Simulation
runs, ADI recommendations, approved actions. **Never create
`tenancy.businesses`** or any duplicate business table — `platform.businesses`
is canonical.

## 5. Migration Rules

- First Stage 2D migration is **`0037_...`**; migrations continue
  sequentially from there with no gaps.
- **Frozen migrations 0001–0036 must not be edited, renumbered, or
  reordered.** Any defect discovered in a frozen migration during BUILD-09
  work is corrected with a new forward-only Stage 2D migration — never by
  editing history.
- Deterministic ordering: each migration file numbered and applied in
  strict numeric order by the existing migration runner.
- Required live validations before freeze: clean empty-database
  application of 0001–0037+ in order; migration rerun/idempotency (the
  runner's `_migrations` registry must make re-running a no-op); rollback
  verified per the existing convention (Stage 2A–2C document no automated
  down-migrations — BUILD-09 follows the same forward-only convention
  unless the implementer finds a documented rollback mechanism, in which
  case that mechanism must be exercised and verified, not invented).

## 6. Canonical References (reuse, never duplicate)

`tenancy.tenants`, `tenancy.workspaces`, `platform.businesses`,
`identity.users`, `identity.service_accounts`,
`business_operations.bo_publication_packages`,
`business_operations.bo_handoff_records`, existing audit actor references
(`identity.users(id)` as `created_by`/actor), existing `correlation_id` /
causation conventions, existing `events.outbox_events` infrastructure via
per-schema `SECURITY DEFINER emit_*` functions.

## 7. Required Table Groups (under `business_intelligence`)

Exact table names must follow the naming style already established in
`business_operations` (snake_case, domain-first) and mirror the BI-01…25
block vocabulary found in §2. The groups below are mandatory; do not invent
a duplicate table when an existing canonical table (§6) already satisfies
the requirement — e.g. do not re-persist BO orders/customers here.

**A. Intake and lineage** — `intelligence_intake_packages`,
`intelligence_intake_package_versions` (immutable/append-only),
`intelligence_source_references` (FK to
`business_operations.bo_publication_packages`),
`intelligence_domain_inputs`, `intelligence_processing_status_history`
(append-only). Must preserve lineage to the accepted BO publication package
id and its `correlation_id`.

**B. Analytical datasets** — dataset definitions; immutable dataset
versions (append-only); dataset lineage; dataset membership/data
references; effective time ranges; schema/version references; quality and
completeness metadata; publication state. Aligns with BI-08's warehouse
concept.

**C. Metrics and KPIs** — metric definitions (aligns with BI-09: base,
derived, ratio, rate, target; numerator/denominator; aggregation method;
dimensional filters; time-grain; unit/currency); definition versions;
calculation specifications; calculated metric values (append-only
observations, aligns with BI-10); time-series values; dimensions;
units/currency metadata; evidence/source references; calculation status;
quality/confidence metadata.

**D. Analysis lifecycle** — analysis requests; analysis runs; analysis
inputs; analysis outputs; analysis status history (append-only); failure
information; model/component references; execution timing/cost metadata
where supported.

**E. Findings and intelligence evidence** — findings; finding versions
(append-only); evidence references; confidence; limitations; materiality/
severity; publication status; supersession relationships; append-only audit
history. Aligns with BI-11…18 domain engines and BI-21 root-cause analysis.

**F. Trends** — trend definitions; trend observations; direction and
magnitude; effective periods; evidence; confidence; version history.
Aligns with BI-19.

**G. Forecasts** — forecast model references; forecast requests/runs;
forecast points; confidence intervals; assumptions; model/version
references; forecast accuracy records; evaluation periods; immutable
published forecasts (append-only).

**H. Anomalies** — anomaly rules; rule versions; anomaly detections;
severity; evidence; lifecycle status; acknowledgement; resolution; status
history (append-only). Aligns with BI-20.

**I. Benchmarks and comparisons** — benchmark definitions; benchmark
datasets; comparison runs; comparison results; peer/cohort references;
limitations and confidence. Aligns with BI-19's benchmark scope.

**J. Risk intelligence** — risk models; risk assessments; risk factors;
bounded scores ([0,1] or documented equivalent range); severity and
likelihood; evidence; limitations; versioning; publication status. Aligns
with BI-11/16/17/24's explicit "risk" ownership.

**K. Publication** — insight packages; insight-package versions
(append-only); publication packages (target-layer declarations limited to
`business_digital_twin`, `simulation`, `ai_decision_intelligence`, mirroring
the `bo_publication_packages.target_layer` CHECK pattern); publication
status; acknowledgement; rejection; revocation; replay/idempotency
metadata.

**L. Registry and deployment** — BI component registry; component
versions; deployments; activation state; rollback records (append-only);
compatibility metadata. Aligns with BI-25 master integration.

## 8. Database Requirements (every applicable table)

UUID primary keys (`gen_random_uuid()` default, matching Stage 2A–2C);
`tenant_id` NOT NULL FK to `tenancy.tenants`; `workspace_id` NOT NULL FK to
`tenancy.workspaces` where applicable; `business_id` FK to
`platform.businesses` where applicable (nullable only where the canonical
BO precedent — `bo_publication_packages.business_id` — is itself NOT NULL,
otherwise explicit and justified); valid foreign keys throughout; explicit
nullability on every column; unique constraints where identity requires
them; domain/CHECK constraints (statuses, enums); lifecycle-state CHECK
constraints; bounded numeric CHECK constraints (e.g. scores/confidence in
`[0,1]`, `numeric(5,4)` matching Stage 2B's `quality_score` precedent);
timestamp-order CHECK constraints (e.g. `period_end > period_start`
matching `bo_publication_packages`); indexes on all FKs and high-value
filter columns; partial indexes where justified (e.g. active/published
subsets); `created_at timestamptz NOT NULL DEFAULT now()`; `updated_at`
only on mutable (non-append-only) tables, with the established
`set_updated_at()` trigger; `correlation_id` and, where causally chained,
`causation_id`; source lineage columns tying back to
`bo_publication_packages`/`bo_handoff_records`; actor/audit metadata
(`created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL` or
`identity.service_accounts` where system-originated); retention metadata
where required by append-only evidence tables; **RLS enabled AND forced**
(`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` followed by
`ALTER TABLE ... FORCE ROW LEVEL SECURITY;`) — this strengthens, and does
not weaken, the Stage 2A–2C pattern, since no prior table used FORCE; the
null-safe fail-closed policy predicate itself follows the existing
`current_setting(..., true)` convention; append-only protections (§9);
event-outbox atomicity (§11).

## 9. Append-Only Requirements

No silent overwrite of published or historical analytical evidence.
Append-only/immutable treatment is required for: intake-package versions;
processing status history; dataset versions; calculated metric
observations; analysis execution history; published findings and finding
versions; forecast results/points and forecast accuracy history; anomaly
evidence and status history; risk assessments; published insight packages
and publication history; event-outbox records (already append-only by
Stage 2A convention); deployment and rollback history. Corrections use
versioning, supersession, or explicit lifecycle transitions — never
in-place mutation of published evidence. Enforce via table design (no
`updated_at`/no UPDATE grant) and, where the existing convention supports
it, a documented trigger-based guard consistent with Stage 2B's provenance-
immutability approach (`provenance_records` has no `updated_at` trigger and
no application UPDATE path).

## 10. RLS and Security — Live Verification Required

Live PostgreSQL tests must prove: tenant isolation; workspace isolation;
business isolation (where applicable); cross-tenant rejection (reads and
writes); missing-session-context fail-closed behaviour (no
`app.tenant_id`/`app.workspace_id` set ⇒ zero rows, per the null-safe
predicate); service-account access per existing identity policy;
publication-target authorization (only the three allowed downstream
layers); immutable-record protection (UPDATE/DELETE denied or absent on
append-only tables); forbidden lifecycle transitions rejected; unauthorized
acknowledgement/rejection/revocation rejected; provenance and evidence
columns protected from tenant-level tampering. **Must not weaken any
existing Stage 2A–2C policy** — this is additive, isolated to the new
schema.

## 11. Upstream Boundary — BO Publication Package Intake

BUILD-09 consumes only validated `business_operations.bo_publication_packages`
records via the completed DAL→BO/BO→BI handoff chain. Required: validate
package status (`ready`/`dispatched`, matching the existing CHECK values —
never accept `draft`, `failed`, or `cancelled`); validate tenant/workspace/
business ownership against the requesting context; preserve lineage
(publication package id, correlation id) into `intelligence_intake_packages`/
`intelligence_source_references`; validate schema/version compatibility;
idempotent intake keyed on the upstream package id + version (duplicate
delivery is a no-op, not an error, mirroring the established idempotency
pattern from BUILD-07/08); explicit rejection reasons for invalid state,
missing ownership, or schema mismatch; atomic intake + outbox event
publication (same transaction); **no direct mutation of any
`business_operations` table** — BI reads BO publication packages, it never
writes to BO's schema.

**BO→BI handoff contract:** complete
`infinicus-platform/packages/handoff-contracts/src/bo-to-bi.ts` (currently
a placeholder) as the strict, versioned, serializable contract for this
intake boundary, following the CLAUDE.md §8 `LayerHandoff<TPayload>`
envelope and the pattern established by `sim-to-adi.ts` (BUILD-07) and
`dal-to-bo.ts` (BUILD-08): contract version; handoff identity; correlation
identity; tenant/workspace/business identity; BO publication-package
identity and version; target block; record count; source reference;
schema/version reference; quality/completeness summary if the BO package
carries one; limitations/warnings; idempotency key. Runtime validation
returns explicit rejection reasons, enforces JSON serializability, and
forbids embedded BI analytical conclusions (findings/insights do not belong
in the intake contract — they are produced downstream by BUILD-09's own
analysis tables). This TypeScript contract is part of BUILD-09 because the
prepared architecture assigns the BO→BI boundary to the same Stage 2D
persistence work that consumes it.

## 12. Downstream Boundaries

BI may **persist** publication packages declaring target layer
`business_digital_twin`, `simulation`, or `ai_decision_intelligence`
(mirroring the `bo_publication_packages.target_layer` CHECK pattern), and
record acknowledgement/rejection/revocation of those packages. BUILD-09
must NOT implement any downstream consumer: no Digital Twin state changes,
no Simulation execution, no ADI scoring/recommendations, no Approved
Business Action, no Outcome Monitoring, no Continuous Learning, and no
alteration of existing Simulation mathematics (frozen since BUILD-07).

## 13. Event Requirements

Repository-aligned equivalents of: `bi.metric.calculated`,
`bi.kpi.updated`, `bi.analysis.started`, `bi.analysis.completed`,
`bi.analysis.failed`, `bi.anomaly.detected`, `bi.forecast.generated`,
`bi.forecast.accuracy_recorded`, `bi.insight.published`,
`bi.data.published`. Add these to `packages/event-contracts/src/index.ts`'s
`LayerEventType` union (the existing `'bi.insight.generated'` stub may be
retained or superseded by `bi.insight.published` per the analysis of which
is authoritative — implementer must reconcile, not duplicate). Every event:
uses the existing `PlatformEvent<TPayload>` envelope (CLAUDE.md §9);
preserves tenant/workspace/business ownership; preserves correlation and
causation ids; validates payload version; publishes atomically through a
`business_intelligence.emit_*` `SECURITY DEFINER` function into
`events.outbox_events` (mirroring `business_operations.emit_outbox_event`
from `0036_create_bo_triggers_events.sql`); supports idempotent replay
(duplicate emission with the same natural key is a no-op); rejects invalid
target layers (only the three allowed downstream layers); never embeds
secrets or oversized raw datasets (references only — payload carries ids
and summaries, not full analytical datasets).

## 14. Repository Requirements

Strict TypeScript repository interfaces + PostgreSQL adapters in
`infinicus-platform/packages/database/src/repositories/bi/`, mirroring the
`repositories/bo/` structure (class per aggregate + shared `errors.ts` +
barrel `index.ts`), for repository-aligned equivalents of:
`MetricDefinitionRepository`, `MetricCalculationRepository`,
`AnalysisRunRepository`, `AnalysisResultRepository`, `ForecastRepository`,
`AnomalyRepository`, `InsightPackageRepository`,
`PublicationPackageRepository`. Additional repositories only where the
table groups in §7 require them (e.g. an intake-package repository) — do
not add repositories speculatively.

Requirements: parameterized SQL only (no string-concatenated queries);
transaction support via the existing `withTenantTransaction`/
`withTransaction` helpers (`packages/database/src/client.ts`); tenant-aware
access on every query; explicit `NotFoundError`/conflict/validation error
types (extending the existing `repositories/bo/errors.ts` pattern, e.g.
`InvalidTransitionError`); no `any`; no unsafe casts; no silent error
handling (every catch either rethrows a typed error or is unreachable by
design); no duplicate domain types (reuse `@infinicus/shared-types`
branded ids and `BaseRecord`/`LayerHandoff` conventions); no direct
database access outside these adapters (pg `numeric` columns must be
parsed with `parseFloat(String(...))` per the established Stage 2C fix).

## 15. Test Requirements

At least **100 meaningful live PostgreSQL 16 integration tests** for Stage
2D (in addition to structural/unit tests), covering at minimum the 71
areas listed in the originating scope decision, including but not limited
to: clean migration application; migration rerun/idempotency; schema/table/
FK/unique/check-constraint/index/trigger existence; RLS enabled-and-forced;
missing-context fail-closed behaviour; tenant/workspace/business isolation;
cross-tenant rejection; BO publication-package intake and idempotency;
invalid upstream state rejection; lineage preservation; dataset creation,
versioning, and immutability; metric-definition versioning; metric
calculation persistence, unit/currency handling, invalid-value rejection,
time-series ordering, dimension validation; analysis request/run lifecycle
and invalid-transition rejection; input/output lineage; findings and
append-only enforcement, confidence bounds, evidence/limitation
persistence; trend periods/direction; forecast run lifecycle, point
ordering, confidence bounds, immutability, accuracy recording; anomaly-rule
versioning, detection, severity validation, lifecycle transitions, evidence
and resolution; benchmark and comparison-run persistence; risk-model
versioning, assessment persistence, bounded scores, evidence/limitations;
insight-package versioning; publication target validation,
acknowledgement, rejection, revocation, replay/idempotency; event payload
validation and outbox atomicity; transaction rollback; repository adapter
behavior; registry versioning; deployment activation and rollback;
empty-database installation; full database regression (Stages 1–2C);
full workspace regression; typecheck; lint; build. Tests must be
meaningful — no count-padding via duplicated or trivial assertions.

## 16. Freeze Protocol

Freeze only after: all Stage 2D structural tests pass; ≥100 meaningful live
integration tests pass; all RLS tests pass; all outbox tests pass; all
repository tests pass; empty-database application passes; migration
rerun/idempotency passes; rollback verification passes per the existing
(forward-only) convention; existing database regressions pass (Stages
1–2C, 456/456 baseline); workspace regressions pass (`pnpm lint`,
`pnpm typecheck`, `pnpm build`); migration integrity confirmed (0001–0036
untouched); frozen migration manifest updated to reflect the new range;
Stage 2D completion report written.

## 17. Out of Scope

Editing or renumbering frozen Stage 2A–2C migrations (0001–0036);
competing BI schemas (`bi`, `analytics`, `intelligence`, or any other);
duplicating canonical identities or operational truth; implementing or
modifying browser BI root blocks (`business-intelligence/`, BUILD-02,
already complete); Digital Twin persistence; Simulation persistence; ADI
persistence; any downstream consumer implementation; altering Simulation
mathematics (frozen since BUILD-07); implementing BUILD-10; unrelated
frontend work.

## 18. Expected File Areas

`infinicus-platform/infrastructure/database/migrations/0037_...sql`
onward; `infinicus-platform/packages/database/src/repositories/bi/*.ts`;
`infinicus-platform/packages/database/src/index.ts` (export BI
repositories/types); `infinicus-platform/packages/database/tests/
migration-stage2d.test.ts` (structural) and
`bi-repositories.integration.test.ts` (live, ≥100 tests, following the
`bo-repositories.integration.test.ts` harness pattern);
`infinicus-platform/packages/handoff-contracts/src/bo-to-bi.ts` +
matching contract test; `infinicus-platform/packages/event-contracts/src/
index.ts` (BI event types); `infinicus-platform/packages/shared-types/src/
index.ts` only if a genuinely missing canonical branded id/enum is
required (no duplicate types); `infinicus-platform/docs/
database-stage-2d-business-intelligence.md` (new);
`infinicus-platform/docs/database/IMPLEMENTATION_STATUS.md` (updated,
frozen range extended); `.claude/state/reports/
BUILD-09-DB-BI-completion.md`.
