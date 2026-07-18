# Claude Instructions — ADI-11

- Assemble only records inside the same tenant, business and decision boundary.
- Require the ADI-03 access proof and matching ADI-04 accessDecisionId.
- Verify ADI-07 hashes; never silently accept failed verification.
- Preserve all source IDs, versions, conflicts, quality limitations and missing sources.
- Never fabricate missing goals, triggers, problems or evidence.
- Readiness must be deterministic: ready, needs_data or blocked.
- Do not generate objectives, alternatives, scores, recommendations, approvals or actions.
- Store assemblies as immutable versions and expose a reproducible digest.
