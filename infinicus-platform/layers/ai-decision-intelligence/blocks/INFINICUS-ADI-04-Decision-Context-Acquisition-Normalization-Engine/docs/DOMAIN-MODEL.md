# DecisionContextEnvelope

- Identity: `contextId`, `decisionId`, `tenantId`, `businessId`, `accessDecisionId`
- Evidence: normalized `fragments` with provider, source, scope, units, currency and provenance
- Assessment: `conflicts`, `providerFailures`, `invalidFragments`, `missingSourceTypes`, `quality`
- Governance: `acquiredAt`, `schemaVersion`, `normalizationPolicy`

Every fragment retains its original record ID, schema version, observed time and source system.
