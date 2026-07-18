# Integration Contract

1. Attach ADI-01 through ADI-05 first.
2. Inject only a read operation: `readCompletedRun(query, context)`.
3. Return completed runs with IDs, engine/model/schema versions, boundaries, completion time, sample size, scenarios and outputs.
4. ADI-06 registers provider `adi06.simulation_results` with ADI-04.
5. ADI-06 must never call start, execute, rerun, cancel, seed-change or model-update operations.
6. Recorded probabilities, percentiles, risk values and verdicts are copied, not recalculated.
7. Failed or incomplete runs are rejected and preserved in rejection evidence.
8. The existing Monte Carlo implementation and original Decision Intelligence script remain untouched.
