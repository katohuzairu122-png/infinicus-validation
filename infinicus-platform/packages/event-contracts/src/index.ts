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
  // BI — Stage 2D (BUILD-09). 'bi.insight.generated' is superseded by
  // 'bi.insight.published' (the insight package's actual dispatch point).
  | 'bi.metric.calculated'
  | 'bi.kpi.updated'
  | 'bi.analysis.started'
  | 'bi.analysis.completed'
  | 'bi.analysis.failed'
  | 'bi.anomaly.detected'
  | 'bi.forecast.generated'
  | 'bi.forecast.accuracy_recorded'
  | 'bi.insight.published'
  | 'bi.data.published'
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
