(function(global){
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;

  async function registerAdapter(input={}){
    const built =
      global.INFINICUS.ABA.executionAdapterModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.executionAdapterStore.put(
      "adapters",
      built.data
    );
  }

  async function registerConnector(input={}){
    const adapter =
      await global.INFINICUS.ABA.executionAdapterStore.get(
        "adapters",
        input.executionAdapterId
      );

    if(!adapter.ok) return adapter;

    const built =
      global.INFINICUS.ABA.connectorModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.executionAdapterStore.put(
      "connectors",
      built.data
    );
  }

  async function recordHealth({
    executionAdapterId,
    connectorId,
    healthStatus,
    details={}
  }={}){
    const record={
      adapterHealthRecordId:
        runtime.createId("aba_adapter_health"),
      executionAdapterId:
        executionAdapterId || null,
      connectorId:
        connectorId || null,
      healthStatus:
        String(healthStatus || "unknown"),
      details:
        runtime.clone(details),
      checkedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.executionAdapterStore.put(
      "health",
      record
    );

    return runtime.success(record);
  }

  async function prepareAdapters({
    executionAdapterHandoffId,
    taskCatalog=[],
    region=null,
    environment="production"
  }={}){
    const handoff =
      await global.INFINICUS.ABA.executionSchedulingQueueEngine
        .getExecutionAdapterHandoff({
          executionAdapterHandoffId
        });

    if(!handoff.ok) return handoff;

    const adapters =
      await global.INFINICUS.ABA.executionAdapterStore.list(
        "adapters"
      );

    if(!adapters.ok) return adapters;

    const connectors =
      await global.INFINICUS.ABA.executionAdapterStore.list(
        "connectors"
      );

    if(!connectors.ok) return connectors;

    const selections=[];

    for(const queueItem of handoff.data.queueItems){
      const task =
        taskCatalog.find(item =>
          item.executionTaskId === queueItem.executionTaskId
        ) || {};

      const candidates=[];

      for(const adapter of adapters.data){
        const adapterConnectors =
          connectors.data.filter(item =>
            item.executionAdapterId === adapter.executionAdapterId
          );

        for(const connector of adapterConnectors){
          const evaluation =
            global.INFINICUS.ABA.executionAdapterSelector.evaluate({
              adapter,
              connector,
              queueItem,
              task,
              requiredCapabilities:
                task.requiredCapabilities || [],
              region,
              environment
            });

          candidates.push({
            adapter,
            connector,
            ...evaluation
          });
        }
      }

      const selected =
        global.INFINICUS.ABA.executionAdapterSelector.select(
          candidates
        );

      if(!selected){
        return runtime.failure(
          "ABA_EXECUTION_ADAPTER_NOT_FOUND",
          "No eligible execution adapter and connector were found.",
          {
            executionTaskId:
              queueItem.executionTaskId,
            candidateIssues:
              candidates.map(item=>({
                executionAdapterId:
                  item.adapter.executionAdapterId,
                connectorId:
                  item.connector.connectorId,
                issues:
                  item.issues
              }))
          }
        );
      }

      const idempotencyKey =
        selected.adapter.requiresIdempotencyKey
          ? runtime.createId("aba_idempotency")
          : null;

      const invocationEnvelope={
        executionInvocationEnvelopeId:
          runtime.createId("aba_execution_invocation"),
        executionScheduleId:
          handoff.data.executionScheduleId,
        executionPlanId:
          handoff.data.executionPlanId,
        actionQueueItemId:
          queueItem.actionQueueItemId,
        executionTaskId:
          queueItem.executionTaskId,
        executionAdapterId:
          selected.adapter.executionAdapterId,
        connectorId:
          selected.connector.connectorId,
        adapterCode:
          selected.adapter.code,
        connectorCode:
          selected.connector.code,
        endpointReference:
          selected.connector.endpointReference,
        credentialReference:
          selected.connector.credentialReference,
        authenticationType:
          selected.connector.authenticationType,
        payload:
          runtime.clone(task.payload || task.inputs || {}),
        assignedActorId:
          queueItem.assignedActorId,
        reservationIds:
          queueItem.reservationIds.map(runtime.clone),
        idempotencyKey,
        timeoutSeconds:
          selected.connector.timeoutSeconds,
        retryable:
          selected.connector.retryable,
        dryRunRequired:
          selected.adapter.requiresDryRun,
        environment,
        region,
        correlationId:
          queueItem.correlationId,
        status:
          "prepared",
        createdAt:
          new Date().toISOString()
      };

      const selectionRecord={
        adapterSelectionId:
          runtime.createId("aba_adapter_selection"),
        executionInvocationEnvelopeId:
          invocationEnvelope.executionInvocationEnvelopeId,
        actionQueueItemId:
          queueItem.actionQueueItemId,
        executionAdapterId:
          selected.adapter.executionAdapterId,
        connectorId:
          selected.connector.connectorId,
        evaluation:{
          eligible:true,
          issues:[]
        },
        createdAt:
          new Date().toISOString()
      };

      await global.INFINICUS.ABA.executionAdapterStore.put(
        "selections",
        selectionRecord
      );

      selections.push({
        selection:
          selectionRecord,
        invocationEnvelope
      });
    }

    const dryRunHandoff={
      dryRunHandoffId:
        runtime.createId("aba_dry_run_handoff"),
      targetBlock:
        "ABA-18",
      executionScheduleId:
        handoff.data.executionScheduleId,
      executionPlanId:
        handoff.data.executionPlanId,
      invocationEnvelopes:
        selections.map(item =>
          runtime.clone(item.invocationEnvelope)
        ),
      retryPolicy:
        runtime.clone(handoff.data.retryPolicy),
      leaseSeconds:
        handoff.data.leaseSeconds,
      correlationId:
        handoff.data.correlationId,
      status:
        "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.executionAdapterStore.put(
      "dry_run_handoffs",
      dryRunHandoff
    );

    await runtime.emit(
      "aba.execution_adapters.prepared",
      {
        executionScheduleId:
          handoff.data.executionScheduleId,
        invocationCount:
          selections.length,
        dryRunHandoffId:
          dryRunHandoff.dryRunHandoffId
      }
    );

    return runtime.success({
      selections,
      dryRunHandoff
    });
  }

  const api = Object.freeze({
    registerAdapter,
    registerConnector,
    recordHealth,
    prepareAdapters,
    getAdapter:({executionAdapterId}) =>
      global.INFINICUS.ABA.executionAdapterStore.get(
        "adapters",
        executionAdapterId
      ),
    getDryRunHandoff:({dryRunHandoffId}) =>
      global.INFINICUS.ABA.executionAdapterStore.get(
        "dry_run_handoffs",
        dryRunHandoffId
      ),
    listConnectors:() =>
      global.INFINICUS.ABA.executionAdapterStore.list(
        "connectors"
      )
  });

  runtime.registerService(
    "aba.execution_adapter_connector_registry",
    api,
    {block:"ABA-17"}
  );

  runtime.registerRoute(
    "aba.execution_adapter.register",
    registerAdapter
  );

  runtime.registerRoute(
    "aba.connector.register",
    registerConnector
  );

  runtime.registerRoute(
    "aba.execution_adapter.health",
    recordHealth
  );

  runtime.registerRoute(
    "aba.execution_adapters.prepare",
    prepareAdapters
  );

  runtime.registerBlock("ABA-17",{
    name:"Execution Adapter and Connector Registry",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.executionAdapterConnectorRegistry =
    api;
})(window);
