# Claude Instructions — ADI-16

- Orchestrate only through the injected Simulation Engine contract.
- Never implement, replace or alter Monte Carlo or statistical logic.
- Preserve run IDs, engine/model versions, sample sizes, assumptions and outputs.
- Reject incomplete or boundary-mismatched runs.
- Compare recorded metrics only; do not recalculate probabilities or verdicts.
- Do not create an overall rank, recommendation, approval or action.
