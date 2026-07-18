# Architecture

ADI-07 is an append-only evidence ledger. Canonically serialized content is hashed with SHA-256, then stored with source and provenance metadata. Identical content inside one decision boundary is idempotent. Evidence changes are represented by supersession or revocation lifecycle entries instead of mutation.
