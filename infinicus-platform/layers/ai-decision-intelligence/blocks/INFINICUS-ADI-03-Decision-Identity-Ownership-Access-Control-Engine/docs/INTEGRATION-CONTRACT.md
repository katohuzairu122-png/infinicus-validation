# Integration Contract

1. Initialize ADI-01 and attach ADI-02.
2. Attach ADI-03 with a trusted `resolveIdentity` adapter.
3. Configure role assignments from an authenticated administration system, never request payloads.
4. Secure the ADI-02 DecisionCase through `adi.decision_case.secure`.
5. Pass only secured DecisionCases to ADI-04.
6. Carry the AccessDecision ID and tenant/business boundaries through downstream context acquisition.
7. Explicit denies always override ownership and role grants.
8. ADI-03 grants access to decision-processing capabilities; it does not approve a business action.
9. Keep the original Simulation Engine and consolidated Decision Intelligence HTML untouched.
