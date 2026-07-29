(function (global) {
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;

  async function registerPolicy(input = {}) {
    const built = global.INFINICUS.ABA.intakePolicyModel.create(input);
    if (!built.ok) return built;

    return global.INFINICUS.ABA.intakeStore.put("policies", built.data);
  }

  async function intake({ packageInput, intakePolicyId } = {}) {
    const policy =
      await global.INFINICUS.ABA.intakeStore.get("policies", intakePolicyId);

    if (!policy.ok) return policy;

    const built =
      global.INFINICUS.ABA.decisionPackageModel.create(packageInput);

    if (!built.ok) return built;

    const existing =
      await global.INFINICUS.ABA.intakeStore.getByDecisionId(
        built.data.decisionId
      );

    if (existing.ok) {
      return runtime.success({
        acceptedPackage: existing.data,
        idempotentReplay: true
      });
    }

    const validation =
      global.INFINICUS.ABA.decisionPackageValidator.validate({
        packageData: built.data,
        policy: policy.data
      });

    const checksum =
      global.INFINICUS.ABA.packageChecksum.hash(built.data);

    if (!validation.valid) {
      const quarantineRecord = {
        quarantineRecordId: runtime.createId("aba_quarantine"),
        decisionPackageId: built.data.decisionPackageId,
        decisionId: built.data.decisionId,
        businessId: built.data.businessId,
        packageChecksum: checksum,
        issues: validation.issues,
        packageData: runtime.clone(built.data),
        status: "quarantined",
        correlationId: built.data.correlationId,
        createdAt: new Date().toISOString()
      };

      await global.INFINICUS.ABA.intakeStore.put(
        "quarantine",
        quarantineRecord
      );

      await runtime.emit(
        "aba.decision_package.quarantined",
        quarantineRecord
      );

      return runtime.failure(
        "ABA_DECISION_PACKAGE_REJECTED",
        "Decision package failed intake validation.",
        quarantineRecord
      );
    }

    const acceptedPackage = {
      ...runtime.clone(built.data),
      packageChecksum: checksum,
      validation: runtime.clone(validation),
      intakePolicyId,
      status: "accepted",
      acceptedAt: new Date().toISOString()
    };

    await global.INFINICUS.ABA.intakeStore.put(
      "packages",
      acceptedPackage
    );

    const receipt = {
      intakeReceiptId: runtime.createId("aba_intake_receipt"),
      decisionPackageId: acceptedPackage.decisionPackageId,
      decisionId: acceptedPackage.decisionId,
      businessId: acceptedPackage.businessId,
      packageChecksum: acceptedPackage.packageChecksum,
      intakePolicyId,
      status: "accepted",
      correlationId: acceptedPackage.correlationId,
      createdAt: new Date().toISOString()
    };

    await global.INFINICUS.ABA.intakeStore.put("receipts", receipt);

    const handoff = {
      actionDefinitionHandoffId:
        runtime.createId("aba_action_definition_handoff"),
      targetBlock: "ABA-03",
      decisionPackageId: acceptedPackage.decisionPackageId,
      packageChecksum: acceptedPackage.packageChecksum,
      businessId: acceptedPackage.businessId,
      twinId: acceptedPackage.twinId,
      simulationRunId: acceptedPackage.simulationRunId,
      scenarioId: acceptedPackage.scenarioId,
      decisionId: acceptedPackage.decisionId,
      recommendationId: acceptedPackage.recommendationId,
      recommendation: runtime.clone(acceptedPackage.recommendation),
      decision: runtime.clone(acceptedPackage.decision),
      approvals: acceptedPackage.approvals.map(runtime.clone),
      simulationEvidence: runtime.clone(acceptedPackage.simulationEvidence),
      riskEvidence: acceptedPackage.riskEvidence.map(runtime.clone),
      constraints: acceptedPackage.constraints.map(runtime.clone),
      dependencies: acceptedPackage.dependencies.map(runtime.clone),
      expectedOutcomes: acceptedPackage.expectedOutcomes.map(runtime.clone),
      confidence: acceptedPackage.confidence,
      lineage: acceptedPackage.lineage.map(runtime.clone),
      correlationId: acceptedPackage.correlationId,
      causationId: acceptedPackage.causationId,
      status: "ready",
      createdAt: new Date().toISOString()
    };

    await global.INFINICUS.ABA.intakeStore.put("handoffs", handoff);

    await runtime.emit("aba.decision_package.accepted", {
      acceptedPackage,
      receipt,
      actionDefinitionHandoffId: handoff.actionDefinitionHandoffId
    });

    return runtime.success({
      acceptedPackage,
      receipt,
      actionDefinitionHandoff: handoff
    });
  }

  const api = Object.freeze({
    registerPolicy,
    intake,
    getAcceptedPackage: ({ decisionPackageId }) =>
      global.INFINICUS.ABA.intakeStore.get("packages", decisionPackageId),
    getActionDefinitionHandoff: ({ actionDefinitionHandoffId }) =>
      global.INFINICUS.ABA.intakeStore.get("handoffs", actionDefinitionHandoffId),
    listQuarantinedPackages: () =>
      global.INFINICUS.ABA.intakeStore.list("quarantine"),
    listAcceptedPackages: () =>
      global.INFINICUS.ABA.intakeStore.list("packages")
  });

  runtime.registerService(
    "aba.decision_package_intake",
    api,
    { block: "ABA-02" }
  );

  runtime.registerRoute(
    "aba.intake_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "aba.decision_package.intake",
    intake
  );

  runtime.registerBlock("ABA-02", {
    name: "Decision Package Intake and Validation Engine",
    version: "1.0.0",
    status: "active"
  });

  global.INFINICUS.ABA.decisionPackageIntakeEngine = api;
})(window);
