# Architecture

## Processing Sequence

1. Load DT-04 accepted entity-graph handoff.
2. Resolve DT-03 entity and relationship definitions.
3. Build entity instances.
4. Validate required attributes.
5. Build relationship instances.
6. Validate source, target, and cardinality.
7. Persist graph nodes and edges.
8. Analyze orphans and unresolved references.
9. Expose graph traversal.
10. Prepare organizational context for DT-06.

## Responsibility Boundary

DT-05 constructs the generic business graph.

DT-06 interprets organizational units, roles, reporting lines, responsibilities, and decision rights.
