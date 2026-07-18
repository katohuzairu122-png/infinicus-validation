// @infinicus/event-contracts — canonical PlatformEvent and layer event types (CLAUDE.md § 9)
export type { PlatformEvent, LayerId } from '@infinicus/shared-types';

/**
 * All canonical event type strings use lowercase dot notation.
 * Examples: da.data.published  bo.order.completed  simulation.completed
 */
export type LayerEventType =
  // DAL
  | 'da.data.published'
  // BO
  | 'bo.order.completed'
  // BI
  | 'bi.insight.generated'
  // DT
  | 'dt.state.updated'
  // SIM
  | 'simulation.completed'
  // ADI
  | 'adi.decision.generated'
  // ABA
  | 'aba.action.approved'
  // OM
  | 'om.outcome.evaluated'
  // CL
  | 'cl.learning.published'
  // Extension point — custom events must still use dot notation
  | (string & {});
