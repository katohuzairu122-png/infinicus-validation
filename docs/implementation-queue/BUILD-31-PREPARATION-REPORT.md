\# BUILD-31 PREPARATION REPORT



\* Build ID: `BUILD-31`

\* Name: `Data Acquisition Runtime Foundation`

\* Layer: `DATA-ACQUISITION-RUNTIME`

\* Dependency: `BUILD-30`

\* Specification: `docs/implementation-queue/BUILD-31-DATA-ACQUISITION-RUNTIME-SPECIFICATION.md`

\* Specification SHA-256: `53d797086f2d0bb722c05d15a3431de116aa76fdcacf93590ba2cc78feba429f`

\* Runtime implementation included: `yes`

\* Database migration baseline before build: `0001–0168`

\* Status: `ready`



\## Verified Existing Foundations



\* Existing `data\_acquisition` schema from migrations `0013–0022`

\* Existing DA repositories for:



&#x20; \* data sources

&#x20; \* connectors

&#x20; \* collection runs

&#x20; \* validation results

&#x20; \* quality scores

&#x20; \* provenance

&#x20; \* publication packages

\* Existing permissions:



&#x20; \* `da:read`

&#x20; \* `da:write`

&#x20; \* `da:admin`

\* Existing transactional DA outbox SQL wrappers

\* Existing Fastify API conventions

\* Existing authentication, tenant context, permissions, subscription, idempotency, error handling, OpenAPI, and observability

\* Existing Business Operations persistence

\* Existing workspace package discovery through `packages/\*`



\## Verified Runtime Gaps



\* No production DA runtime package

\* No DA API routes or Zod schemas

\* No manual-intake service

\* No connector execution

\* No guarded collection-run state machine

\* No runtime validation engine

\* No deterministic quality scoring engine

\* No automatic provenance hashing

\* No controlled publication orchestration

\* No production TypeScript calls to `data\_acquisition.emit\_\*`

\* No transactional DA domain mutation plus outbox emission

\* No manual-submission repository

\* No live API integration for DA



\## Frozen First Production Slice



BUILD-31 will implement:



\* governed data-source lifecycle

\* governed connector lifecycle

\* `manual\_json` connector only

\* synchronous manual JSON intake

\* guarded collection transitions

\* deterministic validation

\* deterministic quality scoring

\* SHA-256 provenance

\* publication-package preparation

\* controlled Business Operations publication

\* transactional DA outbox events

\* Fastify routes

\* Zod schemas

\* repository, service, and API tests

\* live PostgreSQL validation



\## Explicitly Deferred



\* Foodics

\* Square

\* Shopify

\* generic REST connectors

\* OAuth

\* webhooks

\* file parsing

\* OCR

\* malware scanning

\* database extraction

\* schedulers

\* durable queues

\* distributed workers

\* stream ingestions

\* customer-facing DA dashboard

\* automatic downstream BI, DT, SIM, ADI, ABA, OM, or CL execution



\## Implementation Readiness



\* Specification frozen: `yes`

\* Specification hash verified: `yes`

\* Dependency completed: `yes`

\* Working tree verified clean before preparation: `yes`

\* Current ready build before update: `null`

\* BUILD-31 may now be marked ready in implementation status: `yes`



