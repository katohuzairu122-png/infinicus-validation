# Architecture

## Processing Sequence

1. Register quality rules against a BI-02 dataset contract.
2. Load mapped records from a BI-03 quality handoff.
3. Evaluate required-field rules.
4. Evaluate type, range, pattern, and allowed-value rules.
5. Evaluate uniqueness and referential rules.
6. Evaluate timeliness.
7. Separate errors from warnings.
8. Quarantine records with error-level failures.
9. Calculate dataset quality score.
10. Prepare accepted, warning, and quarantined records for BI-05.

## Quality Dimensions

- completeness
- validity
- uniqueness
- consistency
- timeliness
- conformity
