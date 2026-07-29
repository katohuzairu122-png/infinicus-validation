# INFINICUS BI-06 — Entity Resolution and Record Matching Engine

Version: 1.0.0

BI-06 determines whether cleaned records represent the same customer, supplier, product, employee, business, or other canonical entity.

## Capabilities

- Match-rule registry
- Exact matching
- Normalized exact matching
- Weighted field matching
- Similarity scoring
- Blocking keys
- Candidate-pair generation
- Duplicate-cluster creation
- Canonical-record selection
- Match review queue
- Merge-plan preparation
- BI-07 transformation handoff
- IndexedDB persistence
- Demo interface and automated tests

## Dependencies

- BI-01 through BI-05

## Public API

`window.INFINICUS.BI.entityResolutionEngine`
