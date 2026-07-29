(function(global){
  "use strict";

  const runtime=global.INFINICUS.ABA.runtime;

  async function registerMetric(input={}){
    const built=
      global.INFINICUS.ABA.outcomeMetricModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.outcomeMonitoringContractStore.put(
      "metrics",
      built.data
    );
  }

  async function registerEvidenceSource(input={}){
    const built=
      global.INFINICUS.ABA.outcomeEvidenceSourceModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.outcomeMonitoringContractStore.put(
      "sources",
      built.data
    );
  }

  async function registerOutcome(input={}){
    const metric=
      await global.INFINICUS.ABA.outcomeMonitoringContractStore.get(
        "metrics",
        input.outcomeMetricId
      );

    if(!metric.ok) return metric;

    const source=
      await global.INFINICUS.ABA.outcomeMonitoringContractStore.get(
        "sources",
        input.outcomeEvidenceSourceId
      );

    if(!source.ok) return source;

    const built=
      global.INFINICUS.ABA.expectedOutcomeDefinitionModel.create(input);

    if(!built.ok) return built;

    const validation=
      global.INFINICUS.ABA.monitoringContractValidator.validateOutcome({
        outcome:built.data,
        metric:metric.data,
        source:source.data
      });

    if(!validation.valid){
      return runtime.failure(
        "ABA_EXPECTED_OUTCOME_INVALID",
        "Expected outcome failed monitoring validation.",
        validation
      );
    }

    return global.INFINICUS.ABA.outcomeMonitoringContractStore.put(
      "outcomes",
      built.data
    );
  }

  async function createMonitoringContract({
    outcomeMonitoringHandoffId,
    expectedOutcomeDefinitionIds=[]
  }={}){
    const handoff=
      await global.INFINICUS.ABA.actionCompletionVerificationEngine
        .getOutcomeMonitoringHandoff({
          outcomeMonitoringHandoffId
        });

    if(!handoff.ok) return handoff;

    const outcomes=[];

    for(const id of expectedOutcomeDefinitionIds){
      const definition=
        await global.INFINICUS.ABA.outcomeMonitoringContractStore.get(
          "outcomes",
          id
        );

      if(!definition.ok) return definition;

      const metric=
        await global.INFINICUS.ABA.outcomeMonitoringContractStore.get(
          "metrics",
          definition.data.outcomeMetricId
        );

      if(!metric.ok) return metric;

      const source=
        await global.INFINICUS.ABA.outcomeMonitoringContractStore.get(
          "sources",
          definition.data.outcomeEvidenceSourceId
        );

      if(!source.ok) return source;

      outcomes.push({
        definition:runtime.clone(definition.data),
        metric:runtime.clone(metric.data),
        source:runtime.clone(source.data)
      });
    }

    const contract={
      outcomeMonitoringContractId:
        runtime.createId("aba_outcome_monitoring_contract"),
      outcomeMonitoringHandoffId,
      actionCompletionCertificateId:
        handoff.data.actionCompletionCertificateId,
      actionCompletionVerificationId:
        handoff.data.actionCompletionVerificationId,
      executionEvidencePackageId:
        handoff.data.executionEvidencePackageId,
      actionInstanceId:
        handoff.data.actionInstanceId,
      executionPlanId:
        handoff.data.executionPlanId,
      executionScheduleId:
        handoff.data.executionScheduleId,
      completionState:
        handoff.data.completionState,
      outcomes:
        outcomes.map(runtime.clone),
      contractVersion:1,
      state:"draft",
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        handoff.data.confidence,
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    };

    const validation=
      global.INFINICUS.ABA.monitoringContractValidator
        .validateContract(contract);

    if(!validation.valid){
      return runtime.failure(
        "ABA_MONITORING_CONTRACT_INVALID",
        "Outcome monitoring contract failed validation.",
        validation
      );
    }

    const issued={
      ...contract,
      state:"issued",
      issuedAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.outcomeMonitoringContractStore.put(
      "contracts",
      issued
    );

    await global.INFINICUS.ABA.outcomeMonitoringContractStore.put(
      "versions",
      {
        outcomeMonitoringContractVersionId:
          runtime.createId("aba_monitoring_contract_version"),
        outcomeMonitoringContractId:
          issued.outcomeMonitoringContractId,
        contractVersion:
          issued.contractVersion,
        snapshot:
          runtime.clone(issued),
        createdAt:
          new Date().toISOString()
      }
    );

    const publicationHandoff={
      outcomePublicationHandoffId:
        runtime.createId("aba_outcome_publication_handoff"),
      targetBlock:"ABA-24",
      outcomeMonitoringContractId:
        issued.outcomeMonitoringContractId,
      actionCompletionCertificateId:
        issued.actionCompletionCertificateId,
      actionInstanceId:
        issued.actionInstanceId,
      executionPlanId:
        issued.executionPlanId,
      executionScheduleId:
        issued.executionScheduleId,
      outcomes:
        issued.outcomes.map(runtime.clone),
      correlationId:
        issued.correlationId,
      lineage:
        issued.lineage.map(runtime.clone),
      confidence:
        issued.confidence,
      status:"ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.outcomeMonitoringContractStore.put(
      "publication_handoffs",
      publicationHandoff
    );

    await runtime.emit(
      "aba.outcome_monitoring_contract.issued",
      {
        outcomeMonitoringContract:issued,
        outcomePublicationHandoffId:
          publicationHandoff.outcomePublicationHandoffId
      }
    );

    return runtime.success({
      outcomeMonitoringContract:issued,
      outcomePublicationHandoff:publicationHandoff
    });
  }

  const api=Object.freeze({
    registerMetric,
    registerEvidenceSource,
    registerOutcome,
    createMonitoringContract,
    getMonitoringContract:({outcomeMonitoringContractId}) =>
      global.INFINICUS.ABA.outcomeMonitoringContractStore.get(
        "contracts",
        outcomeMonitoringContractId
      ),
    getOutcomePublicationHandoff:({outcomePublicationHandoffId}) =>
      global.INFINICUS.ABA.outcomeMonitoringContractStore.get(
        "publication_handoffs",
        outcomePublicationHandoffId
      ),
    listOutcomeDefinitions:() =>
      global.INFINICUS.ABA.outcomeMonitoringContractStore.list(
        "outcomes"
      )
  });

  runtime.registerService(
    "aba.expected_outcome_monitoring_contract",
    api,
    {block:"ABA-23"}
  );

  runtime.registerRoute(
    "aba.outcome_metric.register",
    registerMetric
  );

  runtime.registerRoute(
    "aba.outcome_evidence_source.register",
    registerEvidenceSource
  );

  runtime.registerRoute(
    "aba.expected_outcome.register",
    registerOutcome
  );

  runtime.registerRoute(
    "aba.outcome_monitoring_contract.create",
    createMonitoringContract
  );

  runtime.registerBlock("ABA-23",{
    name:"Expected Outcome and Monitoring Contract Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.expectedOutcomeMonitoringContractEngine=
    api;
})(window);
