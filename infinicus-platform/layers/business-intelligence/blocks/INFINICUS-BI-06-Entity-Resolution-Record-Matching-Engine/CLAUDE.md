# Claude Instructions — BI-06

- Load BI-01 through BI-05 before BI-06.
- Do not merge records automatically unless the configured confidence threshold is met.
- Preserve source record, canonical entity, match rule, cluster, decision, and correlation identifiers.
- Keep original records immutable.
- Separate exact, probable, possible, and rejected matches.
- Every merge plan must identify its surviving canonical record.
- Manual review is mandatory for ambiguous matches.
- Avoid external dependencies.
