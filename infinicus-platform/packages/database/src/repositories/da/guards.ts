/**
 * Guarded state transitions for the Data Acquisition persistence layer.
 *
 * BUILD-31 §4.6 requires two things that a plain UPDATE does not give us:
 *
 *   1. the expected current state must be enforced inside the SQL UPDATE
 *      itself, so a row already moved by a concurrent writer loses the guard
 *      rather than being silently overwritten;
 *   2. a record that exists but sits in the wrong state must raise
 *      InvalidStateTransitionError, not a generic not-found.
 *
 * Both are handled here so every DA repository transitions the same way.
 */

import type { PoolClient } from 'pg';
import { InvalidStateTransitionError, NotFoundError } from './errors.js';

export interface GuardedTransitionSpec {
  /**
   * Fully-qualified table name, e.g. 'data_acquisition.collection_runs'.
   * Interpolated into the SQL text, so this must always be a trusted
   * compile-time constant supplied by a repository — never caller input.
   */
  table: string;
  /**
   * State column name, either 'status' or 'state' across the DA schema.
   * Interpolated into the SQL text under the same trusted-constant rule
   * as `table`.
   */
  stateColumn: string;
  /** Entity label used in error messages, e.g. 'CollectionRun'. */
  entity: string;
  /** Primary key of the row being transitioned. Bound as a parameter. */
  id: string;
  /**
   * States the row may currently be in for this transition to be legal.
   * Bound as a single text[] parameter. An empty list means no legal path
   * into `next` exists, which fails closed.
   */
  expected: readonly string[];
  /** State the row is moved to. Bound as a parameter. */
  next: string;
  /**
   * Additional SET fragments applied with the transition, e.g.
   * ['started_at = now()', 'records_received = $3'].
   * Trusted compile-time constants only; bind their values through
   * `extraValues`, which are numbered from $3 upward in order.
   */
  extraSet?: readonly string[];
  /** Values bound to $3 onward, in the order `extraSet` references them. */
  extraValues?: readonly unknown[];
}

/**
 * Applies a guarded transition and returns the updated row.
 *
 * Runs on the caller's client, so the update stays inside the caller's
 * transaction — and therefore inside the same transaction as any outbox
 * emission the caller performs alongside it.
 *
 * Parameter layout:
 *   $1                      row id
 *   $2                      next state
 *   $3 .. $(2 + N)          extraValues, N = extraValues.length
 *   $(3 + N)                expected states, as text[]
 *
 * @throws NotFoundError               row is not visible to this tenant
 * @throws InvalidStateTransitionError row exists but is in a disallowed state
 */
export async function runGuardedTransition(
  client: PoolClient,
  spec: GuardedTransitionSpec,
): Promise<Record<string, unknown>> {
  const extraValues = spec.extraValues ?? [];
  const expectedPlaceholder = '$' + String(3 + extraValues.length);
  const setClauses = [`${spec.stateColumn} = $2`, ...(spec.extraSet ?? [])];

  const updated = await client.query<Record<string, unknown>>(
    `UPDATE ${spec.table}
        SET ${setClauses.join(', ')}
      WHERE id = $1
        AND ${spec.stateColumn} = ANY(${expectedPlaceholder}::text[])
      RETURNING *`,
    [spec.id, spec.next, ...extraValues, spec.expected],
  );

  if (updated.rows.length > 0) {
    return updated.rows[0];
  }

  // Zero rows updated means one of two different failures, and the caller has
  // to be able to tell them apart: either the row is invisible (it does not
  // exist, or it belongs to another tenant and RLS hid it), or it is visible
  // but its current state is not one this transition allows.
  const current = await client.query<{ current_state: string }>(
    `SELECT ${spec.stateColumn} AS current_state
       FROM ${spec.table}
      WHERE id = $1`,
    [spec.id],
  );

  if (current.rows.length === 0) {
    throw new NotFoundError(spec.entity, spec.id);
  }

  throw new InvalidStateTransitionError(
    spec.entity,
    spec.id,
    spec.expected,
    current.rows[0].current_state,
    spec.next,
  );
}

/**
 * Given a transition matrix, returns every state from which `next` is
 * reachable. Repositories use this to derive the guard list for a target
 * state instead of restating it at each call site.
 */
export function statesAllowing<S extends string>(
  matrix: Readonly<Record<S, readonly S[]>>,
  next: S,
): S[] {
  return (Object.keys(matrix) as S[]).filter((from) => matrix[from].includes(next));
}
