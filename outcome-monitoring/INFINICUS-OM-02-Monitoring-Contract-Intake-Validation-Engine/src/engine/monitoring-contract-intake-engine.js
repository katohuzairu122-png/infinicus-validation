(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.monitoringContractIntakePolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.monitoringContractIntakeStore.put(
      "policies",
      built.data
    );
  }

  async function intake({
    monitoringContract,
    monitoringContractIntakePolicyId
  }={}){
    const policy=
      await global.INFINICUS.OM.monitoringContractIntakeStore.get(
        "policies",
        monitoringContractIntakePolicyId
      );

    if(!policy.ok) return policy;

    const sourceContractId=
      monitoringContract?.outcomeMonitoringContractId;

    if(!sourceContractId){
      return runtime.failure(
        "OM_MONITORING_CONTRACT_ID_REQUIRED",
        "Monitoring contract ID is required."
      );
    }

    const existing=
      await global.INFINICUS.OM.monitoringContractIntakeStore
        .getBySourceContractId(sourceContractId);

    if(existing.ok){
      return runtime.success({
        intake:existing.data,
        idempotentReplay:true
      });
    }

    const validation=
      global.INFINICUS.OM.monitoringContractValidator
        .validateContract(
          monitoringContract || {},
          policy.data
        );

    if(!validation.valid){
      const quarantine={
        monitoringContractQuarantineId:
          runtime.createId("om_contract_quarantine"),
        sourceContractId,
        contract:runtime.clone(monitoringContract || {}),
        issues:runtime.clone(validation.issues),
        status:"quarantined",
        createdAt:new Date().toISOString()
      };

      if(policy.data.quarantineInvalid){
        await global.INFINICUS.OM.monitoringContractIntakeStore.put(
          "quarantine",
          quarantine
        );
      }

      return runtime.failure(
        "OM_MONITORING_CONTRACT_INVALID",
        "Monitoring contract failed intake validation.",
        quarantine
      );
    }

    const intakeRecord={
      monitoringContractIntakeId:
        runtime.createId("om_contract_intake"),
      sourceContractId,
      actionInstanceId:monitoringContract.actionInstanceId,
      actionCompletionCertificateId:
        monitoringContract.actionCompletionCertificateId,
      contract:runtime.clone(monitoringContract),
      validation:runtime.clone(validation),
      state:"validated",
      correlationId:monitoringContract.correlationId || null,
      lineage:runtime.clone(monitoringContract.lineage || []),
      confidence:Number(monitoringContract.confidence ?? 0),
      receivedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.monitoringContractIntakeStore.put(
      "contracts",
      intakeRecord
    );

    runtime.registerMonitoringContract({
      monitoringContractId:sourceContractId,
      intakeId:intakeRecord.monitoringContractIntakeId,
      actionInstanceId:intakeRecord.actionInstanceId,
      state:"validated",
      correlationId:intakeRecord.correlationId
    });

    const metricHandoff={
      metricRegistryHandoffId:
        runtime.createId("om_metric_registry_handoff"),
      targetBlock:"OM-03",
      monitoringContractIntakeId:
        intakeRecord.monitoringContractIntakeId,
      monitoringContractId:sourceContractId,
      metrics:monitoringContract.outcomes.map(item=>({
        outcomeDefinition:runtime.clone(item.definition),
        metric:runtime.clone(item.metric),
        source:runtime.clone(item.source)
      })),
      correlationId:intakeRecord.correlationId,
      lineage:intakeRecord.lineage.map(runtime.clone),
      confidence:intakeRecord.confidence,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.monitoringContractIntakeStore.put(
      "metric_handoffs",
      metricHandoff
    );

    await runtime.emit(
      "om.monitoring_contract.validated",
      {
        intakeRecord,
        metricRegistryHandoffId:
          metricHandoff.metricRegistryHandoffId
      }
    );

    return runtime.success({
      intake:intakeRecord,
      metricRegistryHandoff:metricHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    intake,
    getIntake:({monitoringContractIntakeId}) =>
      global.INFINICUS.OM.monitoringContractIntakeStore.get(
        "contracts",
        monitoringContractIntakeId
      ),
    getMetricRegistryHandoff:({metricRegistryHandoffId}) =>
      global.INFINICUS.OM.monitoringContractIntakeStore.get(
        "metric_handoffs",
        metricRegistryHandoffId
      )
  });

  runtime.registerService(
    "om.monitoring_contract_intake",
    api,
    {block:"OM-02"}
  );

  runtime.registerRoute(
    "om.monitoring_contract_intake_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.monitoring_contract.intake",
    intake
  );

  global.INFINICUS.OM.monitoringContractIntakeEngine=api;
})(window);
