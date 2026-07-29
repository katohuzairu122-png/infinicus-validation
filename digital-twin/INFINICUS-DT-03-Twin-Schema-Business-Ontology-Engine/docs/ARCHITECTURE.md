# Architecture

## Processing Sequence

1. Receive DT-02 twin identity handoff.
2. Define entity types and attributes.
3. Define relationship types and cardinalities.
4. Define state models and allowed transitions.
5. Define vocabularies and ontology constraints.
6. Validate internal references.
7. Compare with prior ontology version.
8. Record compatibility or approved breaking changes.
9. Register ontology in the runtime.
10. Prepare DT-04 intelligence-intake handoff.

## Responsibility Boundary

DT-03 defines what can exist in the twin.

DT-04 validates and imports intelligence package content against those definitions.
