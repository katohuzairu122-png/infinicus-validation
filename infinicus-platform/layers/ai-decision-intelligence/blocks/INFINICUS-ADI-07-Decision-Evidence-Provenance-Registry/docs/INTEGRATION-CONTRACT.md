# Integration Contract

1. Attach ADI-01 through ADI-06 first.
2. Pass the ADI-04 DecisionContextEnvelope to `adi.evidence.context.ingest`.
3. Carry the ADI-03 AccessDecision ID plus tenant, business, decision, context, fragment and source identifiers unchanged.
4. Evidence content is immutable and hash-verifiable.
5. Corrections create new evidence and supersede the old record.
6. ADI-07 records evidence; it never interprets evidence into a recommendation.
