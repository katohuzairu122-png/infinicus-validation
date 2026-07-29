# Architecture

ADI-05 is a read-only anti-corruption layer. An injected reader retrieves the existing Digital Twin's published snapshot. ADI-05 validates ownership and publication metadata, then maps the snapshot into ADI-04 fragments while preserving the original snapshot identifiers and schema.

No write route exists. The source snapshot is cloned before mapping and remains unchanged.
