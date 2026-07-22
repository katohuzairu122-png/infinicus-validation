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
  // DT — Stage 2E (BUILD-12).
  | 'dt.intake.received'
  | 'dt.intake.accepted'
  | 'dt.intake.rejected'
  | 'dt.definition.published'
  | 'dt.instance.created'
  | 'dt.instance.status_changed'
  | 'dt.snapshot.created'
  | 'dt.snapshot.validated'
  | 'dt.snapshot.published'
  | 'dt.calibration.started'
  | 'dt.calibration.completed'
  | 'dt.calibration.failed'
  | 'dt.validation.completed'
  | 'dt.scenario_baseline.created'
  | 'dt.scenario_baseline.published'
  | 'dt.data.published'
  // SIM — Stage 2F (BUILD-13). 'simulation.completed' is superseded by
  // 'sim.run.completed' (the run's actual completion event).
  | 'sim.intake.received'
  | 'sim.scenario.created'
  | 'sim.run.requested'
  | 'sim.run.started'
  | 'sim.run.completed'
  | 'sim.run.failed'
  | 'sim.result.published'
  | 'sim.risk.calculated'
  | 'sim.sensitivity.completed'
  | 'sim.data.published'
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
