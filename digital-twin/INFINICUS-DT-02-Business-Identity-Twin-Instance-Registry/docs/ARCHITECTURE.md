# Architecture

## Processing Sequence

1. Register a stable business identity.
2. Normalize and reserve the business key.
3. Create the root business twin.
4. Create optional branch, department, project, location, subsidiary, or unit twins.
5. Validate parent-child relationships.
6. Register twin aliases.
7. Manage lifecycle transitions.
8. Persist lifecycle history.
9. Support discovery by ID and stable key.
10. Prepare twin identity context for DT-03.

## Responsibility Boundary

DT-02 manages identity and twin instances.

DT-03 defines the schemas, ontology, entity classes, and relationship types used by those twins.
