(function(global){
  "use strict";

  const blocks = [
    ["ABA-01","Core Runtime and Registry","runtime"],
    ["ABA-02","Decision Package Intake and Validation Engine","decisionPackageIntakeEngine"],
    ["ABA-03","Action Definition and Business Action Ontology Engine","actionDefinitionOntologyEngine"],
    ["ABA-04","Action Instance and Lifecycle Registry","actionInstanceLifecycleRegistry"],
    ["ABA-05","Authority, Role and Decision-Rights Engine","authorityDecisionRightsEngine"],
    ["ABA-06","Approval Policy and Threshold Engine","approvalPolicyThresholdEngine"],
    ["ABA-07","Multi-Stage Approval Workflow Engine","multiStageApprovalWorkflowEngine"],
    ["ABA-08","Approval Evidence, Signature and Audit Engine","approvalEvidenceAuditEngine"],
    ["ABA-09","Approved Action Contract Generation Engine","approvedActionContractEngine"],
    ["ABA-10","Action Scope, Parameter and Boundary Engine","actionScopeBoundaryEngine"],
    ["ABA-11","Constraint and Dependency Revalidation Engine","constraintDependencyRevalidationEngine"],
    ["ABA-12","Conflict, Duplication and Action Collision Engine","actionCollisionEngine"],
    ["ABA-13","Action Decomposition and Execution Plan Engine","actionDecompositionExecutionPlanEngine"],
    ["ABA-14","Responsible Actor and Task Assignment Engine","responsibleActorTaskAssignmentEngine"],
    ["ABA-15","Resource Reservation and Availability Engine","resourceReservationAvailabilityEngine"],
    ["ABA-16","Execution Scheduling and Action Queue Engine","executionSchedulingQueueEngine"],
    ["ABA-17","Execution Adapter and Connector Registry","executionAdapterConnectorRegistry"],
    ["ABA-18","Pre-Execution Simulation and Dry-Run Engine","preExecutionDryRunEngine"],
    ["ABA-19","Controlled Action Execution Engine","controlledActionExecutionEngine"],
    ["ABA-20","Execution Failure, Compensation and Rollback Engine","executionFailureRollbackEngine"],
    ["ABA-21","Execution Evidence and Audit Trail Engine","executionEvidenceAuditEngine"],
    ["ABA-22","Action Completion and Verification Engine","actionCompletionVerificationEngine"],
    ["ABA-23","Expected Outcome and Monitoring Contract Engine","expectedOutcomeMonitoringContractEngine"],
    ["ABA-24","Outcome Monitoring Publication and Handoff Engine","outcomeMonitoringPublicationEngine"]
  ].map(([blockId,name,namespaceKey],index)=>Object.freeze({
    blockId,
    name,
    namespaceKey,
    sequence:index+1,
    required:true
  }));

  global.INFINICUS = global.INFINICUS || {};
  global.INFINICUS.ABA = global.INFINICUS.ABA || {};
  global.INFINICUS.ABA.masterBlockManifest = Object.freeze(blocks);
})(window);
