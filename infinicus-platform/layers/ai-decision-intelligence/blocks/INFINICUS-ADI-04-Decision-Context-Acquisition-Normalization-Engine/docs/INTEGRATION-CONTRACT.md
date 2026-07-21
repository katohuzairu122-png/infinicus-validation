# Integration Contract

1. Pass the secured ADI-03 DecisionCase. ADI-04 uses its immutable `security.accessProof`; callers may also provide the matching allowed AccessDecision explicitly.
2. Register adapters for existing BI, Digital Twin, Simulation Results and other authoritative sources.
3. Adapters return fragments; ADI-04 does not modify source engines.
4. All fragments must remain inside the DecisionCase tenant/business boundary.
5. Values are structurally normalized but not recalculated or converted without an explicit adapter.
6. Treat `partial`, conflicts, stale evidence, missing sources and low quality as downstream decision constraints.
7. ADI-05 and ADI-06 remain dedicated adapters; ADI-04 provides their common context envelope.
8. Keep the original Simulation Engine and consolidated Decision Intelligence HTML untouched.
