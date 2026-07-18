# Architecture

1. Receive DT-22 scenario handoff.
2. Load immutable historical baseline.
3. Create scenario definition and reproducibility seed.
4. Register fixed, bounded, categorical, and distribution-based conditions.
5. Validate all state keys and parameter ranges.
6. Preserve actual baseline state unchanged.
7. Create separate effective scenario state.
8. Generate deterministic scenario checksum.
9. Persist scenario, conditions, and baseline.
10. Prepare DT-24 simulation-package handoff.
