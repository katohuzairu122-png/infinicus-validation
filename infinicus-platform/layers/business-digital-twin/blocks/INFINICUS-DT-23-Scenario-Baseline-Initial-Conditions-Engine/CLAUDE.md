# Claude Instructions — DT-23

- Load DT-01 through DT-22 before DT-23.
- Use only immutable DT-22 historical snapshots as actual-state baselines.
- Never overwrite actual historical state.
- Preserve business, twin, snapshot, version, checksum, scenario, assumption, variable, lineage, confidence, and correlation identifiers.
- Label every condition as actual, assumed, or simulated.
- Validate ranges, distributions, dependencies, and constraints.
- Keep simulation execution outside this block.
- DT-24 packages validated scenario state for the Simulation Engine.
- Avoid external dependencies.
