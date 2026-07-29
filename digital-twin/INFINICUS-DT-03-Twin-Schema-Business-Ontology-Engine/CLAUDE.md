# Claude Instructions — DT-03

- Load DT-01 and DT-02 before DT-03.
- Every ontology must belong to a registered twin instance.
- Preserve schema, ontology, entity type, relationship type, state model, version, and correlation identifiers.
- Do not ingest BI-24 intelligence packages; DT-04 handles intake.
- Keep ontology definitions separate from runtime twin-state values.
- Reject incompatible schema changes unless explicitly versioned.
- Record lineage and supersession between schema versions.
- Avoid external dependencies.
