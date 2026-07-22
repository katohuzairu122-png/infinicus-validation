# Interface Compatibility Policy

## Compatibility hierarchy

1. Additive fields with safe defaults.
2. Optional fields with validation.
3. New methods without removing old methods.
4. Thin adapters between old and new shapes.
5. New explicit contract version.
6. Breaking removal only after all consumers migrate.

## Adapter rules

An adapter must:

- validate the source version;
- preserve tenant/workspace/business scope;
- preserve correlation and causation;
- reject secret or executable content;
- be deterministic;
- avoid hidden side effects;
- expose controlled errors;
- have parity and failure tests.

## Version rules

- Patch: validation bug fix or non-shape behavior correction.
- Minor: backward-compatible additive fields or capabilities.
- Major: removed or retyped required fields, changed authority, or incompatible semantics.

## Deprecation

Deprecated APIs remain:

- exported;
- documented;
- tested;
- mapped to the canonical implementation;

until a later approved build removes them.
