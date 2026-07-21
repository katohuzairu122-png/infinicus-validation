# Claude Instructions — ADI-06

- Keep this adapter read-only; never start, rerun, cancel or modify a simulation.
- Preserve the existing Monte Carlo and statistical logic exactly as implemented.
- Require an injected completed-run reader and fail closed when absent.
- Enforce tenant, business and decision boundaries.
- Preserve run ID, engine version, model version, scenario IDs, assumptions, sample size, timestamps and provenance.
- Never recalculate percentiles, probabilities, verdicts or risk values inside this block.
- Reject incomplete, failed, boundary-mismatched or structurally invalid runs.
- Register as an ADI-04 context provider through ADI-01.
