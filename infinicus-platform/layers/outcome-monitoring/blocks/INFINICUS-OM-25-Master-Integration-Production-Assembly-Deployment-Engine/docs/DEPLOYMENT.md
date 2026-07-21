# Deployment Sequence

1. Load OM-01.
2. Load OM-02 through OM-24 in sequence.
3. Load OM-25.
4. Run `om.master.diagnose`.
5. Resolve every missing service and route.
6. Assemble using the OM-24 assembly handoff.
7. Register a deployment adapter.
8. Execute deployment.
9. Store the deployment receipt.
10. Record rollback metadata when required.

A successful package test does not by itself deploy external infrastructure.
