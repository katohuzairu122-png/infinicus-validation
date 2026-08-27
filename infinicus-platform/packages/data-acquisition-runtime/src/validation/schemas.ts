/**
 * Explicit, tested bounds for manual JSON intake (BUILD-31 §4.5/§4.9).
 * "Explicit" is the operative word in the spec — every limit here is a
 * named constant, never an implied default buried in a loop condition.
 */

/** Hard ceiling on records accepted in a single manual-intake request. */
export const MAX_RECORDS_PER_REQUEST = 1000;

/**
 * Hard ceiling on nested object/array depth within one record. A record is
 * depth 1 at its own top level; each nested object or array adds one.
 */
export const MAX_NESTING_DEPTH = 10;

/** Hard ceiling on the number of keys directly on one object, at any depth. */
export const MAX_KEYS_PER_OBJECT = 200;

/** Hard ceiling on any individual string value's length, in UTF-16 code units. */
export const MAX_STRING_LENGTH = 10_000;

/** Hard ceiling on the number of elements in any one array, at any depth. */
export const MAX_ARRAY_LENGTH = 1000;
