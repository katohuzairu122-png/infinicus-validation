// @infinicus/workflow — customer decision workflow orchestration: business
// selection, BI/DT/simulation/ADI review, ABA approval, OM outcome entry,
// decision history. Composes existing BI/DT/SIM/ADI/ABA/OM repositories —
// introduces no new persistence of its own.

export { DecisionWorkflowService } from './DecisionWorkflowService.js';
export type {
  WorkflowView, DecisionHistory,
  CreateReviewInput, SubmitApprovalInput, RecordOutcomeInput,
} from './DecisionWorkflowService.js';
