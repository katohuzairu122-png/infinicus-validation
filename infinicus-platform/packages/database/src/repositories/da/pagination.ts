/**
 * Bounded pagination for Data Acquisition list queries.
 *
 * BUILD-31 §4.14 requires every DA list endpoint to be paginated and requires
 * the default and maximum page sizes to be explicit rather than implied. The
 * constants below are those explicit values; repositories clamp through
 * boundedPage() so an unbounded or negative caller request can never reach
 * a LIMIT/OFFSET clause.
 */

/** Page size used when the caller supplies none. */
export const DEFAULT_PAGE_SIZE = 50;

/** Hard ceiling on page size, regardless of what the caller asks for. */
export const MAX_PAGE_SIZE = 200;

export interface PageOptions {
  limit?: number;
  offset?: number;
}

export interface BoundedPage {
  limit: number;
  offset: number;
}

/**
 * Clamps caller-supplied paging into the bounds above.
 *
 * Non-numeric, NaN, and Infinity inputs fall back to the defaults rather than
 * reaching the query, so a malformed value degrades to the safe page instead
 * of producing an invalid LIMIT/OFFSET. Fractional values are floored.
 *
 *   limit  -> [1, MAX_PAGE_SIZE], default DEFAULT_PAGE_SIZE
 *   offset -> [0, unbounded),     default 0
 */
export function boundedPage(options: PageOptions = {}): BoundedPage {
  const { limit: rawLimit, offset: rawOffset } = options;

  const limit =
    typeof rawLimit === 'number' && Number.isFinite(rawLimit)
      ? Math.min(Math.max(Math.floor(rawLimit), 1), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  const offset =
    typeof rawOffset === 'number' && Number.isFinite(rawOffset)
      ? Math.max(Math.floor(rawOffset), 0)
      : 0;

  return { limit, offset };
}
