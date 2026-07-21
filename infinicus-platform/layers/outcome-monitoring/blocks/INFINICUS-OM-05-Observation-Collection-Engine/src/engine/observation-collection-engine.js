(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const collectors=new Map();

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.observationCollectionPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.observationCollectionStore.put(
      "policies",
      built.data
    );
  }

  function registerCollector(connectorType,collector){
    if(!connectorType || typeof collector!=="function"){
      return runtime.failure(
        "OM_COLLECTOR_INVALID",
        "Connector type and collector function are required."
      );
    }

    collectors.set(connectorType,collector);

    return runtime.success({connectorType});
  }

  async function collect({
    observationCollectionHandoffId,
    observationCollectionPolicyId
  }={}){
    const handoff=
      await global.INFINICUS.OM.observationSourceConnectorRegistryEngine
        .getObservationCollectionHandoff({
          observationCollectionHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.observationCollectionStore.get(
        "policies",
        observationCollectionPolicyId
      );

    if(!policy.ok) return policy;

    const run={
      observationCollectionRunId:
        runtime.createId("om_collection_run"),
      observationCollectionHandoffId,
      monitoringContractId:
        handoff.data.monitoringContractId,
      status:"collecting",
      correlationId:handoff.data.correlationId,
      startedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.observationCollectionStore.put(
      "runs",
      run
    );

    const observations=[];
    const failures=[];

    for(const binding of handoff.data.sourceBindings){
      const source=
        await global.INFINICUS.OM.observationSourceConnectorRegistryEngine
          .getSource({
            observationSourceId:
              binding.observationSourceId
          });

      if(!source.ok){
        failures.push({
          bindingId:binding.observationSourceBindingId,
          error:source.error
        });
        continue;
      }

      const connector=
        await global.INFINICUS.OM.observationSourceConnectorRegistryEngine
          .getConnector({
            observationConnectorId:
              binding.observationConnectorId
          });

      if(!connector.ok){
        failures.push({
          bindingId:binding.observationSourceBindingId,
          error:connector.error
        });
        continue;
      }

      const collector=collectors.get(connector.data.connectorType);

      if(!collector){
        failures.push({
          bindingId:binding.observationSourceBindingId,
          error:{
            code:"OM_COLLECTOR_NOT_FOUND",
            message:
              `No collector registered for connector type: ${connector.data.connectorType}`
          }
        });
        continue;
      }

      try{
        const raw=
          await collector({
            binding:runtime.clone(binding),
            source:runtime.clone(source.data),
            connector:runtime.clone(connector.data)
          });

        const collectedAt=new Date().toISOString();

        const candidate={
          metricId:binding.metricId,
          observationSourceId:binding.observationSourceId,
          observationConnectorId:
            binding.observationConnectorId,
          value:runtime.clone(raw?.value),
          unit:raw?.unit || binding.unit,
          classification:
            raw?.classification || "observed",
          sourceTimestamp:raw?.sourceTimestamp || null,
          rawEvidence:
            policy.data.preserveRawEvidence
              ? runtime.clone(raw?.rawEvidence ?? raw)
              : null
        };

        const validation=
          global.INFINICUS.OM.observationValidator.validate({
            observation:candidate,
            binding,
            policy:policy.data,
            collectedAt
          });

        if(!validation.valid){
          failures.push({
            bindingId:binding.observationSourceBindingId,
            error:{
              code:"OM_OBSERVATION_INVALID",
              message:"Collected observation failed validation.",
              details:validation
            }
          });
          continue;
        }

        const idempotencyKey=
          `om_obs_${binding.metricId}_${binding.observationSourceId}_${candidate.sourceTimestamp}`;

        const existing=
          await global.INFINICUS.OM.observationCollectionStore
            .getByIdempotencyKey(idempotencyKey);

        if(existing.ok){
          observations.push(existing.data);
          continue;
        }

        const observation={
          observationId:
            runtime.createId("om_observation"),
          observationCollectionRunId:
            run.observationCollectionRunId,
          monitoringContractId:
            handoff.data.monitoringContractId,
          observationSourceBindingId:
            binding.observationSourceBindingId,
          ...candidate,
          idempotencyKey,
          correlationId:handoff.data.correlationId,
          lineage:[
            ...handoff.data.lineage.map(runtime.clone),
            {
              sourceType:"observation_source",
              sourceId:binding.observationSourceId,
              connectorId:binding.observationConnectorId,
              sourceTimestamp:candidate.sourceTimestamp
            }
          ],
          confidence:handoff.data.confidence,
          collectedAt
        };

        await global.INFINICUS.OM.observationCollectionStore.put(
          "observations",
          observation
        );

        observations.push(observation);
      }catch(error){
        failures.push({
          bindingId:binding.observationSourceBindingId,
          error:{
            code:"OM_COLLECTION_EXECUTION_FAILED",
            message:error?.message || "Observation collection failed."
          }
        });
      }
    }

    for(const failure of failures){
      await global.INFINICUS.OM.observationCollectionStore.put(
        "dead_letters",
        {
          observationCollectionDeadLetterId:
            runtime.createId("om_collection_dead_letter"),
          observationCollectionRunId:
            run.observationCollectionRunId,
          monitoringContractId:
            handoff.data.monitoringContractId,
          failure:runtime.clone(failure),
          correlationId:handoff.data.correlationId,
          createdAt:new Date().toISOString()
        }
      );
    }

    const completedRun={
      ...run,
      status:
        observations.length && failures.length
          ? "partially_observed"
          : observations.length
            ? "observed"
            : "failed",
      observationCount:observations.length,
      failureCount:failures.length,
      completedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.observationCollectionStore.put(
      "runs",
      completedRun
    );

    const qualityHandoff={
      observationQualityHandoffId:
        runtime.createId("om_observation_quality_handoff"),
      targetBlock:"OM-06",
      monitoringContractId:
        handoff.data.monitoringContractId,
      observationCollectionRunId:
        completedRun.observationCollectionRunId,
      observations:observations.map(runtime.clone),
      failures:failures.map(runtime.clone),
      correlationId:handoff.data.correlationId,
      lineage:handoff.data.lineage.map(runtime.clone),
      confidence:handoff.data.confidence,
      status:
        observations.length ? "ready" : "blocked",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.observationCollectionStore.put(
      "quality_handoffs",
      qualityHandoff
    );

    await runtime.emit(
      "om.observations.collected",
      {
        collectionRun:completedRun,
        observationQualityHandoffId:
          qualityHandoff.observationQualityHandoffId
      }
    );

    return runtime.success({
      collectionRun:completedRun,
      observations,
      failures,
      observationQualityHandoff:qualityHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    registerCollector,
    collect,
    getCollectionRun:({observationCollectionRunId}) =>
      global.INFINICUS.OM.observationCollectionStore.get(
        "runs",
        observationCollectionRunId
      ),
    getObservationQualityHandoff:({
      observationQualityHandoffId
    }) =>
      global.INFINICUS.OM.observationCollectionStore.get(
        "quality_handoffs",
        observationQualityHandoffId
      ),
    listObservations:() =>
      global.INFINICUS.OM.observationCollectionStore.list(
        "observations"
      ),
    listDeadLetters:() =>
      global.INFINICUS.OM.observationCollectionStore.list(
        "dead_letters"
      )
  });

  runtime.registerService(
    "om.observation_collection",
    api,
    {block:"OM-05"}
  );

  runtime.registerRoute(
    "om.observation_collection_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.observations.collect",
    collect
  );

  global.INFINICUS.OM.observationCollectionEngine=api;
})(window);
