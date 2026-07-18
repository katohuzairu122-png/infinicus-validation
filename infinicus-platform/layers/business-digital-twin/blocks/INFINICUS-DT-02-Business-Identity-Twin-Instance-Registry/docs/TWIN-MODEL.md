# Twin Types

- business
- branch
- department
- project
- business unit
- location
- subsidiary

# Lifecycle States

- initializing
- inactive
- synchronizing
- active
- degraded
- suspended
- retired

# Identity Rules

- business keys are unique,
- twin keys are unique,
- non-business twins require a parent,
- parent and child must belong to the same business,
- retired twins cannot receive new children,
- retired twin IDs are never reused.
