(function (global) {
  "use strict";

  const runtime = global.INFINICUS?.ABA?.runtime;
  if (!runtime) throw new Error("ABA-01 runtime must load before manifest.");

  const names = [
    "Decision Package Intake and Validation Engine",
    "Action Definition and Business Action Ontology Engine",
    "Action Instance and Lifecycle Registry",
    "Authority, Role and Decision-Rights Engine",
    "Approval Policy and Threshold Engine",
    "Multi-Stage Approval Workflow Engine",
    "Approval Evidence, Signature and Audit Engine",
    "Approved Action Contract Generation Engine",
    "Action Scope, Parameter and Boundary Engine",
    "Constraint and Dependency Revalidation Engine",
    "Conflict, Duplication and Action Collision Engine",
    "Action Decomposition and Execution Plan Engine",
    "Responsible Actor and Task Assignment Engine",
    "Resource Reservation and Availability Engine",
    "Execution Scheduling and Action Queue Engine",
    "Execution Adapter and Connector Registry",
    "Pre-Execution Simulation and Dry-Run Engine",
    "Controlled Action Execution Engine",
    "Execution Failure, Compensation and Rollback Engine",
    "Execution Evidence and Audit Trail Engine",
    "Action Completion and Verification Engine",
    "Expected Outcome and Monitoring Contract Engine",
    "Outcome Monitoring Publication and Handoff Engine"
  ];

  names.forEach((name, index) => {
    runtime.registerBlock(`ABA-${String(index + 2).padStart(2, "0")}`, {
      name,
      version: null,
      status: "planned"
    });
  });
})(window);
