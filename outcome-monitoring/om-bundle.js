/* OM LAYER BUNDLE */
/* Auto-generated — do not edit directly */
/* Contains: INFINICUS-OM-01 through INFINICUS-OM-25 */


/* ===== INFINICUS-OM-01-Outcome-Monitoring-Core-Runtime-Registry ===== */

/* --- outcome-monitoring/INFINICUS-OM-01-Outcome-Monitoring-Core-Runtime-Registry/src/runtime/result-envelope.js --- */
(function(global){
  "use strict";

  function success(data=null,meta={}){
    return Object.freeze({
      ok:true,
      data,
      error:null,
      meta:Object.freeze({
        timestamp:new Date().toISOString(),
        ...meta
      })
    });
  }

  function failure(code,message,details=null,meta={}){
    return Object.freeze({
      ok:false,
      data:null,
      error:Object.freeze({
        code:String(code || "OM_UNKNOWN_ERROR"),
        message:String(message || "Outcome Monitoring operation failed."),
        details
      }),
      meta:Object.freeze({
        timestamp:new Date().toISOString(),
        ...meta
      })
    });
  }

  global.INFINICUS=global.INFINICUS || {};
  global.INFINICUS.OM=global.INFINICUS.OM || {};
  global.INFINICUS.OM.resultEnvelope=
    Object.freeze({success,failure});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-01-Outcome-Monitoring-Core-Runtime-Registry/src/runtime/id-factory.js --- */
(function(global){
  "use strict";

  function randomPart(){
    if(global.crypto?.randomUUID){
      return global.crypto.randomUUID().replaceAll("-","");
    }

    return (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2)
    );
  }

  function createId(prefix="om"){
    return `${prefix}_${randomPart()}`;
  }

  global.INFINICUS.OM.idFactory=
    Object.freeze({createId});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-01-Outcome-Monitoring-Core-Runtime-Registry/src/runtime/service-registry.js --- */
(function(global){
  "use strict";

  const services=new Map();

  function register(name,service,metadata={}){
    if(!name || !service){
      return global.INFINICUS.OM.resultEnvelope.failure(
        "OM_SERVICE_INVALID",
        "Service name and implementation are required."
      );
    }

    if(services.has(name)){
      return global.INFINICUS.OM.resultEnvelope.failure(
        "OM_SERVICE_DUPLICATE",
        `Service is already registered: ${name}`
      );
    }

    services.set(name,{
      name,
      service,
      metadata:structuredClone(metadata),
      registeredAt:new Date().toISOString()
    });

    return global.INFINICUS.OM.resultEnvelope.success({
      name,
      metadata
    });
  }

  function get(name){
    const record=services.get(name);

    return record
      ? global.INFINICUS.OM.resultEnvelope.success(record.service)
      : global.INFINICUS.OM.resultEnvelope.failure(
          "OM_SERVICE_NOT_FOUND",
          `Service was not found: ${name}`
        );
  }

  function list(){
    return global.INFINICUS.OM.resultEnvelope.success(
      [...services.values()].map(item=>({
        name:item.name,
        metadata:structuredClone(item.metadata),
        registeredAt:item.registeredAt
      }))
    );
  }

  global.INFINICUS.OM.serviceRegistry=
    Object.freeze({register,get,list});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-01-Outcome-Monitoring-Core-Runtime-Registry/src/runtime/route-registry.js --- */
(function(global){
  "use strict";

  const routes=new Map();

  function register(name,handler,metadata={}){
    if(!name || typeof handler!=="function"){
      return global.INFINICUS.OM.resultEnvelope.failure(
        "OM_ROUTE_INVALID",
        "Route name and handler function are required."
      );
    }

    if(routes.has(name)){
      return global.INFINICUS.OM.resultEnvelope.failure(
        "OM_ROUTE_DUPLICATE",
        `Route is already registered: ${name}`
      );
    }

    routes.set(name,{
      name,
      handler,
      metadata:structuredClone(metadata),
      registeredAt:new Date().toISOString()
    });

    return global.INFINICUS.OM.resultEnvelope.success({
      name,
      metadata
    });
  }

  async function dispatch(name,payload={}){
    const route=routes.get(name);

    if(!route){
      return global.INFINICUS.OM.resultEnvelope.failure(
        "OM_ROUTE_NOT_FOUND",
        `Route was not found: ${name}`
      );
    }

    try{
      return await route.handler(payload);
    }catch(error){
      return global.INFINICUS.OM.resultEnvelope.failure(
        "OM_ROUTE_EXECUTION_FAILED",
        error?.message || `Route execution failed: ${name}`
      );
    }
  }

  function list(){
    return global.INFINICUS.OM.resultEnvelope.success(
      [...routes.values()].map(item=>({
        name:item.name,
        metadata:structuredClone(item.metadata),
        registeredAt:item.registeredAt
      }))
    );
  }

  global.INFINICUS.OM.routeRegistry=
    Object.freeze({register,dispatch,list});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-01-Outcome-Monitoring-Core-Runtime-Registry/src/runtime/event-bus.js --- */
(function(global){
  "use strict";

  const subscribers=new Map();
  const history=[];

  function subscribe(eventName,handler){
    if(!eventName || typeof handler!=="function"){
      return global.INFINICUS.OM.resultEnvelope.failure(
        "OM_EVENT_SUBSCRIPTION_INVALID",
        "Event name and handler are required."
      );
    }

    const handlers=subscribers.get(eventName) || new Set();
    handlers.add(handler);
    subscribers.set(eventName,handlers);

    return global.INFINICUS.OM.resultEnvelope.success({
      eventName,
      unsubscribe:()=>handlers.delete(handler)
    });
  }

  async function emit(eventName,payload={}){
    const event={
      eventId:global.INFINICUS.OM.idFactory.createId("om_event"),
      eventName,
      payload:structuredClone(payload),
      occurredAt:new Date().toISOString()
    };

    history.push(event);

    const handlers=[
      ...(subscribers.get(eventName) || []),
      ...(subscribers.get("*") || [])
    ];

    const errors=[];

    for(const handler of handlers){
      try{
        await handler(structuredClone(event));
      }catch(error){
        errors.push(error?.message || "Event handler failed.");
      }
    }

    return global.INFINICUS.OM.resultEnvelope.success({
      event,
      handlerCount:handlers.length,
      errors
    });
  }

  function listHistory(){
    return global.INFINICUS.OM.resultEnvelope.success(
      history.map(structuredClone)
    );
  }

  global.INFINICUS.OM.eventBus=
    Object.freeze({subscribe,emit,listHistory});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-01-Outcome-Monitoring-Core-Runtime-Registry/src/runtime/lifecycle-registry.js --- */
(function(global){
  "use strict";

  const states=Object.freeze([
    "draft",
    "pending_validation",
    "validated",
    "scheduled",
    "collecting",
    "partially_observed",
    "observed",
    "evaluating",
    "alerted",
    "completed",
    "inconclusive",
    "failed",
    "paused",
    "cancelled",
    "expired"
  ]);

  const transitions=Object.freeze({
    draft:["pending_validation","cancelled"],
    pending_validation:["validated","failed","cancelled"],
    validated:["scheduled","collecting","cancelled"],
    scheduled:["collecting","paused","cancelled","expired"],
    collecting:[
      "partially_observed",
      "observed",
      "alerted",
      "paused",
      "failed",
      "expired"
    ],
    partially_observed:[
      "collecting",
      "observed",
      "evaluating",
      "alerted",
      "failed",
      "expired"
    ],
    observed:["evaluating","completed","inconclusive"],
    evaluating:["completed","inconclusive","alerted","failed"],
    alerted:["collecting","evaluating","paused","completed","failed"],
    paused:["scheduled","collecting","cancelled","expired"],
    completed:[],
    inconclusive:[],
    failed:[],
    cancelled:[],
    expired:[]
  });

  function canTransition(from,to){
    return Boolean(transitions[from]?.includes(to));
  }

  function validateState(state){
    return states.includes(state);
  }

  global.INFINICUS.OM.lifecycleRegistry=
    Object.freeze({
      states,
      transitions,
      canTransition,
      validateState
    });
})(window);

/* --- outcome-monitoring/INFINICUS-OM-01-Outcome-Monitoring-Core-Runtime-Registry/src/registry/generic-registry.js --- */
(function(global){
  "use strict";

  function createRegistry({
    registryName,
    idField
  }){
    const records=new Map();

    function register(record={}){
      const id=record[idField];

      if(!id){
        return global.INFINICUS.OM.resultEnvelope.failure(
          "OM_REGISTRY_RECORD_INVALID",
          `${registryName} requires ${idField}.`
        );
      }

      if(records.has(id)){
        return global.INFINICUS.OM.resultEnvelope.failure(
          "OM_REGISTRY_RECORD_DUPLICATE",
          `${registryName} record already exists: ${id}`
        );
      }

      const stored=Object.freeze({
        ...structuredClone(record),
        registeredAt:
          record.registeredAt ||
          new Date().toISOString()
      });

      records.set(id,stored);

      return global.INFINICUS.OM.resultEnvelope.success(
        structuredClone(stored)
      );
    }

    function get(id){
      const record=records.get(id);

      return record
        ? global.INFINICUS.OM.resultEnvelope.success(
            structuredClone(record)
          )
        : global.INFINICUS.OM.resultEnvelope.failure(
            "OM_REGISTRY_RECORD_NOT_FOUND",
            `${registryName} record was not found.`,
            {id}
          );
    }

    function list(){
      return global.INFINICUS.OM.resultEnvelope.success(
        [...records.values()].map(structuredClone)
      );
    }

    return Object.freeze({register,get,list});
  }

  global.INFINICUS.OM.genericRegistryFactory=
    Object.freeze({createRegistry});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-01-Outcome-Monitoring-Core-Runtime-Registry/src/registry/monitoring-registries.js --- */
(function(global){
  "use strict";

  const factory=global.INFINICUS.OM.genericRegistryFactory;

  global.INFINICUS.OM.metricRegistry=
    factory.createRegistry({
      registryName:"Metric Registry",
      idField:"metricId"
    });

  global.INFINICUS.OM.observationSourceRegistry=
    factory.createRegistry({
      registryName:"Observation Source Registry",
      idField:"observationSourceId"
    });

  global.INFINICUS.OM.monitoringContractRegistry=
    factory.createRegistry({
      registryName:"Monitoring Contract Registry",
      idField:"monitoringContractId"
    });

  global.INFINICUS.OM.outcomeStateRegistry=
    factory.createRegistry({
      registryName:"Outcome State Registry",
      idField:"outcomeStateId"
    });
})(window);

/* --- outcome-monitoring/INFINICUS-OM-01-Outcome-Monitoring-Core-Runtime-Registry/src/manifest/block-manifest.js --- */
(function(global){
  "use strict";

  const names=[
    "Outcome Monitoring Core Runtime and Registry",
    "Monitoring Contract Intake and Validation Engine",
    "Metric and KPI Registry",
    "Observation Source and Connector Registry",
    "Observation Collection Engine",
    "Data Quality and Evidence Validation Engine",
    "Baseline and Target Registry",
    "Observation Window and Monitoring Schedule Engine",
    "Metric Normalization and Aggregation Engine",
    "Outcome Progress Calculation Engine",
    "Variance and Threshold Detection Engine",
    "Alert and Escalation Engine",
    "Attribution Evidence Engine",
    "Causation Assessment Engine",
    "External Factor and Confounder Engine",
    "Expected-versus-Actual Comparison Engine",
    "Outcome Confidence and Reliability Engine",
    "Benefit Realization Engine",
    "Adverse Outcome and Side-Effect Detection Engine",
    "Monitoring Exception and Missing-Data Engine",
    "Outcome Evidence and Audit Trail Engine",
    "Outcome Evaluation and Verdict Engine",
    "Learning Package Generation Engine",
    "Continuous Learning Publication and Handoff Engine",
    "Outcome Monitoring Master Integration and Deployment Engine"
  ];

  const manifest=names.map((name,index)=>Object.freeze({
    blockId:`OM-${String(index+1).padStart(2,"0")}`,
    sequence:index+1,
    name,
    required:true
  }));

  global.INFINICUS.OM.blockManifest=Object.freeze(manifest);
})(window);

/* --- outcome-monitoring/INFINICUS-OM-01-Outcome-Monitoring-Core-Runtime-Registry/src/diagnostics/diagnostics.js --- */
(function(global){
  "use strict";

  function run(){
    const OM=global.INFINICUS.OM;

    const requiredComponents=[
      "resultEnvelope",
      "idFactory",
      "serviceRegistry",
      "routeRegistry",
      "eventBus",
      "lifecycleRegistry",
      "metricRegistry",
      "observationSourceRegistry",
      "monitoringContractRegistry",
      "outcomeStateRegistry",
      "blockManifest"
    ];

    const checks=requiredComponents.map(component=>({
      component,
      available:Boolean(OM[component])
    }));

    const missing=checks.filter(item=>!item.available);

    return OM.resultEnvelope.success({
      healthy:missing.length===0,
      checks,
      missing,
      manifestBlockCount:OM.blockManifest?.length || 0,
      generatedAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.diagnostics=
    Object.freeze({run});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-01-Outcome-Monitoring-Core-Runtime-Registry/src/runtime/runtime.js --- */
(function(global){
  "use strict";

  const OM=global.INFINICUS.OM;

  const runtime=Object.freeze({
    success:OM.resultEnvelope.success,
    failure:OM.resultEnvelope.failure,
    createId:OM.idFactory.createId,
    clone:value=>structuredClone(value),
    registerService:OM.serviceRegistry.register,
    getService:OM.serviceRegistry.get,
    listServices:OM.serviceRegistry.list,
    registerRoute:OM.routeRegistry.register,
    dispatch:OM.routeRegistry.dispatch,
    listRoutes:OM.routeRegistry.list,
    subscribe:OM.eventBus.subscribe,
    emit:OM.eventBus.emit,
    listEvents:OM.eventBus.listHistory,
    lifecycle:OM.lifecycleRegistry,
    registerMetric:OM.metricRegistry.register,
    getMetric:OM.metricRegistry.get,
    listMetrics:OM.metricRegistry.list,
    registerObservationSource:OM.observationSourceRegistry.register,
    getObservationSource:OM.observationSourceRegistry.get,
    listObservationSources:OM.observationSourceRegistry.list,
    registerMonitoringContract:OM.monitoringContractRegistry.register,
    getMonitoringContract:OM.monitoringContractRegistry.get,
    listMonitoringContracts:OM.monitoringContractRegistry.list,
    registerOutcomeState:OM.outcomeStateRegistry.register,
    getOutcomeState:OM.outcomeStateRegistry.get,
    listOutcomeStates:OM.outcomeStateRegistry.list,
    getBlockManifest:() =>
      OM.resultEnvelope.success(
        OM.blockManifest.map(structuredClone)
      ),
    diagnose:OM.diagnostics.run
  });

  OM.runtime=runtime;

  runtime.registerService(
    "om.core_runtime",
    runtime,
    {
      block:"OM-01",
      version:"1.0.0"
    }
  );

  runtime.registerRoute(
    "om.runtime.diagnose",
    async()=>runtime.diagnose(),
    {block:"OM-01"}
  );

  runtime.registerRoute(
    "om.runtime.manifest",
    async()=>runtime.getBlockManifest(),
    {block:"OM-01"}
  );

  runtime.emit("om.runtime.ready",{
    block:"OM-01",
    version:"1.0.0"
  });
})(window);

/* ===== INFINICUS-OM-02-Monitoring-Contract-Intake-Validation-Engine ===== */

/* --- outcome-monitoring/INFINICUS-OM-02-Monitoring-Contract-Intake-Validation-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";
  if(!global.INFINICUS?.OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-02.");
  }
})(window);

/* --- outcome-monitoring/INFINICUS-OM-02-Monitoring-Contract-Intake-Validation-Engine/src/model/intake-policy.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_INTAKE_POLICY_INVALID",
        "Policy name and code are required."
      );
    }

    return runtime.success({
      monitoringContractIntakePolicyId:
        input.monitoringContractIntakePolicyId ||
        runtime.createId("om_intake_policy"),
      name:String(input.name),
      code:String(input.code),
      requireLineage:input.requireLineage !== false,
      requireObservedSources:input.requireObservedSources !== false,
      minimumConfidence:
        Math.max(0,Math.min(1,Number(input.minimumConfidence ?? 0.6))),
      allowOpenEndedWindow:Boolean(input.allowOpenEndedWindow),
      quarantineInvalid:input.quarantineInvalid !== false,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.monitoringContractIntakePolicyModel=
    Object.freeze({create});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-02-Monitoring-Contract-Intake-Validation-Engine/src/validation/contract-validator.js --- */
(function(global){
  "use strict";

  function validateOutcome(item,policy){
    const issues=[];
    const definition=item?.definition || {};
    const metric=item?.metric || {};
    const source=item?.source || {};

    if(!definition.expectedOutcomeDefinitionId){
      issues.push("Expected outcome definition ID is required.");
    }

    if(!metric.outcomeMetricId && !metric.metricId){
      issues.push("Metric ID is required.");
    }

    if(!metric.code || !metric.valueType){
      issues.push("Metric code and value type are required.");
    }

    if(!source.outcomeEvidenceSourceId && !source.observationSourceId){
      issues.push("Evidence source ID is required.");
    }

    if(policy.requireObservedSources && source.observedStateOnly !== true){
      issues.push("Evidence source must provide observed-state evidence.");
    }

    if(definition.baselineValue===undefined){
      issues.push("Baseline value is required.");
    }

    if(definition.targetValue===undefined){
      issues.push("Target value is required.");
    }

    const startsAt=definition.observationWindow?.startsAt;
    const endsAt=definition.observationWindow?.endsAt;

    if(!startsAt){
      issues.push("Observation window start is required.");
    }

    if(!endsAt && !policy.allowOpenEndedWindow){
      issues.push("Observation window end is required.");
    }

    if(
      startsAt &&
      endsAt &&
      new Date(endsAt).getTime() <= new Date(startsAt).getTime()
    ){
      issues.push("Observation window end must be after start.");
    }

    if(
      Number(definition.confidenceMinimum ?? 0) <
      policy.minimumConfidence
    ){
      issues.push("Outcome confidence requirement is below policy minimum.");
    }

    return issues;
  }

  function validateContract(contract,policy){
    const issues=[];

    if(policy.status!=="active"){
      issues.push("Intake policy is inactive.");
    }

    if(!contract.outcomeMonitoringContractId){
      issues.push("Monitoring contract ID is required.");
    }

    if(!contract.actionInstanceId){
      issues.push("Action instance ID is required.");
    }

    if(!contract.actionCompletionCertificateId){
      issues.push("Completion certificate ID is required.");
    }

    if(!Array.isArray(contract.outcomes) || !contract.outcomes.length){
      issues.push("At least one outcome is required.");
    }

    if(policy.requireLineage && (!Array.isArray(contract.lineage) || !contract.lineage.length)){
      issues.push("Contract lineage is required.");
    }

    if(
      Number(contract.confidence ?? 0) <
      policy.minimumConfidence
    ){
      issues.push("Contract confidence is below policy minimum.");
    }

    for(const [index,item] of (contract.outcomes || []).entries()){
      for(const issue of validateOutcome(item,policy)){
        issues.push(`Outcome ${index+1}: ${issue}`);
      }
    }

    return {valid:issues.length===0,issues};
  }

  global.INFINICUS.OM.monitoringContractValidator=
    Object.freeze({validateContract});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-02-Monitoring-Contract-Intake-Validation-Engine/src/storage/intake-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_CONTRACT_INTAKE";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;

        for(const [name,keyPath] of [
          ["policies","monitoringContractIntakePolicyId"],
          ["contracts","monitoringContractIntakeId"],
          ["quarantine","monitoringContractQuarantineId"],
          ["metric_handoffs","metricRegistryHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});

            if(name==="contracts"){
              store.createIndex(
                "sourceContractId",
                "sourceContractId",
                {unique:true}
              );
            }
          }
        }
      };

      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "OM_INTAKE_STORAGE_ERROR",
        error?.message || "Monitoring-contract intake storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_INTAKE_RECORD_NOT_FOUND",
            "Monitoring-contract intake record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_INTAKE_STORAGE_ERROR",
        error?.message || "Monitoring-contract intake retrieval failed."
      );
    }
  }

  async function getBySourceContractId(sourceContractId){
    try{
      const db=await open();
      const tx=db.transaction("contracts","readonly");
      const value=await reqp(
        tx.objectStore("contracts")
          .index("sourceContractId")
          .get(sourceContractId)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_INTAKE_RECORD_NOT_FOUND",
            "Monitoring contract was not previously ingested."
          );
    }catch(error){
      return runtime.failure(
        "OM_INTAKE_STORAGE_ERROR",
        error?.message || "Monitoring-contract intake retrieval failed."
      );
    }
  }

  global.INFINICUS.OM.monitoringContractIntakeStore=
    Object.freeze({open,put,get,getBySourceContractId});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-02-Monitoring-Contract-Intake-Validation-Engine/src/engine/monitoring-contract-intake-engine.js --- */
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

/* ===== INFINICUS-OM-03-Metric-KPI-Registry ===== */

/* --- outcome-monitoring/INFINICUS-OM-03-Metric-KPI-Registry/src/core/runtime-guard.js --- */
(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-03.");
  }

  if(!OM?.monitoringContractIntakeEngine){
    throw new Error("OM-02 must be loaded before OM-03.");
  }
})(window);

/* --- outcome-monitoring/INFINICUS-OM-03-Metric-KPI-Registry/src/model/metric-definition.js --- */
(function(global){
  "use strict";

  function create({
    monitoringContractId,
    outcomeDefinition,
    metric,
    source,
    correlationId,
    lineage,
    confidence
  }={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!metric?.code || !metric?.valueType){
      return runtime.failure(
        "OM_METRIC_DEFINITION_INVALID",
        "Metric code and value type are required."
      );
    }

    const metricId=
      metric.outcomeMetricId ||
      metric.metricId ||
      runtime.createId("om_metric");

    return runtime.success({
      metricId,
      sourceMetricId:metricId,
      monitoringContractId,
      expectedOutcomeDefinitionId:
        outcomeDefinition?.expectedOutcomeDefinitionId || null,
      code:String(metric.code),
      name:String(metric.name || metric.code),
      description:String(metric.description || ""),
      valueType:String(metric.valueType),
      unit:metric.unit || null,
      aggregation:String(metric.aggregation || "latest"),
      direction:String(metric.direction || "increase"),
      sourceField:metric.sourceField || null,
      formula:metric.formula || null,
      baselineValue:runtime.clone(outcomeDefinition?.baselineValue),
      targetValue:runtime.clone(outcomeDefinition?.targetValue),
      minimumAcceptableValue:
        runtime.clone(outcomeDefinition?.minimumAcceptableValue),
      maximumAcceptableValue:
        runtime.clone(outcomeDefinition?.maximumAcceptableValue),
      tolerance:
        outcomeDefinition?.tolerance == null
          ? null
          : Number(outcomeDefinition.tolerance),
      observationWindow:
        runtime.clone(outcomeDefinition?.observationWindow || {}),
      reviewCadenceMinutes:
        Number(outcomeDefinition?.reviewCadenceMinutes || 1440),
      causationRequired:
        Boolean(outcomeDefinition?.causationRequired),
      attributionRequirements:
        runtime.clone(outcomeDefinition?.attributionRequirements || []),
      confidenceMinimum:
        Number(outcomeDefinition?.confidenceMinimum ?? 0.6),
      observationSourceReference:
        source?.outcomeEvidenceSourceId ||
        source?.observationSourceId ||
        null,
      correlationId:correlationId || null,
      lineage:runtime.clone(lineage || []),
      confidence:Number(confidence ?? 0),
      version:1,
      status:"active",
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.metricDefinitionModel=
    Object.freeze({create});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-03-Metric-KPI-Registry/src/validation/metric-validator.js --- */
(function(global){
  "use strict";

  function validate(metric){
    const issues=[];

    if(!metric.metricId) issues.push("Metric ID is required.");
    if(!metric.code) issues.push("Metric code is required.");
    if(!metric.valueType) issues.push("Metric value type is required.");
    if(!metric.monitoringContractId){
      issues.push("Monitoring contract ID is required.");
    }
    if(!metric.observationSourceReference){
      issues.push("Observation source reference is required.");
    }

    if(
      metric.observationWindow?.endsAt &&
      new Date(metric.observationWindow.endsAt).getTime() <=
      new Date(metric.observationWindow.startsAt).getTime()
    ){
      issues.push("Observation window is invalid.");
    }

    if(metric.confidenceMinimum<0 || metric.confidenceMinimum>1){
      issues.push("Confidence minimum must be between 0 and 1.");
    }

    return {valid:issues.length===0,issues};
  }

  global.INFINICUS.OM.metricDefinitionValidator=
    Object.freeze({validate});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-03-Metric-KPI-Registry/src/storage/metric-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_METRIC_REGISTRY";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;

        if(!db.objectStoreNames.contains("metrics")){
          const store=db.createObjectStore(
            "metrics",
            {keyPath:"metricId"}
          );
          store.createIndex("code","code",{unique:true});
        }

        for(const [name,keyPath] of [
          ["versions","metricVersionId"],
          ["source_bindings","metricSourceBindingId"],
          ["source_handoffs","observationSourceHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
          }
        }
      };

      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "OM_METRIC_STORAGE_ERROR",
        error?.message || "Metric registry storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_METRIC_RECORD_NOT_FOUND",
            "Metric registry record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_METRIC_STORAGE_ERROR",
        error?.message || "Metric registry retrieval failed."
      );
    }
  }

  async function getByCode(code){
    try{
      const db=await open();
      const tx=db.transaction("metrics","readonly");
      const value=await reqp(
        tx.objectStore("metrics").index("code").get(code)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_METRIC_NOT_FOUND",
            "Metric code was not found.",
            {code}
          );
    }catch(error){
      return runtime.failure(
        "OM_METRIC_STORAGE_ERROR",
        error?.message || "Metric registry retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "OM_METRIC_STORAGE_ERROR",
        error?.message || "Metric registry listing failed."
      );
    }
  }

  global.INFINICUS.OM.metricKPIStore=
    Object.freeze({open,put,get,getByCode,list});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-03-Metric-KPI-Registry/src/engine/metric-kpi-registry-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerFromHandoff({
    metricRegistryHandoffId
  }={}){
    const handoff=
      await global.INFINICUS.OM.monitoringContractIntakeEngine
        .getMetricRegistryHandoff({metricRegistryHandoffId});

    if(!handoff.ok) return handoff;

    const registered=[];
    const sourceBindings=[];

    for(const item of handoff.data.metrics){
      const built=
        global.INFINICUS.OM.metricDefinitionModel.create({
          monitoringContractId:
            handoff.data.monitoringContractId,
          outcomeDefinition:item.outcomeDefinition,
          metric:item.metric,
          source:item.source,
          correlationId:handoff.data.correlationId,
          lineage:handoff.data.lineage,
          confidence:handoff.data.confidence
        });

      if(!built.ok) return built;

      const validation=
        global.INFINICUS.OM.metricDefinitionValidator.validate(
          built.data
        );

      if(!validation.valid){
        return runtime.failure(
          "OM_METRIC_DEFINITION_INVALID",
          "Metric definition failed validation.",
          validation
        );
      }

      const duplicate=
        await global.INFINICUS.OM.metricKPIStore
          .getByCode(built.data.code);

      if(duplicate.ok){
        return runtime.failure(
          "OM_METRIC_CODE_DUPLICATE",
          `Metric code is already registered: ${built.data.code}`,
          {
            existingMetricId:duplicate.data.metricId
          }
        );
      }

      await global.INFINICUS.OM.metricKPIStore.put(
        "metrics",
        built.data
      );

      await global.INFINICUS.OM.metricKPIStore.put(
        "versions",
        {
          metricVersionId:runtime.createId("om_metric_version"),
          metricId:built.data.metricId,
          version:built.data.version,
          snapshot:runtime.clone(built.data),
          createdAt:new Date().toISOString()
        }
      );

      runtime.registerMetric(runtime.clone(built.data));

      const binding={
        metricSourceBindingId:
          runtime.createId("om_metric_source_binding"),
        metricId:built.data.metricId,
        observationSourceReference:
          built.data.observationSourceReference,
        sourceField:built.data.sourceField,
        valueType:built.data.valueType,
        unit:built.data.unit,
        aggregation:built.data.aggregation,
        status:"active",
        createdAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.metricKPIStore.put(
        "source_bindings",
        binding
      );

      registered.push(runtime.clone(built.data));
      sourceBindings.push(runtime.clone(binding));
    }

    const sourceHandoff={
      observationSourceHandoffId:
        runtime.createId("om_observation_source_handoff"),
      targetBlock:"OM-04",
      monitoringContractId:
        handoff.data.monitoringContractId,
      metrics:registered.map(runtime.clone),
      sourceBindings:sourceBindings.map(runtime.clone),
      correlationId:handoff.data.correlationId,
      lineage:handoff.data.lineage.map(runtime.clone),
      confidence:handoff.data.confidence,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.metricKPIStore.put(
      "source_handoffs",
      sourceHandoff
    );

    await runtime.emit(
      "om.metrics.registered",
      {
        metricCount:registered.length,
        observationSourceHandoffId:
          sourceHandoff.observationSourceHandoffId
      }
    );

    return runtime.success({
      metrics:registered,
      sourceBindings,
      observationSourceHandoff:sourceHandoff
    });
  }

  async function retire({
    metricId,
    reason=null
  }={}){
    const metric=
      await global.INFINICUS.OM.metricKPIStore.get(
        "metrics",
        metricId
      );

    if(!metric.ok) return metric;

    const retired={
      ...metric.data,
      status:"retired",
      retirementReason:reason,
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.metricKPIStore.put(
      "metrics",
      retired
    );

    return runtime.success({metric:retired});
  }

  const api=Object.freeze({
    registerFromHandoff,
    retire,
    getMetric:({metricId}) =>
      global.INFINICUS.OM.metricKPIStore.get(
        "metrics",
        metricId
      ),
    getObservationSourceHandoff:({
      observationSourceHandoffId
    }) =>
      global.INFINICUS.OM.metricKPIStore.get(
        "source_handoffs",
        observationSourceHandoffId
      ),
    listMetrics:() =>
      global.INFINICUS.OM.metricKPIStore.list("metrics")
  });

  runtime.registerService(
    "om.metric_kpi_registry",
    api,
    {block:"OM-03"}
  );

  runtime.registerRoute(
    "om.metrics.register_from_handoff",
    registerFromHandoff
  );

  runtime.registerRoute(
    "om.metric.retire",
    retire
  );

  global.INFINICUS.OM.metricKPIRegistryEngine=api;
})(window);

/* ===== INFINICUS-OM-04-Observation-Source-Connector-Registry ===== */

/* --- outcome-monitoring/INFINICUS-OM-04-Observation-Source-Connector-Registry/src/core/runtime-guard.js --- */
(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-04.");
  }

  if(!OM?.metricKPIRegistryEngine){
    throw new Error("OM-03 must be loaded before OM-04.");
  }
})(window);

/* --- outcome-monitoring/INFINICUS-OM-04-Observation-Source-Connector-Registry/src/model/observation-source.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.sourceType){
      return runtime.failure(
        "OM_OBSERVATION_SOURCE_INVALID",
        "Observation source name and sourceType are required."
      );
    }

    return runtime.success({
      observationSourceId:
        input.observationSourceId ||
        runtime.createId("om_observation_source"),
      sourceReference:input.sourceReference || null,
      name:String(input.name),
      sourceType:String(input.sourceType),
      ownerReference:input.ownerReference || null,
      classification:String(input.classification || "internal"),
      systemOfRecord:Boolean(input.systemOfRecord),
      observedStateOnly:input.observedStateOnly !== false,
      refreshCadenceMinutes:
        Math.max(1,Number(input.refreshCadenceMinutes || 60)),
      freshnessToleranceMinutes:
        Math.max(1,Number(input.freshnessToleranceMinutes || 120)),
      dataQualityMinimum:
        Math.max(0,Math.min(1,Number(input.dataQualityMinimum ?? 0.8))),
      environment:String(input.environment || "production"),
      region:input.region || null,
      status:String(input.status || "active"),
      healthStatus:String(input.healthStatus || "unknown"),
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.observationSourceModel=
    Object.freeze({create});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-04-Observation-Source-Connector-Registry/src/model/observation-connector.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.connectorType){
      return runtime.failure(
        "OM_OBSERVATION_CONNECTOR_INVALID",
        "Connector name and connectorType are required."
      );
    }

    return runtime.success({
      observationConnectorId:
        input.observationConnectorId ||
        runtime.createId("om_observation_connector"),
      name:String(input.name),
      connectorType:String(input.connectorType),
      endpointReference:input.endpointReference || null,
      credentialReference:input.credentialReference || null,
      capabilities:runtime.clone(input.capabilities || []),
      supportedSourceTypes:runtime.clone(input.supportedSourceTypes || []),
      supportedValueTypes:runtime.clone(input.supportedValueTypes || []),
      maximumBatchSize:
        Math.max(1,Number(input.maximumBatchSize || 1000)),
      timeoutMilliseconds:
        Math.max(1000,Number(input.timeoutMilliseconds || 30000)),
      environment:String(input.environment || "production"),
      region:input.region || null,
      status:String(input.status || "active"),
      healthStatus:String(input.healthStatus || "unknown"),
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.observationConnectorModel=
    Object.freeze({create});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-04-Observation-Source-Connector-Registry/src/validation/source-binding-validator.js --- */
(function(global){
  "use strict";

  function validate({metric,source,connector}){
    const issues=[];

    if(!metric?.metricId){
      issues.push("Metric ID is required.");
    }

    if(source.status!=="active"){
      issues.push("Observation source is inactive.");
    }

    if(source.observedStateOnly!==true){
      issues.push("Observation source must provide observed-state evidence.");
    }

    if(!["healthy","degraded"].includes(source.healthStatus)){
      issues.push("Observation source is not healthy.");
    }

    if(connector.status!=="active"){
      issues.push("Observation connector is inactive.");
    }

    if(!["healthy","degraded"].includes(connector.healthStatus)){
      issues.push("Observation connector is not healthy.");
    }

    if(
      connector.supportedSourceTypes.length &&
      !connector.supportedSourceTypes.includes(source.sourceType)
    ){
      issues.push("Connector does not support the source type.");
    }

    if(
      connector.supportedValueTypes.length &&
      !connector.supportedValueTypes.includes(metric.valueType)
    ){
      issues.push("Connector does not support the metric value type.");
    }

    if(
      connector.environment !== source.environment
    ){
      issues.push("Source and connector environments do not match.");
    }

    if(
      connector.region &&
      source.region &&
      connector.region !== source.region
    ){
      issues.push("Source and connector regions do not match.");
    }

    return {valid:issues.length===0,issues};
  }

  global.INFINICUS.OM.sourceBindingValidator=
    Object.freeze({validate});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-04-Observation-Source-Connector-Registry/src/storage/source-registry-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_SOURCE_CONNECTOR_REGISTRY";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;

        for(const [name,keyPath] of [
          ["sources","observationSourceId"],
          ["connectors","observationConnectorId"],
          ["bindings","observationSourceBindingId"],
          ["collection_handoffs","observationCollectionHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
          }
        }
      };

      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "OM_SOURCE_REGISTRY_STORAGE_ERROR",
        error?.message || "Source registry storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_SOURCE_REGISTRY_RECORD_NOT_FOUND",
            "Source registry record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_SOURCE_REGISTRY_STORAGE_ERROR",
        error?.message || "Source registry retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "OM_SOURCE_REGISTRY_STORAGE_ERROR",
        error?.message || "Source registry listing failed."
      );
    }
  }

  global.INFINICUS.OM.observationSourceRegistryStore=
    Object.freeze({open,put,get,list});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-04-Observation-Source-Connector-Registry/src/engine/observation-source-connector-registry-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerSource(input={}){
    const built=
      global.INFINICUS.OM.observationSourceModel.create(input);

    if(!built.ok) return built;

    const stored=
      await global.INFINICUS.OM.observationSourceRegistryStore.put(
        "sources",
        built.data
      );

    if(stored.ok){
      runtime.registerObservationSource(runtime.clone(built.data));
    }

    return stored;
  }

  async function registerConnector(input={}){
    const built=
      global.INFINICUS.OM.observationConnectorModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.observationSourceRegistryStore.put(
      "connectors",
      built.data
    );
  }

  async function bindFromHandoff({
    observationSourceHandoffId,
    sourceMappings=[]
  }={}){
    const handoff=
      await global.INFINICUS.OM.metricKPIRegistryEngine
        .getObservationSourceHandoff({
          observationSourceHandoffId
        });

    if(!handoff.ok) return handoff;

    const bindings=[];

    for(const metric of handoff.data.metrics){
      const mapping=
        sourceMappings.find(item=>item.metricId===metric.metricId);

      if(!mapping){
        return runtime.failure(
          "OM_SOURCE_MAPPING_REQUIRED",
          `Source mapping is required for metric: ${metric.metricId}`
        );
      }

      const source=
        await global.INFINICUS.OM.observationSourceRegistryStore.get(
          "sources",
          mapping.observationSourceId
        );

      if(!source.ok) return source;

      const connector=
        await global.INFINICUS.OM.observationSourceRegistryStore.get(
          "connectors",
          mapping.observationConnectorId
        );

      if(!connector.ok) return connector;

      const validation=
        global.INFINICUS.OM.sourceBindingValidator.validate({
          metric,
          source:source.data,
          connector:connector.data
        });

      if(!validation.valid){
        return runtime.failure(
          "OM_SOURCE_BINDING_INVALID",
          "Metric source binding failed validation.",
          {
            metricId:metric.metricId,
            validation
          }
        );
      }

      const binding={
        observationSourceBindingId:
          runtime.createId("om_observation_source_binding"),
        monitoringContractId:
          handoff.data.monitoringContractId,
        metricId:metric.metricId,
        observationSourceId:source.data.observationSourceId,
        observationConnectorId:
          connector.data.observationConnectorId,
        sourceField:
          mapping.sourceField || metric.sourceField || null,
        valueType:metric.valueType,
        unit:metric.unit,
        aggregation:metric.aggregation,
        refreshCadenceMinutes:
          source.data.refreshCadenceMinutes,
        freshnessToleranceMinutes:
          source.data.freshnessToleranceMinutes,
        dataQualityMinimum:
          source.data.dataQualityMinimum,
        correlationId:handoff.data.correlationId,
        status:"active",
        createdAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.observationSourceRegistryStore.put(
        "bindings",
        binding
      );

      bindings.push(binding);
    }

    const collectionHandoff={
      observationCollectionHandoffId:
        runtime.createId("om_observation_collection_handoff"),
      targetBlock:"OM-05",
      monitoringContractId:
        handoff.data.monitoringContractId,
      metrics:handoff.data.metrics.map(runtime.clone),
      sourceBindings:bindings.map(runtime.clone),
      correlationId:handoff.data.correlationId,
      lineage:handoff.data.lineage.map(runtime.clone),
      confidence:handoff.data.confidence,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.observationSourceRegistryStore.put(
      "collection_handoffs",
      collectionHandoff
    );

    await runtime.emit(
      "om.observation_sources.bound",
      {
        bindingCount:bindings.length,
        observationCollectionHandoffId:
          collectionHandoff.observationCollectionHandoffId
      }
    );

    return runtime.success({
      bindings,
      observationCollectionHandoff:collectionHandoff
    });
  }

  async function updateHealth({
    recordType,
    recordId,
    healthStatus
  }={}){
    const storeName=
      recordType==="connector" ? "connectors" : "sources";

    const record=
      await global.INFINICUS.OM.observationSourceRegistryStore.get(
        storeName,
        recordId
      );

    if(!record.ok) return record;

    const updated={
      ...record.data,
      healthStatus:String(healthStatus || "unknown"),
      updatedAt:new Date().toISOString()
    };

    return global.INFINICUS.OM.observationSourceRegistryStore.put(
      storeName,
      updated
    );
  }

  const api=Object.freeze({
    registerSource,
    registerConnector,
    bindFromHandoff,
    updateHealth,
    getSource:({observationSourceId}) =>
      global.INFINICUS.OM.observationSourceRegistryStore.get(
        "sources",
        observationSourceId
      ),
    getConnector:({observationConnectorId}) =>
      global.INFINICUS.OM.observationSourceRegistryStore.get(
        "connectors",
        observationConnectorId
      ),
    getObservationCollectionHandoff:({
      observationCollectionHandoffId
    }) =>
      global.INFINICUS.OM.observationSourceRegistryStore.get(
        "collection_handoffs",
        observationCollectionHandoffId
      ),
    listBindings:() =>
      global.INFINICUS.OM.observationSourceRegistryStore.list(
        "bindings"
      )
  });

  runtime.registerService(
    "om.observation_source_connector_registry",
    api,
    {block:"OM-04"}
  );

  runtime.registerRoute(
    "om.observation_source.register",
    registerSource
  );

  runtime.registerRoute(
    "om.observation_connector.register",
    registerConnector
  );

  runtime.registerRoute(
    "om.observation_sources.bind_from_handoff",
    bindFromHandoff
  );

  runtime.registerRoute(
    "om.observation_source_health.update",
    updateHealth
  );

  global.INFINICUS.OM.observationSourceConnectorRegistryEngine=api;
})(window);

/* ===== INFINICUS-OM-05-Observation-Collection-Engine ===== */

/* --- outcome-monitoring/INFINICUS-OM-05-Observation-Collection-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-05.");
  }

  if(!OM?.observationSourceConnectorRegistryEngine){
    throw new Error("OM-04 must be loaded before OM-05.");
  }
})(window);

/* --- outcome-monitoring/INFINICUS-OM-05-Observation-Collection-Engine/src/model/collection-policy.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_COLLECTION_POLICY_INVALID",
        "Collection policy name and code are required."
      );
    }

    return runtime.success({
      observationCollectionPolicyId:
        input.observationCollectionPolicyId ||
        runtime.createId("om_collection_policy"),
      name:String(input.name),
      code:String(input.code),
      requireObservedClassification:
        input.requireObservedClassification !== false,
      rejectStaleObservations:
        input.rejectStaleObservations !== false,
      requireSourceTimestamp:
        input.requireSourceTimestamp !== false,
      preserveRawEvidence:
        input.preserveRawEvidence !== false,
      maximumAttempts:
        Math.max(1,Number(input.maximumAttempts || 3)),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.observationCollectionPolicyModel=
    Object.freeze({create});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-05-Observation-Collection-Engine/src/validation/observation-validator.js --- */
(function(global){
  "use strict";

  function validate({
    observation,
    binding,
    policy,
    collectedAt
  }){
    const issues=[];

    if(policy.status!=="active"){
      issues.push("Collection policy is inactive.");
    }

    if(observation.value===undefined){
      issues.push("Observation value is required.");
    }

    if(
      policy.requireObservedClassification &&
      observation.classification!=="observed"
    ){
      issues.push("Observation classification must be observed.");
    }

    if(
      policy.requireSourceTimestamp &&
      !observation.sourceTimestamp
    ){
      issues.push("Source timestamp is required.");
    }

    if(
      observation.sourceTimestamp &&
      policy.rejectStaleObservations
    ){
      const ageMinutes=
        (
          new Date(collectedAt).getTime() -
          new Date(observation.sourceTimestamp).getTime()
        ) / 60000;

      if(ageMinutes > binding.freshnessToleranceMinutes){
        issues.push("Observation is stale.");
      }
    }

    if(
      observation.metricId !== binding.metricId
    ){
      issues.push("Observation metric does not match source binding.");
    }

    if(
      observation.observationSourceId !==
      binding.observationSourceId
    ){
      issues.push("Observation source does not match source binding.");
    }

    return {valid:issues.length===0,issues};
  }

  global.INFINICUS.OM.observationValidator=
    Object.freeze({validate});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-05-Observation-Collection-Engine/src/storage/collection-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_OBSERVATION_COLLECTION";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;

        for(const [name,keyPath] of [
          ["policies","observationCollectionPolicyId"],
          ["runs","observationCollectionRunId"],
          ["observations","observationId"],
          ["dead_letters","observationCollectionDeadLetterId"],
          ["quality_handoffs","observationQualityHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});

            if(name==="observations"){
              store.createIndex(
                "idempotencyKey",
                "idempotencyKey",
                {unique:true}
              );
            }
          }
        }
      };

      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "OM_COLLECTION_STORAGE_ERROR",
        error?.message || "Observation collection storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_COLLECTION_RECORD_NOT_FOUND",
            "Observation collection record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_COLLECTION_STORAGE_ERROR",
        error?.message || "Observation collection retrieval failed."
      );
    }
  }

  async function getByIdempotencyKey(idempotencyKey){
    try{
      const db=await open();
      const tx=db.transaction("observations","readonly");
      const value=await reqp(
        tx.objectStore("observations")
          .index("idempotencyKey")
          .get(idempotencyKey)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_OBSERVATION_NOT_FOUND",
            "Observation was not previously collected."
          );
    }catch(error){
      return runtime.failure(
        "OM_COLLECTION_STORAGE_ERROR",
        error?.message || "Observation collection retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "OM_COLLECTION_STORAGE_ERROR",
        error?.message || "Observation collection listing failed."
      );
    }
  }

  global.INFINICUS.OM.observationCollectionStore=
    Object.freeze({
      open,
      put,
      get,
      getByIdempotencyKey,
      list
    });
})(window);

/* --- outcome-monitoring/INFINICUS-OM-05-Observation-Collection-Engine/src/engine/observation-collection-engine.js --- */
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

/* ===== INFINICUS-OM-06-Data-Quality-Evidence-Validation-Engine ===== */

/* --- outcome-monitoring/INFINICUS-OM-06-Data-Quality-Evidence-Validation-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-06.");
  }

  if(!OM?.observationCollectionEngine){
    throw new Error("OM-05 must be loaded before OM-06.");
  }
})(window);

/* --- outcome-monitoring/INFINICUS-OM-06-Data-Quality-Evidence-Validation-Engine/src/model/quality-policy.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_QUALITY_POLICY_INVALID",
        "Quality policy name and code are required."
      );
    }

    return runtime.success({
      observationQualityPolicyId:
        input.observationQualityPolicyId ||
        runtime.createId("om_quality_policy"),
      name:String(input.name),
      code:String(input.code),
      minimumQualityScore:
        Math.max(0,Math.min(1,Number(input.minimumQualityScore ?? 0.75))),
      minimumReliabilityScore:
        Math.max(0,Math.min(1,Number(input.minimumReliabilityScore ?? 0.7))),
      requireRawEvidence:input.requireRawEvidence !== false,
      requireObservedClassification:
        input.requireObservedClassification !== false,
      rejectFutureTimestamps:
        input.rejectFutureTimestamps !== false,
      rejectDuplicateEvidence:
        input.rejectDuplicateEvidence !== false,
      maximumClockSkewMinutes:
        Math.max(0,Number(input.maximumClockSkewMinutes || 5)),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.observationQualityPolicyModel=
    Object.freeze({create});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-06-Data-Quality-Evidence-Validation-Engine/src/validation/evidence-validator.js --- */
(function(global){
  "use strict";

  function scoreObservation(observation,policy){
    const issues=[];
    let completeness=1;
    let freshness=1;
    let consistency=1;
    let evidence=1;
    let reliability=1;

    if(observation.value===undefined){
      issues.push("Observation value is missing.");
      completeness=0;
    }

    if(!observation.metricId){
      issues.push("Metric ID is missing.");
      completeness-=0.25;
    }

    if(!observation.observationSourceId){
      issues.push("Observation source ID is missing.");
      completeness-=0.25;
    }

    if(!observation.sourceTimestamp){
      issues.push("Source timestamp is missing.");
      completeness-=0.25;
      freshness=0;
    }

    if(
      policy.requireObservedClassification &&
      observation.classification!=="observed"
    ){
      issues.push("Observation classification is not observed.");
      consistency=0;
    }

    if(
      policy.requireRawEvidence &&
      observation.rawEvidence==null
    ){
      issues.push("Raw evidence is missing.");
      evidence=0;
    }

    if(observation.sourceTimestamp){
      const sourceTime=new Date(observation.sourceTimestamp).getTime();
      const collectedTime=new Date(observation.collectedAt).getTime();
      const skewMinutes=(sourceTime-collectedTime)/60000;

      if(
        policy.rejectFutureTimestamps &&
        skewMinutes > policy.maximumClockSkewMinutes
      ){
        issues.push("Source timestamp is unacceptably in the future.");
        freshness=0;
      }
    }

    if(!Array.isArray(observation.lineage) || !observation.lineage.length){
      issues.push("Observation lineage is missing.");
      reliability-=0.4;
    }

    if(Number(observation.confidence ?? 0)<0.5){
      issues.push("Observation confidence is low.");
      reliability-=0.3;
    }

    completeness=Math.max(0,Math.min(1,completeness));
    reliability=Math.max(0,Math.min(1,reliability));

    const qualityScore=
      (
        completeness * 0.25 +
        freshness * 0.20 +
        consistency * 0.20 +
        evidence * 0.20 +
        reliability * 0.15
      );

    return {
      valid:
        issues.length===0 &&
        qualityScore>=policy.minimumQualityScore &&
        reliability>=policy.minimumReliabilityScore,
      qualityScore:Number(qualityScore.toFixed(4)),
      reliabilityScore:Number(reliability.toFixed(4)),
      components:{
        completeness,
        freshness,
        consistency,
        evidence,
        reliability
      },
      issues
    };
  }

  global.INFINICUS.OM.observationEvidenceValidator=
    Object.freeze({scoreObservation});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-06-Data-Quality-Evidence-Validation-Engine/src/storage/quality-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_DATA_QUALITY";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;

        for(const [name,keyPath] of [
          ["policies","observationQualityPolicyId"],
          ["validations","observationValidationId"],
          ["accepted","validatedObservationId"],
          ["rejected","rejectedObservationId"],
          ["issues","observationQualityIssueId"],
          ["baseline_handoffs","baselineTargetHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
          }
        }
      };

      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "OM_QUALITY_STORAGE_ERROR",
        error?.message || "Quality storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_QUALITY_RECORD_NOT_FOUND",
            "Quality record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_QUALITY_STORAGE_ERROR",
        error?.message || "Quality retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "OM_QUALITY_STORAGE_ERROR",
        error?.message || "Quality listing failed."
      );
    }
  }

  global.INFINICUS.OM.dataQualityEvidenceStore=
    Object.freeze({open,put,get,list});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-06-Data-Quality-Evidence-Validation-Engine/src/engine/data-quality-evidence-validation-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.observationQualityPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.dataQualityEvidenceStore.put(
      "policies",
      built.data
    );
  }

  async function validateObservations({
    observationQualityHandoffId,
    observationQualityPolicyId
  }={}){
    const handoff=
      await global.INFINICUS.OM.observationCollectionEngine
        .getObservationQualityHandoff({
          observationQualityHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.dataQualityEvidenceStore.get(
        "policies",
        observationQualityPolicyId
      );

    if(!policy.ok) return policy;

    const accepted=[];
    const rejected=[];
    const issues=[];

    for(const observation of handoff.data.observations){
      const validation=
        global.INFINICUS.OM.observationEvidenceValidator
          .scoreObservation(observation,policy.data);

      const record={
        observationValidationId:
          runtime.createId("om_observation_validation"),
        observationId:observation.observationId,
        monitoringContractId:
          handoff.data.monitoringContractId,
        qualityScore:validation.qualityScore,
        reliabilityScore:validation.reliabilityScore,
        components:runtime.clone(validation.components),
        issues:runtime.clone(validation.issues),
        valid:validation.valid,
        correlationId:handoff.data.correlationId,
        validatedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.dataQualityEvidenceStore.put(
        "validations",
        record
      );

      for(const issue of validation.issues){
        const issueRecord={
          observationQualityIssueId:
            runtime.createId("om_quality_issue"),
          observationId:observation.observationId,
          issue,
          correlationId:handoff.data.correlationId,
          createdAt:new Date().toISOString()
        };

        await global.INFINICUS.OM.dataQualityEvidenceStore.put(
          "issues",
          issueRecord
        );

        issues.push(issueRecord);
      }

      if(validation.valid){
        const validatedObservation={
          validatedObservationId:
            runtime.createId("om_validated_observation"),
          observation:runtime.clone(observation),
          validation:runtime.clone(record),
          adjustedConfidence:
            Number(
              (
                Number(observation.confidence ?? 0) *
                validation.qualityScore *
                validation.reliabilityScore
              ).toFixed(4)
            ),
          status:"accepted",
          createdAt:new Date().toISOString()
        };

        await global.INFINICUS.OM.dataQualityEvidenceStore.put(
          "accepted",
          validatedObservation
        );

        accepted.push(validatedObservation);
      }else{
        const rejectedObservation={
          rejectedObservationId:
            runtime.createId("om_rejected_observation"),
          observation:runtime.clone(observation),
          validation:runtime.clone(record),
          status:"rejected",
          createdAt:new Date().toISOString()
        };

        await global.INFINICUS.OM.dataQualityEvidenceStore.put(
          "rejected",
          rejectedObservation
        );

        rejected.push(rejectedObservation);
      }
    }

    const baselineHandoff={
      baselineTargetHandoffId:
        runtime.createId("om_baseline_target_handoff"),
      targetBlock:"OM-07",
      monitoringContractId:
        handoff.data.monitoringContractId,
      observationCollectionRunId:
        handoff.data.observationCollectionRunId,
      acceptedObservations:accepted.map(runtime.clone),
      rejectedObservations:rejected.map(runtime.clone),
      qualityIssues:issues.map(runtime.clone),
      correlationId:handoff.data.correlationId,
      lineage:handoff.data.lineage.map(runtime.clone),
      confidence:
        accepted.length
          ? Number(
              (
                accepted.reduce(
                  (sum,item)=>sum+item.adjustedConfidence,
                  0
                ) / accepted.length
              ).toFixed(4)
            )
          : 0,
      status:accepted.length ? "ready" : "blocked",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.dataQualityEvidenceStore.put(
      "baseline_handoffs",
      baselineHandoff
    );

    await runtime.emit(
      "om.observation_quality.validated",
      {
        acceptedCount:accepted.length,
        rejectedCount:rejected.length,
        baselineTargetHandoffId:
          baselineHandoff.baselineTargetHandoffId
      }
    );

    return runtime.success({
      acceptedObservations:accepted,
      rejectedObservations:rejected,
      qualityIssues:issues,
      baselineTargetHandoff:baselineHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    validateObservations,
    getBaselineTargetHandoff:({
      baselineTargetHandoffId
    }) =>
      global.INFINICUS.OM.dataQualityEvidenceStore.get(
        "baseline_handoffs",
        baselineTargetHandoffId
      ),
    listAcceptedObservations:() =>
      global.INFINICUS.OM.dataQualityEvidenceStore.list("accepted"),
    listRejectedObservations:() =>
      global.INFINICUS.OM.dataQualityEvidenceStore.list("rejected")
  });

  runtime.registerService(
    "om.data_quality_evidence_validation",
    api,
    {block:"OM-06"}
  );

  runtime.registerRoute(
    "om.observation_quality_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.observations.validate_quality",
    validateObservations
  );

  global.INFINICUS.OM.dataQualityEvidenceValidationEngine=api;
})(window);

/* ===== INFINICUS-OM-07-Baseline-Target-Registry ===== */

/* --- outcome-monitoring/INFINICUS-OM-07-Baseline-Target-Registry/src/core/runtime-guard.js --- */
(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-07.");
  }

  if(!OM?.dataQualityEvidenceValidationEngine){
    throw new Error("OM-06 must be loaded before OM-07.");
  }

  if(!OM?.metricKPIRegistryEngine){
    throw new Error("OM-03 must be loaded before OM-07.");
  }
})(window);

/* --- outcome-monitoring/INFINICUS-OM-07-Baseline-Target-Registry/src/model/baseline-definition.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.metricId || input.value===undefined){
      return runtime.failure(
        "OM_BASELINE_INVALID",
        "Metric ID and baseline value are required."
      );
    }

    return runtime.success({
      baselineDefinitionId:
        input.baselineDefinitionId ||
        runtime.createId("om_baseline"),
      metricId:String(input.metricId),
      monitoringContractId:
        input.monitoringContractId || null,
      expectedOutcomeDefinitionId:
        input.expectedOutcomeDefinitionId || null,
      value:runtime.clone(input.value),
      unit:input.unit || null,
      effectiveFrom:
        input.effectiveFrom || new Date().toISOString(),
      effectiveTo:input.effectiveTo || null,
      provenanceType:String(input.provenanceType || "contract"),
      provenanceReference:
        input.provenanceReference || null,
      confidence:
        Math.max(0,Math.min(1,Number(input.confidence ?? 0.7))),
      lineage:runtime.clone(input.lineage || []),
      version:1,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.baselineDefinitionModel=
    Object.freeze({create});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-07-Baseline-Target-Registry/src/model/target-definition.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.metricId || input.targetValue===undefined){
      return runtime.failure(
        "OM_TARGET_INVALID",
        "Metric ID and target value are required."
      );
    }

    return runtime.success({
      targetDefinitionId:
        input.targetDefinitionId ||
        runtime.createId("om_target"),
      metricId:String(input.metricId),
      monitoringContractId:
        input.monitoringContractId || null,
      expectedOutcomeDefinitionId:
        input.expectedOutcomeDefinitionId || null,
      targetValue:runtime.clone(input.targetValue),
      minimumAcceptableValue:
        runtime.clone(input.minimumAcceptableValue),
      maximumAcceptableValue:
        runtime.clone(input.maximumAcceptableValue),
      tolerance:
        input.tolerance == null ? null : Number(input.tolerance),
      direction:String(input.direction || "increase"),
      unit:input.unit || null,
      effectiveFrom:
        input.effectiveFrom || new Date().toISOString(),
      effectiveTo:input.effectiveTo || null,
      provenanceType:String(input.provenanceType || "contract"),
      provenanceReference:
        input.provenanceReference || null,
      confidence:
        Math.max(0,Math.min(1,Number(input.confidence ?? 0.7))),
      lineage:runtime.clone(input.lineage || []),
      version:1,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.targetDefinitionModel=
    Object.freeze({create});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-07-Baseline-Target-Registry/src/validation/baseline-target-validator.js --- */
(function(global){
  "use strict";

  function validateBaseline(baseline){
    const issues=[];

    if(!baseline.metricId) issues.push("Metric ID is required.");
    if(baseline.value===undefined) issues.push("Baseline value is required.");

    if(
      baseline.effectiveTo &&
      new Date(baseline.effectiveTo).getTime() <=
      new Date(baseline.effectiveFrom).getTime()
    ){
      issues.push("Baseline effective period is invalid.");
    }

    if(!Array.isArray(baseline.lineage) || !baseline.lineage.length){
      issues.push("Baseline lineage is required.");
    }

    return {valid:issues.length===0,issues};
  }

  function validateTarget(target){
    const issues=[];

    if(!target.metricId) issues.push("Metric ID is required.");
    if(target.targetValue===undefined) issues.push("Target value is required.");

    if(
      target.effectiveTo &&
      new Date(target.effectiveTo).getTime() <=
      new Date(target.effectiveFrom).getTime()
    ){
      issues.push("Target effective period is invalid.");
    }

    if(
      target.minimumAcceptableValue!==undefined &&
      target.maximumAcceptableValue!==undefined &&
      Number(target.minimumAcceptableValue) >
      Number(target.maximumAcceptableValue)
    ){
      issues.push("Minimum acceptable value exceeds maximum acceptable value.");
    }

    if(
      !["increase","decrease","maintain","range"].includes(target.direction)
    ){
      issues.push("Target direction is invalid.");
    }

    if(!Array.isArray(target.lineage) || !target.lineage.length){
      issues.push("Target lineage is required.");
    }

    return {valid:issues.length===0,issues};
  }

  global.INFINICUS.OM.baselineTargetValidator=
    Object.freeze({
      validateBaseline,
      validateTarget
    });
})(window);

/* --- outcome-monitoring/INFINICUS-OM-07-Baseline-Target-Registry/src/storage/baseline-target-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_BASELINE_TARGET";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;

        for(const [name,keyPath] of [
          ["baselines","baselineDefinitionId"],
          ["targets","targetDefinitionId"],
          ["versions","baselineTargetVersionId"],
          ["conflicts","baselineTargetConflictId"],
          ["schedule_handoffs","monitoringScheduleHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
          }
        }
      };

      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "OM_BASELINE_TARGET_STORAGE_ERROR",
        error?.message || "Baseline-target storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_BASELINE_TARGET_RECORD_NOT_FOUND",
            "Baseline-target record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_BASELINE_TARGET_STORAGE_ERROR",
        error?.message || "Baseline-target retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "OM_BASELINE_TARGET_STORAGE_ERROR",
        error?.message || "Baseline-target listing failed."
      );
    }
  }

  global.INFINICUS.OM.baselineTargetStore=
    Object.freeze({open,put,get,list});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-07-Baseline-Target-Registry/src/engine/baseline-target-registry-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerFromHandoff({
    baselineTargetHandoffId
  }={}){
    const handoff=
      await global.INFINICUS.OM.dataQualityEvidenceValidationEngine
        .getBaselineTargetHandoff({
          baselineTargetHandoffId
        });

    if(!handoff.ok) return handoff;

    const baselines=[];
    const targets=[];
    const metricIds=[
      ...new Set(
        handoff.data.acceptedObservations.map(
          item=>item.observation.metricId
        )
      )
    ];

    for(const metricId of metricIds){
      const metric=
        await global.INFINICUS.OM.metricKPIRegistryEngine
          .getMetric({metricId});

      if(!metric.ok) return metric;

      const baselineBuilt=
        global.INFINICUS.OM.baselineDefinitionModel.create({
          metricId,
          monitoringContractId:
            metric.data.monitoringContractId,
          expectedOutcomeDefinitionId:
            metric.data.expectedOutcomeDefinitionId,
          value:metric.data.baselineValue,
          unit:metric.data.unit,
          effectiveFrom:
            metric.data.observationWindow?.startsAt,
          effectiveTo:
            metric.data.observationWindow?.endsAt,
          provenanceType:"monitoring_contract",
          provenanceReference:
            metric.data.monitoringContractId,
          confidence:
            Math.min(
              metric.data.confidence,
              handoff.data.confidence
            ),
          lineage:[
            ...metric.data.lineage.map(runtime.clone),
            ...handoff.data.lineage.map(runtime.clone)
          ]
        });

      if(!baselineBuilt.ok) return baselineBuilt;

      const baselineValidation=
        global.INFINICUS.OM.baselineTargetValidator
          .validateBaseline(baselineBuilt.data);

      if(!baselineValidation.valid){
        return runtime.failure(
          "OM_BASELINE_INVALID",
          "Baseline failed validation.",
          baselineValidation
        );
      }

      const targetBuilt=
        global.INFINICUS.OM.targetDefinitionModel.create({
          metricId,
          monitoringContractId:
            metric.data.monitoringContractId,
          expectedOutcomeDefinitionId:
            metric.data.expectedOutcomeDefinitionId,
          targetValue:metric.data.targetValue,
          minimumAcceptableValue:
            metric.data.minimumAcceptableValue,
          maximumAcceptableValue:
            metric.data.maximumAcceptableValue,
          tolerance:metric.data.tolerance,
          direction:metric.data.direction,
          unit:metric.data.unit,
          effectiveFrom:
            metric.data.observationWindow?.startsAt,
          effectiveTo:
            metric.data.observationWindow?.endsAt,
          provenanceType:"monitoring_contract",
          provenanceReference:
            metric.data.monitoringContractId,
          confidence:
            Math.min(
              metric.data.confidence,
              handoff.data.confidence
            ),
          lineage:[
            ...metric.data.lineage.map(runtime.clone),
            ...handoff.data.lineage.map(runtime.clone)
          ]
        });

      if(!targetBuilt.ok) return targetBuilt;

      const targetValidation=
        global.INFINICUS.OM.baselineTargetValidator
          .validateTarget(targetBuilt.data);

      if(!targetValidation.valid){
        return runtime.failure(
          "OM_TARGET_INVALID",
          "Target failed validation.",
          targetValidation
        );
      }

      await global.INFINICUS.OM.baselineTargetStore.put(
        "baselines",
        baselineBuilt.data
      );

      await global.INFINICUS.OM.baselineTargetStore.put(
        "targets",
        targetBuilt.data
      );

      await global.INFINICUS.OM.baselineTargetStore.put(
        "versions",
        {
          baselineTargetVersionId:
            runtime.createId("om_baseline_target_version"),
          metricId,
          baselineSnapshot:
            runtime.clone(baselineBuilt.data),
          targetSnapshot:
            runtime.clone(targetBuilt.data),
          version:1,
          createdAt:new Date().toISOString()
        }
      );

      baselines.push(baselineBuilt.data);
      targets.push(targetBuilt.data);
    }

    const scheduleHandoff={
      monitoringScheduleHandoffId:
        runtime.createId("om_monitoring_schedule_handoff"),
      targetBlock:"OM-08",
      monitoringContractId:
        handoff.data.monitoringContractId,
      baselines:baselines.map(runtime.clone),
      targets:targets.map(runtime.clone),
      acceptedObservations:
        handoff.data.acceptedObservations.map(runtime.clone),
      correlationId:handoff.data.correlationId,
      lineage:handoff.data.lineage.map(runtime.clone),
      confidence:handoff.data.confidence,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.baselineTargetStore.put(
      "schedule_handoffs",
      scheduleHandoff
    );

    await runtime.emit(
      "om.baselines_targets.registered",
      {
        baselineCount:baselines.length,
        targetCount:targets.length,
        monitoringScheduleHandoffId:
          scheduleHandoff.monitoringScheduleHandoffId
      }
    );

    return runtime.success({
      baselines,
      targets,
      monitoringScheduleHandoff:scheduleHandoff
    });
  }

  const api=Object.freeze({
    registerFromHandoff,
    getBaseline:({baselineDefinitionId}) =>
      global.INFINICUS.OM.baselineTargetStore.get(
        "baselines",
        baselineDefinitionId
      ),
    getTarget:({targetDefinitionId}) =>
      global.INFINICUS.OM.baselineTargetStore.get(
        "targets",
        targetDefinitionId
      ),
    getMonitoringScheduleHandoff:({
      monitoringScheduleHandoffId
    }) =>
      global.INFINICUS.OM.baselineTargetStore.get(
        "schedule_handoffs",
        monitoringScheduleHandoffId
      ),
    listBaselines:() =>
      global.INFINICUS.OM.baselineTargetStore.list("baselines"),
    listTargets:() =>
      global.INFINICUS.OM.baselineTargetStore.list("targets")
  });

  runtime.registerService(
    "om.baseline_target_registry",
    api,
    {block:"OM-07"}
  );

  runtime.registerRoute(
    "om.baselines_targets.register_from_handoff",
    registerFromHandoff
  );

  global.INFINICUS.OM.baselineTargetRegistryEngine=api;
})(window);

/* ===== INFINICUS-OM-08-Observation-Window-Monitoring-Schedule-Engine ===== */

/* --- outcome-monitoring/INFINICUS-OM-08-Observation-Window-Monitoring-Schedule-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;
  if(!OM?.runtime) throw new Error("OM-01 must be loaded before OM-08.");
  if(!OM?.baselineTargetRegistryEngine){
    throw new Error("OM-07 must be loaded before OM-08.");
  }
})(window);

/* --- outcome-monitoring/INFINICUS-OM-08-Observation-Window-Monitoring-Schedule-Engine/src/model/schedule-policy.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_SCHEDULE_POLICY_INVALID",
        "Schedule policy name and code are required."
      );
    }

    return runtime.success({
      monitoringSchedulePolicyId:
        input.monitoringSchedulePolicyId ||
        runtime.createId("om_schedule_policy"),
      name:String(input.name),
      code:String(input.code),
      minimumCadenceMinutes:
        Math.max(1,Number(input.minimumCadenceMinutes || 15)),
      maximumCadenceMinutes:
        Math.max(1,Number(input.maximumCadenceMinutes || 43200)),
      defaultGraceMinutes:
        Math.max(0,Number(input.defaultGraceMinutes || 60)),
      allowLateObservation:
        input.allowLateObservation !== false,
      allowPause:
        input.allowPause !== false,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.monitoringSchedulePolicyModel=
    Object.freeze({create});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-08-Observation-Window-Monitoring-Schedule-Engine/src/validation/schedule-validator.js --- */
(function(global){
  "use strict";

  function validateDefinition({baseline,target,policy}){
    const issues=[];
    const startsAt=target.effectiveFrom || baseline.effectiveFrom;
    const endsAt=target.effectiveTo || baseline.effectiveTo;
    const cadence=Number(target.reviewCadenceMinutes || 1440);

    if(!startsAt) issues.push("Monitoring start is required.");
    if(!endsAt) issues.push("Monitoring end is required.");

    if(
      startsAt &&
      endsAt &&
      new Date(endsAt).getTime() <= new Date(startsAt).getTime()
    ){
      issues.push("Monitoring end must be after start.");
    }

    if(
      cadence < policy.minimumCadenceMinutes ||
      cadence > policy.maximumCadenceMinutes
    ){
      issues.push("Monitoring cadence is outside policy limits.");
    }

    return {
      valid:issues.length===0,
      issues,
      startsAt,
      endsAt,
      cadence
    };
  }

  global.INFINICUS.OM.monitoringScheduleValidator=
    Object.freeze({validateDefinition});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-08-Observation-Window-Monitoring-Schedule-Engine/src/storage/schedule-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_MONITORING_SCHEDULE";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;

        for(const [name,keyPath] of [
          ["policies","monitoringSchedulePolicyId"],
          ["schedules","monitoringScheduleId"],
          ["checkpoints","monitoringCheckpointId"],
          ["events","monitoringScheduleEventId"],
          ["normalization_handoffs","normalizationHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
          }
        }
      };

      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "OM_SCHEDULE_STORAGE_ERROR",
        error?.message || "Schedule storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_SCHEDULE_RECORD_NOT_FOUND",
            "Schedule record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_SCHEDULE_STORAGE_ERROR",
        error?.message || "Schedule retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "OM_SCHEDULE_STORAGE_ERROR",
        error?.message || "Schedule listing failed."
      );
    }
  }

  global.INFINICUS.OM.monitoringScheduleStore=
    Object.freeze({open,put,get,list});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-08-Observation-Window-Monitoring-Schedule-Engine/src/engine/observation-window-schedule-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.monitoringSchedulePolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.monitoringScheduleStore.put(
      "policies",
      built.data
    );
  }

  function generateCheckpoints({
    monitoringScheduleId,
    metricId,
    startsAt,
    endsAt,
    cadenceMinutes,
    graceMinutes
  }){
    const checkpoints=[];
    let cursor=new Date(startsAt).getTime();
    const end=new Date(endsAt).getTime();
    const step=cadenceMinutes*60000;

    while(cursor<=end){
      checkpoints.push({
        monitoringCheckpointId:
          runtime.createId("om_monitoring_checkpoint"),
        monitoringScheduleId,
        metricId,
        scheduledAt:new Date(cursor).toISOString(),
        graceEndsAt:
          new Date(cursor+graceMinutes*60000).toISOString(),
        state:"pending",
        createdAt:new Date().toISOString()
      });

      cursor+=step;
    }

    return checkpoints;
  }

  async function createSchedules({
    monitoringScheduleHandoffId,
    monitoringSchedulePolicyId
  }={}){
    const handoff=
      await global.INFINICUS.OM.baselineTargetRegistryEngine
        .getMonitoringScheduleHandoff({
          monitoringScheduleHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.monitoringScheduleStore.get(
        "policies",
        monitoringSchedulePolicyId
      );

    if(!policy.ok) return policy;

    const schedules=[];
    const checkpoints=[];

    for(const baseline of handoff.data.baselines){
      const target=
        handoff.data.targets.find(
          item=>item.metricId===baseline.metricId
        );

      if(!target){
        return runtime.failure(
          "OM_TARGET_NOT_FOUND",
          `No target found for metric: ${baseline.metricId}`
        );
      }

      const validation=
        global.INFINICUS.OM.monitoringScheduleValidator
          .validateDefinition({
            baseline,
            target,
            policy:policy.data
          });

      if(!validation.valid){
        return runtime.failure(
          "OM_MONITORING_SCHEDULE_INVALID",
          "Monitoring schedule failed validation.",
          {
            metricId:baseline.metricId,
            validation
          }
        );
      }

      const schedule={
        monitoringScheduleId:
          runtime.createId("om_monitoring_schedule"),
        monitoringContractId:
          handoff.data.monitoringContractId,
        metricId:baseline.metricId,
        baselineDefinitionId:
          baseline.baselineDefinitionId,
        targetDefinitionId:
          target.targetDefinitionId,
        startsAt:validation.startsAt,
        endsAt:validation.endsAt,
        cadenceMinutes:validation.cadence,
        graceMinutes:policy.data.defaultGraceMinutes,
        allowLateObservation:
          policy.data.allowLateObservation,
        state:"scheduled",
        correlationId:handoff.data.correlationId,
        lineage:handoff.data.lineage.map(runtime.clone),
        confidence:handoff.data.confidence,
        version:1,
        createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.monitoringScheduleStore.put(
        "schedules",
        schedule
      );

      const generated=generateCheckpoints({
        monitoringScheduleId:schedule.monitoringScheduleId,
        metricId:schedule.metricId,
        startsAt:schedule.startsAt,
        endsAt:schedule.endsAt,
        cadenceMinutes:schedule.cadenceMinutes,
        graceMinutes:schedule.graceMinutes
      });

      for(const checkpoint of generated){
        await global.INFINICUS.OM.monitoringScheduleStore.put(
          "checkpoints",
          checkpoint
        );
      }

      schedules.push(schedule);
      checkpoints.push(...generated);
    }

    const normalizationHandoff={
      normalizationHandoffId:
        runtime.createId("om_normalization_handoff"),
      targetBlock:"OM-09",
      monitoringContractId:
        handoff.data.monitoringContractId,
      schedules:schedules.map(runtime.clone),
      checkpoints:checkpoints.map(runtime.clone),
      acceptedObservations:
        handoff.data.acceptedObservations.map(runtime.clone),
      baselines:handoff.data.baselines.map(runtime.clone),
      targets:handoff.data.targets.map(runtime.clone),
      correlationId:handoff.data.correlationId,
      lineage:handoff.data.lineage.map(runtime.clone),
      confidence:handoff.data.confidence,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.monitoringScheduleStore.put(
      "normalization_handoffs",
      normalizationHandoff
    );

    await runtime.emit(
      "om.monitoring_schedules.created",
      {
        scheduleCount:schedules.length,
        checkpointCount:checkpoints.length,
        normalizationHandoffId:
          normalizationHandoff.normalizationHandoffId
      }
    );

    return runtime.success({
      schedules,
      checkpoints,
      normalizationHandoff
    });
  }

  async function changeState({
    monitoringScheduleId,
    nextState,
    reason=null
  }={}){
    const record=
      await global.INFINICUS.OM.monitoringScheduleStore.get(
        "schedules",
        monitoringScheduleId
      );

    if(!record.ok) return record;

    const allowed={
      scheduled:["collecting","paused","cancelled","expired"],
      collecting:["paused","completed","cancelled","expired"],
      paused:["scheduled","collecting","cancelled","expired"],
      completed:[],
      cancelled:[],
      expired:[]
    };

    if(!allowed[record.data.state]?.includes(nextState)){
      return runtime.failure(
        "OM_SCHEDULE_TRANSITION_INVALID",
        `Invalid schedule transition: ${record.data.state} -> ${nextState}`
      );
    }

    const updated={
      ...record.data,
      state:nextState,
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.monitoringScheduleStore.put(
      "schedules",
      updated
    );

    await global.INFINICUS.OM.monitoringScheduleStore.put(
      "events",
      {
        monitoringScheduleEventId:
          runtime.createId("om_schedule_event"),
        monitoringScheduleId,
        fromState:record.data.state,
        toState:nextState,
        reason,
        occurredAt:new Date().toISOString()
      }
    );

    return runtime.success({schedule:updated});
  }

  const api=Object.freeze({
    registerPolicy,
    createSchedules,
    changeState,
    getSchedule:({monitoringScheduleId}) =>
      global.INFINICUS.OM.monitoringScheduleStore.get(
        "schedules",
        monitoringScheduleId
      ),
    getNormalizationHandoff:({normalizationHandoffId}) =>
      global.INFINICUS.OM.monitoringScheduleStore.get(
        "normalization_handoffs",
        normalizationHandoffId
      ),
    listCheckpoints:() =>
      global.INFINICUS.OM.monitoringScheduleStore.list(
        "checkpoints"
      )
  });

  runtime.registerService(
    "om.observation_window_monitoring_schedule",
    api,
    {block:"OM-08"}
  );

  runtime.registerRoute(
    "om.monitoring_schedule_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.monitoring_schedules.create",
    createSchedules
  );

  runtime.registerRoute(
    "om.monitoring_schedule.state_change",
    changeState
  );

  global.INFINICUS.OM.observationWindowScheduleEngine=api;
})(window);

/* ===== INFINICUS-OM-09-Metric-Normalization-Aggregation-Engine ===== */

/* --- outcome-monitoring/INFINICUS-OM-09-Metric-Normalization-Aggregation-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;
  if(!OM?.runtime) throw new Error("OM-01 must be loaded before OM-09.");
  if(!OM?.observationWindowScheduleEngine){
    throw new Error("OM-08 must be loaded before OM-09.");
  }
})(window);

/* --- outcome-monitoring/INFINICUS-OM-09-Metric-Normalization-Aggregation-Engine/src/model/normalization-policy.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_NORMALIZATION_POLICY_INVALID",
        "Normalization policy name and code are required."
      );
    }

    return runtime.success({
      metricNormalizationPolicyId:
        input.metricNormalizationPolicyId ||
        runtime.createId("om_normalization_policy"),
      name:String(input.name),
      code:String(input.code),
      allowNumericCoercion:
        input.allowNumericCoercion !== false,
      rejectUnknownUnits:
        input.rejectUnknownUnits !== false,
      preservePrecisionDigits:
        Math.max(0,Number(input.preservePrecisionDigits ?? 4)),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.metricNormalizationPolicyModel=
    Object.freeze({create});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-09-Metric-Normalization-Aggregation-Engine/src/normalization/aggregation.js --- */
(function(global){
  "use strict";

  function aggregate(values,mode="latest",weights=[]){
    if(!values.length) return null;

    switch(mode){
      case "sum":
        return values.reduce((sum,value)=>sum+value,0);
      case "average":
        return values.reduce((sum,value)=>sum+value,0)/values.length;
      case "minimum":
        return Math.min(...values);
      case "maximum":
        return Math.max(...values);
      case "count":
        return values.length;
      case "weighted_average":{
        const totalWeight=weights.reduce((sum,value)=>sum+value,0);
        if(!totalWeight) return null;
        return values.reduce(
          (sum,value,index)=>sum+value*(weights[index] || 0),
          0
        )/totalWeight;
      }
      case "latest":
      default:
        return values.at(-1);
    }
  }

  global.INFINICUS.OM.metricAggregation=
    Object.freeze({aggregate});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-09-Metric-Normalization-Aggregation-Engine/src/validation/normalization-validator.js --- */
(function(global){
  "use strict";

  function normalizeValue({
    value,
    sourceUnit,
    targetUnit,
    valueType,
    converter,
    policy
  }){
    const issues=[];
    let normalized=value;

    if(valueType==="number" && typeof normalized!=="number"){
      if(policy.allowNumericCoercion && normalized!==null && normalized!==""){
        normalized=Number(normalized);
      }
    }

    if(valueType==="number" && !Number.isFinite(normalized)){
      issues.push("Value cannot be normalized to a finite number.");
    }

    if(sourceUnit && targetUnit && sourceUnit!==targetUnit){
      if(typeof converter!=="function"){
        if(policy.rejectUnknownUnits){
          issues.push(`No unit converter registered: ${sourceUnit} -> ${targetUnit}`);
        }
      }else{
        normalized=converter(normalized);
      }
    }

    if(
      typeof normalized==="number" &&
      Number.isFinite(normalized)
    ){
      normalized=Number(
        normalized.toFixed(policy.preservePrecisionDigits)
      );
    }

    return {
      valid:issues.length===0,
      normalized,
      issues
    };
  }

  global.INFINICUS.OM.metricNormalizationValidator=
    Object.freeze({normalizeValue});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-09-Metric-Normalization-Aggregation-Engine/src/storage/normalization-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_NORMALIZATION";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;

        for(const [name,keyPath] of [
          ["policies","metricNormalizationPolicyId"],
          ["normalized","normalizedObservationId"],
          ["aggregates","metricAggregateId"],
          ["progress_handoffs","outcomeProgressHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
          }
        }
      };

      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "OM_NORMALIZATION_STORAGE_ERROR",
        error?.message || "Normalization storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_NORMALIZATION_RECORD_NOT_FOUND",
            "Normalization record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_NORMALIZATION_STORAGE_ERROR",
        error?.message || "Normalization retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "OM_NORMALIZATION_STORAGE_ERROR",
        error?.message || "Normalization listing failed."
      );
    }
  }

  global.INFINICUS.OM.metricNormalizationStore=
    Object.freeze({open,put,get,list});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-09-Metric-Normalization-Aggregation-Engine/src/engine/metric-normalization-aggregation-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const converters=new Map();

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.metricNormalizationPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.metricNormalizationStore.put(
      "policies",
      built.data
    );
  }

  function registerConverter({
    sourceUnit,
    targetUnit,
    converter
  }={}){
    if(!sourceUnit || !targetUnit || typeof converter!=="function"){
      return runtime.failure(
        "OM_UNIT_CONVERTER_INVALID",
        "Source unit, target unit, and converter are required."
      );
    }

    const key=`${sourceUnit}->${targetUnit}`;
    converters.set(key,converter);

    return runtime.success({key});
  }

  async function normalizeAndAggregate({
    normalizationHandoffId,
    metricNormalizationPolicyId
  }={}){
    const handoff=
      await global.INFINICUS.OM.observationWindowScheduleEngine
        .getNormalizationHandoff({
          normalizationHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.metricNormalizationStore.get(
        "policies",
        metricNormalizationPolicyId
      );

    if(!policy.ok) return policy;

    const normalized=[];
    const aggregates=[];

    for(const schedule of handoff.data.schedules){
      const baseline=
        handoff.data.baselines.find(
          item=>item.metricId===schedule.metricId
        );

      const target=
        handoff.data.targets.find(
          item=>item.metricId===schedule.metricId
        );

      const accepted=
        handoff.data.acceptedObservations.filter(
          item=>item.observation.metricId===schedule.metricId
        );

      const metricValues=[];

      for(const acceptedItem of accepted){
        const observation=acceptedItem.observation;
        const converter=
          converters.get(
            `${observation.unit}->${target.unit}`
          );

        const result=
          global.INFINICUS.OM.metricNormalizationValidator
            .normalizeValue({
              value:observation.value,
              sourceUnit:observation.unit,
              targetUnit:target.unit,
              valueType:
                typeof observation.value==="number"
                  ? "number"
                  : "string",
              converter,
              policy:policy.data
            });

        if(!result.valid){
          return runtime.failure(
            "OM_METRIC_NORMALIZATION_FAILED",
            "Metric observation failed normalization.",
            {
              observationId:observation.observationId,
              issues:result.issues
            }
          );
        }

        const record={
          normalizedObservationId:
            runtime.createId("om_normalized_observation"),
          sourceObservationId:observation.observationId,
          metricId:schedule.metricId,
          monitoringScheduleId:
            schedule.monitoringScheduleId,
          value:result.normalized,
          unit:target.unit,
          classification:"calculated",
          derivationType:"normalization",
          sourceTimestamp:observation.sourceTimestamp,
          correlationId:handoff.data.correlationId,
          lineage:[
            ...observation.lineage.map(runtime.clone),
            {
              sourceType:"normalized_observation",
              sourceObservationId:
                observation.observationId
            }
          ],
          confidence:acceptedItem.adjustedConfidence,
          createdAt:new Date().toISOString()
        };

        await global.INFINICUS.OM.metricNormalizationStore.put(
          "normalized",
          record
        );

        normalized.push(record);
        metricValues.push(record.value);
      }

      const aggregationMode=
        target.aggregation ||
        baseline.aggregation ||
        "latest";

      const aggregateValue=
        global.INFINICUS.OM.metricAggregation.aggregate(
          metricValues,
          aggregationMode
        );

      const aggregate={
        metricAggregateId:
          runtime.createId("om_metric_aggregate"),
        metricId:schedule.metricId,
        monitoringScheduleId:
          schedule.monitoringScheduleId,
        baselineDefinitionId:
          baseline.baselineDefinitionId,
        targetDefinitionId:
          target.targetDefinitionId,
        aggregationMode,
        aggregateValue,
        unit:target.unit,
        observationCount:metricValues.length,
        classification:"calculated",
        derivationType:"aggregation",
        correlationId:handoff.data.correlationId,
        lineage:[
          ...handoff.data.lineage.map(runtime.clone),
          ...normalized
            .filter(item=>item.metricId===schedule.metricId)
            .map(item=>({
              sourceType:"normalized_observation",
              sourceId:item.normalizedObservationId
            }))
        ],
        confidence:
          accepted.length
            ? Number(
                (
                  accepted.reduce(
                    (sum,item)=>sum+item.adjustedConfidence,
                    0
                  ) / accepted.length
                ).toFixed(4)
              )
            : 0,
        createdAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.metricNormalizationStore.put(
        "aggregates",
        aggregate
      );

      aggregates.push(aggregate);
    }

    const progressHandoff={
      outcomeProgressHandoffId:
        runtime.createId("om_outcome_progress_handoff"),
      targetBlock:"OM-10",
      monitoringContractId:
        handoff.data.monitoringContractId,
      schedules:handoff.data.schedules.map(runtime.clone),
      baselines:handoff.data.baselines.map(runtime.clone),
      targets:handoff.data.targets.map(runtime.clone),
      normalizedObservations:normalized.map(runtime.clone),
      metricAggregates:aggregates.map(runtime.clone),
      correlationId:handoff.data.correlationId,
      lineage:handoff.data.lineage.map(runtime.clone),
      confidence:
        aggregates.length
          ? Number(
              (
                aggregates.reduce(
                  (sum,item)=>sum+item.confidence,
                  0
                ) / aggregates.length
              ).toFixed(4)
            )
          : 0,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.metricNormalizationStore.put(
      "progress_handoffs",
      progressHandoff
    );

    await runtime.emit(
      "om.metrics.normalized_aggregated",
      {
        normalizedCount:normalized.length,
        aggregateCount:aggregates.length,
        outcomeProgressHandoffId:
          progressHandoff.outcomeProgressHandoffId
      }
    );

    return runtime.success({
      normalizedObservations:normalized,
      metricAggregates:aggregates,
      outcomeProgressHandoff:progressHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    registerConverter,
    normalizeAndAggregate,
    getOutcomeProgressHandoff:({
      outcomeProgressHandoffId
    }) =>
      global.INFINICUS.OM.metricNormalizationStore.get(
        "progress_handoffs",
        outcomeProgressHandoffId
      ),
    listNormalizedObservations:() =>
      global.INFINICUS.OM.metricNormalizationStore.list(
        "normalized"
      ),
    listMetricAggregates:() =>
      global.INFINICUS.OM.metricNormalizationStore.list(
        "aggregates"
      )
  });

  runtime.registerService(
    "om.metric_normalization_aggregation",
    api,
    {block:"OM-09"}
  );

  runtime.registerRoute(
    "om.metric_normalization_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.metrics.normalize_aggregate",
    normalizeAndAggregate
  );

  global.INFINICUS.OM.metricNormalizationAggregationEngine=api;
})(window);

/* ===== INFINICUS-OM-10-Outcome-Progress-Calculation-Engine ===== */

/* --- outcome-monitoring/INFINICUS-OM-10-Outcome-Progress-Calculation-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";

  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-10.");
  }

  if(!OM?.metricNormalizationAggregationEngine){
    throw new Error("OM-09 must be loaded before OM-10.");
  }
})(window);

/* --- outcome-monitoring/INFINICUS-OM-10-Outcome-Progress-Calculation-Engine/src/model/progress-policy.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_PROGRESS_POLICY_INVALID",
        "Progress policy name and code are required."
      );
    }

    return runtime.success({
      outcomeProgressPolicyId:
        input.outcomeProgressPolicyId ||
        runtime.createId("om_progress_policy"),
      name:String(input.name),
      code:String(input.code),
      completionThreshold:
        Math.max(0,Math.min(2,Number(input.completionThreshold ?? 1))),
      warningThreshold:
        Math.max(0,Math.min(2,Number(input.warningThreshold ?? 0.7))),
      allowOverachievement:
        input.allowOverachievement !== false,
      capProgressAtOne:
        Boolean(input.capProgressAtOne),
      minimumConfidence:
        Math.max(0,Math.min(1,Number(input.minimumConfidence ?? 0.5))),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.outcomeProgressPolicyModel=
    Object.freeze({create});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-10-Outcome-Progress-Calculation-Engine/src/calculation/progress-calculator.js --- */
(function(global){
  "use strict";

  function numeric(value){
    const number=Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function calculate({
    baselineValue,
    currentValue,
    targetValue,
    minimumAcceptableValue,
    maximumAcceptableValue,
    direction,
    tolerance=0
  }={}){
    const baseline=numeric(baselineValue);
    const current=numeric(currentValue);
    const target=numeric(targetValue);
    const minimum=numeric(minimumAcceptableValue);
    const maximum=numeric(maximumAcceptableValue);
    const tol=Math.max(0,Number(tolerance || 0));

    if(baseline===null || current===null || target===null){
      return {
        valid:false,
        issues:["Baseline, current, and target values must be finite numbers."]
      };
    }

    let progressRatio=0;
    let targetGap=0;
    let achieved=false;
    let withinAcceptableRange=false;

    switch(direction){
      case "decrease":{
        const requiredChange=baseline-target;
        const actualChange=baseline-current;
        progressRatio=
          requiredChange===0
            ? (current<=target+tol ? 1 : 0)
            : actualChange/requiredChange;
        targetGap=current-target;
        achieved=current<=target+tol;
        break;
      }

      case "maintain":{
        const distance=Math.abs(current-target);
        progressRatio=distance<=tol ? 1 : Math.max(0,1-distance/(Math.abs(target)||1));
        targetGap=current-target;
        achieved=distance<=tol;
        break;
      }

      case "range":{
        const low=minimum ?? target-tol;
        const high=maximum ?? target+tol;
        withinAcceptableRange=current>=low && current<=high;
        achieved=withinAcceptableRange;

        if(withinAcceptableRange){
          progressRatio=1;
          targetGap=0;
        }else if(current<low){
          const requiredChange=low-baseline;
          const actualChange=current-baseline;
          progressRatio=
            requiredChange===0 ? 0 : actualChange/requiredChange;
          targetGap=current-low;
        }else{
          const requiredChange=baseline-high;
          const actualChange=baseline-current;
          progressRatio=
            requiredChange===0 ? 0 : actualChange/requiredChange;
          targetGap=current-high;
        }

        break;
      }

      case "increase":
      default:{
        const requiredChange=target-baseline;
        const actualChange=current-baseline;
        progressRatio=
          requiredChange===0
            ? (current>=target-tol ? 1 : 0)
            : actualChange/requiredChange;
        targetGap=target-current;
        achieved=current>=target-tol;
        break;
      }
    }

    return {
      valid:true,
      baselineValue:baseline,
      currentValue:current,
      targetValue:target,
      progressRatio:Number(progressRatio.toFixed(6)),
      progressPercent:Number((progressRatio*100).toFixed(2)),
      targetGap:Number(targetGap.toFixed(6)),
      achieved,
      withinAcceptableRange,
      direction,
      issues:[]
    };
  }

  global.INFINICUS.OM.outcomeProgressCalculator=
    Object.freeze({calculate});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-10-Outcome-Progress-Calculation-Engine/src/storage/progress-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_OUTCOME_PROGRESS";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;

        for(const [name,keyPath] of [
          ["policies","outcomeProgressPolicyId"],
          ["progress","outcomeProgressId"],
          ["states","outcomeProgressStateId"],
          ["variance_handoffs","varianceThresholdHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
          }
        }
      };

      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "OM_PROGRESS_STORAGE_ERROR",
        error?.message || "Outcome progress storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_PROGRESS_RECORD_NOT_FOUND",
            "Outcome progress record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_PROGRESS_STORAGE_ERROR",
        error?.message || "Outcome progress retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "OM_PROGRESS_STORAGE_ERROR",
        error?.message || "Outcome progress listing failed."
      );
    }
  }

  global.INFINICUS.OM.outcomeProgressStore=
    Object.freeze({open,put,get,list});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-10-Outcome-Progress-Calculation-Engine/src/engine/outcome-progress-calculation-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.outcomeProgressPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.outcomeProgressStore.put(
      "policies",
      built.data
    );
  }

  function classify({
    progressRatio,
    achieved,
    confidence,
    policy
  }){
    if(confidence<policy.minimumConfidence){
      return "low_confidence";
    }

    if(achieved || progressRatio>=policy.completionThreshold){
      return "achieved";
    }

    if(progressRatio>=policy.warningThreshold){
      return "on_track";
    }

    if(progressRatio>0){
      return "behind";
    }

    return "not_progressing";
  }

  async function calculateProgress({
    outcomeProgressHandoffId,
    outcomeProgressPolicyId
  }={}){
    const handoff=
      await global.INFINICUS.OM.metricNormalizationAggregationEngine
        .getOutcomeProgressHandoff({
          outcomeProgressHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.outcomeProgressStore.get(
        "policies",
        outcomeProgressPolicyId
      );

    if(!policy.ok) return policy;

    const progressRecords=[];
    const states=[];

    for(const aggregate of handoff.data.metricAggregates){
      const baseline=
        handoff.data.baselines.find(
          item=>item.metricId===aggregate.metricId
        );

      const target=
        handoff.data.targets.find(
          item=>item.metricId===aggregate.metricId
        );

      if(!baseline || !target){
        return runtime.failure(
          "OM_PROGRESS_REFERENCE_MISSING",
          `Baseline or target missing for metric: ${aggregate.metricId}`
        );
      }

      const calculated=
        global.INFINICUS.OM.outcomeProgressCalculator.calculate({
          baselineValue:baseline.value,
          currentValue:aggregate.aggregateValue,
          targetValue:target.targetValue,
          minimumAcceptableValue:
            target.minimumAcceptableValue,
          maximumAcceptableValue:
            target.maximumAcceptableValue,
          direction:target.direction,
          tolerance:target.tolerance
        });

      if(!calculated.valid){
        return runtime.failure(
          "OM_PROGRESS_CALCULATION_FAILED",
          "Outcome progress calculation failed.",
          {
            metricId:aggregate.metricId,
            issues:calculated.issues
          }
        );
      }

      let progressRatio=calculated.progressRatio;

      if(
        policy.data.capProgressAtOne &&
        progressRatio>1
      ){
        progressRatio=1;
      }

      const confidence=
        Number(
          Math.min(
            aggregate.confidence,
            baseline.confidence,
            target.confidence,
            handoff.data.confidence
          ).toFixed(4)
        );

      const state=
        classify({
          progressRatio,
          achieved:calculated.achieved,
          confidence,
          policy:policy.data
        });

      const progress={
        outcomeProgressId:
          runtime.createId("om_outcome_progress"),
        monitoringContractId:
          handoff.data.monitoringContractId,
        metricId:aggregate.metricId,
        monitoringScheduleId:
          aggregate.monitoringScheduleId,
        metricAggregateId:
          aggregate.metricAggregateId,
        baselineDefinitionId:
          baseline.baselineDefinitionId,
        targetDefinitionId:
          target.targetDefinitionId,
        baselineValue:calculated.baselineValue,
        currentValue:calculated.currentValue,
        targetValue:calculated.targetValue,
        progressRatio:
          Number(progressRatio.toFixed(6)),
        progressPercent:
          Number((progressRatio*100).toFixed(2)),
        targetGap:calculated.targetGap,
        achieved:calculated.achieved,
        withinAcceptableRange:
          calculated.withinAcceptableRange,
        direction:calculated.direction,
        classification:"calculated",
        progressState:state,
        confidence,
        correlationId:handoff.data.correlationId,
        lineage:[
          ...handoff.data.lineage.map(runtime.clone),
          {
            sourceType:"metric_aggregate",
            sourceId:aggregate.metricAggregateId
          }
        ],
        calculatedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.outcomeProgressStore.put(
        "progress",
        progress
      );

      const stateRecord={
        outcomeProgressStateId:
          runtime.createId("om_outcome_progress_state"),
        outcomeProgressId:progress.outcomeProgressId,
        metricId:progress.metricId,
        state,
        achieved:progress.achieved,
        confidence,
        correlationId:progress.correlationId,
        createdAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.outcomeProgressStore.put(
        "states",
        stateRecord
      );

      runtime.registerOutcomeState({
        outcomeStateId:stateRecord.outcomeProgressStateId,
        metricId:progress.metricId,
        state,
        confidence
      });

      progressRecords.push(progress);
      states.push(stateRecord);
    }

    const varianceHandoff={
      varianceThresholdHandoffId:
        runtime.createId("om_variance_threshold_handoff"),
      targetBlock:"OM-11",
      monitoringContractId:
        handoff.data.monitoringContractId,
      progressRecords:progressRecords.map(runtime.clone),
      progressStates:states.map(runtime.clone),
      baselines:handoff.data.baselines.map(runtime.clone),
      targets:handoff.data.targets.map(runtime.clone),
      metricAggregates:
        handoff.data.metricAggregates.map(runtime.clone),
      correlationId:handoff.data.correlationId,
      lineage:handoff.data.lineage.map(runtime.clone),
      confidence:
        progressRecords.length
          ? Number(
              (
                progressRecords.reduce(
                  (sum,item)=>sum+item.confidence,
                  0
                ) / progressRecords.length
              ).toFixed(4)
            )
          : 0,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.outcomeProgressStore.put(
      "variance_handoffs",
      varianceHandoff
    );

    await runtime.emit(
      "om.outcome_progress.calculated",
      {
        progressCount:progressRecords.length,
        varianceThresholdHandoffId:
          varianceHandoff.varianceThresholdHandoffId
      }
    );

    return runtime.success({
      progressRecords,
      progressStates:states,
      varianceThresholdHandoff:varianceHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    calculateProgress,
    getProgress:({outcomeProgressId}) =>
      global.INFINICUS.OM.outcomeProgressStore.get(
        "progress",
        outcomeProgressId
      ),
    getVarianceThresholdHandoff:({
      varianceThresholdHandoffId
    }) =>
      global.INFINICUS.OM.outcomeProgressStore.get(
        "variance_handoffs",
        varianceThresholdHandoffId
      ),
    listProgress:() =>
      global.INFINICUS.OM.outcomeProgressStore.list(
        "progress"
      )
  });

  runtime.registerService(
    "om.outcome_progress_calculation",
    api,
    {block:"OM-10"}
  );

  runtime.registerRoute(
    "om.outcome_progress_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.outcome_progress.calculate",
    calculateProgress
  );

  global.INFINICUS.OM.outcomeProgressCalculationEngine=api;
})(window);

/* ===== INFINICUS-OM-11-Variance-Threshold-Detection-Engine ===== */

/* --- outcome-monitoring/INFINICUS-OM-11-Variance-Threshold-Detection-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";

  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-11.");
  }

  if(!OM?.outcomeProgressCalculationEngine){
    throw new Error("OM-10 must be loaded before OM-11.");
  }
})(window);

/* --- outcome-monitoring/INFINICUS-OM-11-Variance-Threshold-Detection-Engine/src/model/variance-policy.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_VARIANCE_POLICY_INVALID",
        "Variance policy name and code are required."
      );
    }

    return runtime.success({
      varianceThresholdPolicyId:
        input.varianceThresholdPolicyId ||
        runtime.createId("om_variance_policy"),
      name:String(input.name),
      code:String(input.code),
      warningVariancePercent:
        Math.max(0,Number(input.warningVariancePercent ?? 10)),
      criticalVariancePercent:
        Math.max(0,Number(input.criticalVariancePercent ?? 25)),
      progressWarningBelow:
        Math.max(0,Math.min(2,Number(input.progressWarningBelow ?? 0.7))),
      progressCriticalBelow:
        Math.max(0,Math.min(2,Number(input.progressCriticalBelow ?? 0.4))),
      suppressDuplicateMinutes:
        Math.max(0,Number(input.suppressDuplicateMinutes || 60)),
      minimumConfidence:
        Math.max(0,Math.min(1,Number(input.minimumConfidence ?? 0.5))),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.varianceThresholdPolicyModel=
    Object.freeze({create});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-11-Variance-Threshold-Detection-Engine/src/detection/variance-detector.js --- */
(function(global){
  "use strict";

  function percentVariance(current,reference){
    const c=Number(current);
    const r=Number(reference);

    if(!Number.isFinite(c) || !Number.isFinite(r)){
      return null;
    }

    if(r===0){
      return c===0 ? 0 : null;
    }

    return ((c-r)/Math.abs(r))*100;
  }

  function detect({progress,target,policy}={}){
    const issues=[];
    const current=Number(progress.currentValue);
    const baseline=Number(progress.baselineValue);
    const targetValue=Number(progress.targetValue);

    if(
      !Number.isFinite(current) ||
      !Number.isFinite(baseline) ||
      !Number.isFinite(targetValue)
    ){
      return {
        valid:false,
        issues:["Current, baseline, and target values must be finite."]
      };
    }

    const baselineVariance=current-baseline;
    const targetVariance=current-targetValue;
    const baselineVariancePercent=
      percentVariance(current,baseline);
    const targetVariancePercent=
      percentVariance(current,targetValue);

    const minimum=
      target.minimumAcceptableValue==null
        ? null
        : Number(target.minimumAcceptableValue);

    const maximum=
      target.maximumAcceptableValue==null
        ? null
        : Number(target.maximumAcceptableValue);

    const tolerance=
      target.tolerance==null
        ? 0
        : Math.abs(Number(target.tolerance));

    const rangeBreach=
      (
        minimum!==null &&
        Number.isFinite(minimum) &&
        current<minimum
      ) ||
      (
        maximum!==null &&
        Number.isFinite(maximum) &&
        current>maximum
      );

    const toleranceBreach=
      Math.abs(targetVariance)>tolerance &&
      tolerance>0;

    const absoluteTargetVariancePercent=
      targetVariancePercent==null
        ? null
        : Math.abs(targetVariancePercent);

    let severity="normal";

    if(
      progress.progressRatio <
      policy.progressCriticalBelow ||
      (
        absoluteTargetVariancePercent!==null &&
        absoluteTargetVariancePercent>=
          policy.criticalVariancePercent
      )
    ){
      severity="critical";
    }else if(
      progress.progressRatio <
      policy.progressWarningBelow ||
      rangeBreach ||
      toleranceBreach ||
      (
        absoluteTargetVariancePercent!==null &&
        absoluteTargetVariancePercent>=
          policy.warningVariancePercent
      )
    ){
      severity="warning";
    }else if(!progress.achieved){
      severity="acceptable_deviation";
    }

    return {
      valid:true,
      issues,
      baselineVariance:Number(baselineVariance.toFixed(6)),
      targetVariance:Number(targetVariance.toFixed(6)),
      baselineVariancePercent:
        baselineVariancePercent==null
          ? null
          : Number(baselineVariancePercent.toFixed(2)),
      targetVariancePercent:
        targetVariancePercent==null
          ? null
          : Number(targetVariancePercent.toFixed(2)),
      rangeBreach,
      toleranceBreach,
      severity,
      breached:
        ["warning","critical"].includes(severity)
    };
  }

  global.INFINICUS.OM.varianceDetector=
    Object.freeze({percentVariance,detect});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-11-Variance-Threshold-Detection-Engine/src/storage/variance-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_VARIANCE_THRESHOLD";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;

        for(const [name,keyPath] of [
          ["policies","varianceThresholdPolicyId"],
          ["variance_records","varianceDetectionId"],
          ["breaches","thresholdBreachId"],
          ["suppressions","thresholdSuppressionId"],
          ["alert_handoffs","alertEscalationHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
          }
        }
      };

      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "OM_VARIANCE_STORAGE_ERROR",
        error?.message || "Variance storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_VARIANCE_RECORD_NOT_FOUND",
            "Variance record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_VARIANCE_STORAGE_ERROR",
        error?.message || "Variance retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "OM_VARIANCE_STORAGE_ERROR",
        error?.message || "Variance listing failed."
      );
    }
  }

  global.INFINICUS.OM.varianceThresholdStore=
    Object.freeze({open,put,get,list});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-11-Variance-Threshold-Detection-Engine/src/engine/variance-threshold-detection-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const latestBreachByMetric=new Map();

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.varianceThresholdPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.varianceThresholdStore.put(
      "policies",
      built.data
    );
  }

  function shouldSuppress(metricId,severity,minutes){
    const key=`${metricId}:${severity}`;
    const previous=latestBreachByMetric.get(key);

    if(!previous){
      return false;
    }

    return (
      Date.now() -
      new Date(previous).getTime()
    ) < minutes*60000;
  }

  async function detectVariances({
    varianceThresholdHandoffId,
    varianceThresholdPolicyId
  }={}){
    const handoff=
      await global.INFINICUS.OM.outcomeProgressCalculationEngine
        .getVarianceThresholdHandoff({
          varianceThresholdHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.varianceThresholdStore.get(
        "policies",
        varianceThresholdPolicyId
      );

    if(!policy.ok) return policy;

    const variances=[];
    const breaches=[];
    const suppressions=[];

    for(const progress of handoff.data.progressRecords){
      const target=
        handoff.data.targets.find(
          item=>item.metricId===progress.metricId
        );

      if(!target){
        return runtime.failure(
          "OM_VARIANCE_TARGET_MISSING",
          `Target missing for metric: ${progress.metricId}`
        );
      }

      const detected=
        global.INFINICUS.OM.varianceDetector.detect({
          progress,
          target,
          policy:policy.data
        });

      if(!detected.valid){
        return runtime.failure(
          "OM_VARIANCE_DETECTION_FAILED",
          "Variance detection failed.",
          {
            metricId:progress.metricId,
            issues:detected.issues
          }
        );
      }

      const variance={
        varianceDetectionId:
          runtime.createId("om_variance_detection"),
        monitoringContractId:
          handoff.data.monitoringContractId,
        metricId:progress.metricId,
        outcomeProgressId:
          progress.outcomeProgressId,
        baselineDefinitionId:
          progress.baselineDefinitionId,
        targetDefinitionId:
          progress.targetDefinitionId,
        metricAggregateId:
          progress.metricAggregateId,
        baselineVariance:
          detected.baselineVariance,
        targetVariance:
          detected.targetVariance,
        baselineVariancePercent:
          detected.baselineVariancePercent,
        targetVariancePercent:
          detected.targetVariancePercent,
        rangeBreach:
          detected.rangeBreach,
        toleranceBreach:
          detected.toleranceBreach,
        severity:
          detected.severity,
        breached:
          detected.breached,
        classification:"calculated",
        confidence:
          Math.min(
            progress.confidence,
            handoff.data.confidence
          ),
        correlationId:
          handoff.data.correlationId,
        lineage:[
          ...progress.lineage.map(runtime.clone),
          {
            sourceType:"outcome_progress",
            sourceId:progress.outcomeProgressId
          }
        ],
        detectedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.varianceThresholdStore.put(
        "variance_records",
        variance
      );

      variances.push(variance);

      if(!variance.breached){
        continue;
      }

      if(
        variance.confidence <
        policy.data.minimumConfidence
      ){
        const suppression={
          thresholdSuppressionId:
            runtime.createId("om_threshold_suppression"),
          metricId:variance.metricId,
          varianceDetectionId:
            variance.varianceDetectionId,
          reason:"low_confidence",
          confidence:variance.confidence,
          createdAt:new Date().toISOString()
        };

        await global.INFINICUS.OM.varianceThresholdStore.put(
          "suppressions",
          suppression
        );

        suppressions.push(suppression);
        continue;
      }

      if(
        shouldSuppress(
          variance.metricId,
          variance.severity,
          policy.data.suppressDuplicateMinutes
        )
      ){
        const suppression={
          thresholdSuppressionId:
            runtime.createId("om_threshold_suppression"),
          metricId:variance.metricId,
          varianceDetectionId:
            variance.varianceDetectionId,
          reason:"duplicate_window",
          createdAt:new Date().toISOString()
        };

        await global.INFINICUS.OM.varianceThresholdStore.put(
          "suppressions",
          suppression
        );

        suppressions.push(suppression);
        continue;
      }

      const breach={
        thresholdBreachId:
          runtime.createId("om_threshold_breach"),
        monitoringContractId:
          handoff.data.monitoringContractId,
        metricId:variance.metricId,
        varianceDetectionId:
          variance.varianceDetectionId,
        outcomeProgressId:
          variance.outcomeProgressId,
        severity:variance.severity,
        breachTypes:[
          variance.rangeBreach ? "acceptable_range" : null,
          variance.toleranceBreach ? "tolerance" : null,
          progress.progressRatio <
            policy.data.progressWarningBelow
              ? "progress"
              : null,
          (
            variance.targetVariancePercent!==null &&
            Math.abs(variance.targetVariancePercent) >=
              policy.data.warningVariancePercent
          )
            ? "target_variance"
            : null
        ].filter(Boolean),
        evidence:runtime.clone(variance),
        confidence:variance.confidence,
        correlationId:variance.correlationId,
        lineage:variance.lineage.map(runtime.clone),
        status:"open",
        detectedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.varianceThresholdStore.put(
        "breaches",
        breach
      );

      latestBreachByMetric.set(
        `${breach.metricId}:${breach.severity}`,
        breach.detectedAt
      );

      breaches.push(breach);
    }

    const alertHandoff={
      alertEscalationHandoffId:
        runtime.createId("om_alert_escalation_handoff"),
      targetBlock:"OM-12",
      monitoringContractId:
        handoff.data.monitoringContractId,
      variances:variances.map(runtime.clone),
      thresholdBreaches:
        breaches.map(runtime.clone),
      suppressions:
        suppressions.map(runtime.clone),
      progressRecords:
        handoff.data.progressRecords.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        breaches.length
          ? Number(
              (
                breaches.reduce(
                  (sum,item)=>sum+item.confidence,
                  0
                ) / breaches.length
              ).toFixed(4)
            )
          : handoff.data.confidence,
      status:
        breaches.length ? "alert_required" : "normal",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.varianceThresholdStore.put(
      "alert_handoffs",
      alertHandoff
    );

    await runtime.emit(
      "om.variance_thresholds.detected",
      {
        varianceCount:variances.length,
        breachCount:breaches.length,
        suppressionCount:suppressions.length,
        alertEscalationHandoffId:
          alertHandoff.alertEscalationHandoffId
      }
    );

    return runtime.success({
      variances,
      thresholdBreaches:breaches,
      suppressions,
      alertEscalationHandoff:alertHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    detectVariances,
    getAlertEscalationHandoff:({
      alertEscalationHandoffId
    }) =>
      global.INFINICUS.OM.varianceThresholdStore.get(
        "alert_handoffs",
        alertEscalationHandoffId
      ),
    listVariances:() =>
      global.INFINICUS.OM.varianceThresholdStore.list(
        "variance_records"
      ),
    listBreaches:() =>
      global.INFINICUS.OM.varianceThresholdStore.list(
        "breaches"
      ),
    listSuppressions:() =>
      global.INFINICUS.OM.varianceThresholdStore.list(
        "suppressions"
      )
  });

  runtime.registerService(
    "om.variance_threshold_detection",
    api,
    {block:"OM-11"}
  );

  runtime.registerRoute(
    "om.variance_threshold_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.variance_thresholds.detect",
    detectVariances
  );

  global.INFINICUS.OM.varianceThresholdDetectionEngine=api;
})(window);

/* ===== INFINICUS-OM-12-Alert-Escalation-Engine ===== */

/* --- outcome-monitoring/INFINICUS-OM-12-Alert-Escalation-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-12.");
  }

  if(!OM?.varianceThresholdDetectionEngine){
    throw new Error("OM-11 must be loaded before OM-12.");
  }
})(window);

/* --- outcome-monitoring/INFINICUS-OM-12-Alert-Escalation-Engine/src/model/alert-policy.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_ALERT_POLICY_INVALID",
        "Alert policy name and code are required."
      );
    }

    return runtime.success({
      alertEscalationPolicyId:
        input.alertEscalationPolicyId ||
        runtime.createId("om_alert_policy"),
      name:String(input.name),
      code:String(input.code),
      routes:runtime.clone(input.routes || {
        warning:{
          ownerRole:"manager",
          acknowledgementMinutes:120,
          escalationStages:[]
        },
        critical:{
          ownerRole:"executive",
          acknowledgementMinutes:30,
          escalationStages:[
            {afterMinutes:30,toRole:"executive"},
            {afterMinutes:60,toRole:"governance"}
          ]
        }
      }),
      suppressDuplicateMinutes:
        Math.max(0,Number(input.suppressDuplicateMinutes || 60)),
      requireAcknowledgement:
        input.requireAcknowledgement !== false,
      requireResolutionEvidence:
        input.requireResolutionEvidence !== false,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.alertEscalationPolicyModel=
    Object.freeze({create});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-12-Alert-Escalation-Engine/src/validation/alert-validator.js --- */
(function(global){
  "use strict";

  function validateBreach(breach,policy){
    const issues=[];

    if(policy.status!=="active"){
      issues.push("Alert policy is inactive.");
    }

    if(!breach.thresholdBreachId){
      issues.push("Threshold breach ID is required.");
    }

    if(!["warning","critical"].includes(breach.severity)){
      issues.push("Only warning and critical breaches create alerts.");
    }

    if(!policy.routes?.[breach.severity]){
      issues.push("No alert route is configured for this severity.");
    }

    if(!breach.metricId){
      issues.push("Metric ID is required.");
    }

    if(!Array.isArray(breach.lineage) || !breach.lineage.length){
      issues.push("Breach lineage is required.");
    }

    return {valid:issues.length===0,issues};
  }

  global.INFINICUS.OM.alertValidator=
    Object.freeze({validateBreach});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-12-Alert-Escalation-Engine/src/storage/alert-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_ALERT_ESCALATION";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;

        for(const [name,keyPath] of [
          ["policies","alertEscalationPolicyId"],
          ["alerts","outcomeAlertId"],
          ["events","outcomeAlertEventId"],
          ["acknowledgements","outcomeAlertAcknowledgementId"],
          ["escalations","outcomeAlertEscalationId"],
          ["resolutions","outcomeAlertResolutionId"],
          ["attribution_handoffs","attributionEvidenceHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
          }
        }
      };

      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "OM_ALERT_STORAGE_ERROR",
        error?.message || "Alert storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_ALERT_RECORD_NOT_FOUND",
            "Alert record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_ALERT_STORAGE_ERROR",
        error?.message || "Alert retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "OM_ALERT_STORAGE_ERROR",
        error?.message || "Alert listing failed."
      );
    }
  }

  global.INFINICUS.OM.alertEscalationStore=
    Object.freeze({open,put,get,list});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-12-Alert-Escalation-Engine/src/engine/alert-escalation-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.alertEscalationPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.alertEscalationStore.put(
      "policies",
      built.data
    );
  }

  async function createAlerts({
    alertEscalationHandoffId,
    alertEscalationPolicyId
  }={}){
    const handoff=
      await global.INFINICUS.OM.varianceThresholdDetectionEngine
        .getAlertEscalationHandoff({
          alertEscalationHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.alertEscalationStore.get(
        "policies",
        alertEscalationPolicyId
      );

    if(!policy.ok) return policy;

    const alerts=[];

    for(const breach of handoff.data.thresholdBreaches){
      const validation=
        global.INFINICUS.OM.alertValidator.validateBreach(
          breach,
          policy.data
        );

      if(!validation.valid){
        return runtime.failure(
          "OM_ALERT_CREATION_INVALID",
          "Threshold breach failed alert validation.",
          {
            thresholdBreachId:breach.thresholdBreachId,
            validation
          }
        );
      }

      const route=policy.data.routes[breach.severity];

      const alert={
        outcomeAlertId:
          runtime.createId("om_outcome_alert"),
        monitoringContractId:
          handoff.data.monitoringContractId,
        thresholdBreachId:
          breach.thresholdBreachId,
        varianceDetectionId:
          breach.varianceDetectionId,
        outcomeProgressId:
          breach.outcomeProgressId,
        metricId:
          breach.metricId,
        severity:
          breach.severity,
        breachTypes:
          runtime.clone(breach.breachTypes || []),
        ownerRole:
          route.ownerRole,
        acknowledgementRequired:
          policy.data.requireAcknowledgement,
        acknowledgementDeadline:
          policy.data.requireAcknowledgement
            ? new Date(
                Date.now()+
                Number(route.acknowledgementMinutes || 60)*60000
              ).toISOString()
            : null,
        escalationStages:
          runtime.clone(route.escalationStages || []),
        currentEscalationStage:0,
        evidence:
          runtime.clone(breach.evidence),
        confidence:
          breach.confidence,
        correlationId:
          breach.correlationId,
        lineage:
          breach.lineage.map(runtime.clone),
        state:"open",
        createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.alertEscalationStore.put(
        "alerts",
        alert
      );

      await global.INFINICUS.OM.alertEscalationStore.put(
        "events",
        {
          outcomeAlertEventId:
            runtime.createId("om_alert_event"),
          outcomeAlertId:
            alert.outcomeAlertId,
          eventType:"created",
          state:"open",
          occurredAt:new Date().toISOString()
        }
      );

      alerts.push(alert);
    }

    const attributionHandoff={
      attributionEvidenceHandoffId:
        runtime.createId("om_attribution_evidence_handoff"),
      targetBlock:"OM-13",
      monitoringContractId:
        handoff.data.monitoringContractId,
      alerts:alerts.map(runtime.clone),
      thresholdBreaches:
        handoff.data.thresholdBreaches.map(runtime.clone),
      variances:
        handoff.data.variances.map(runtime.clone),
      progressRecords:
        handoff.data.progressRecords.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        handoff.data.confidence,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.alertEscalationStore.put(
      "attribution_handoffs",
      attributionHandoff
    );

    await runtime.emit(
      "om.alerts.created",
      {
        alertCount:alerts.length,
        attributionEvidenceHandoffId:
          attributionHandoff.attributionEvidenceHandoffId
      }
    );

    return runtime.success({
      alerts,
      attributionEvidenceHandoff:attributionHandoff
    });
  }

  async function acknowledge({
    outcomeAlertId,
    acknowledgedBy,
    note=null
  }={}){
    const alert=
      await global.INFINICUS.OM.alertEscalationStore.get(
        "alerts",
        outcomeAlertId
      );

    if(!alert.ok) return alert;

    if(!["open","escalated"].includes(alert.data.state)){
      return runtime.failure(
        "OM_ALERT_ACKNOWLEDGEMENT_INVALID",
        "Only open or escalated alerts may be acknowledged."
      );
    }

    const acknowledgement={
      outcomeAlertAcknowledgementId:
        runtime.createId("om_alert_acknowledgement"),
      outcomeAlertId,
      acknowledgedBy:String(acknowledgedBy || "unknown"),
      note,
      acknowledgedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.alertEscalationStore.put(
      "acknowledgements",
      acknowledgement
    );

    const updated={
      ...alert.data,
      state:"acknowledged",
      acknowledgedAt:acknowledgement.acknowledgedAt,
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.alertEscalationStore.put(
      "alerts",
      updated
    );

    return runtime.success({
      alert:updated,
      acknowledgement
    });
  }

  async function escalate({
    outcomeAlertId,
    reason="acknowledgement_deadline_exceeded"
  }={}){
    const alert=
      await global.INFINICUS.OM.alertEscalationStore.get(
        "alerts",
        outcomeAlertId
      );

    if(!alert.ok) return alert;

    const nextIndex=alert.data.currentEscalationStage;
    const stage=alert.data.escalationStages[nextIndex];

    if(!stage){
      return runtime.failure(
        "OM_ALERT_ESCALATION_EXHAUSTED",
        "No further escalation stage is available."
      );
    }

    const escalation={
      outcomeAlertEscalationId:
        runtime.createId("om_alert_escalation"),
      outcomeAlertId,
      stageIndex:nextIndex+1,
      toRole:stage.toRole,
      reason,
      escalatedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.alertEscalationStore.put(
      "escalations",
      escalation
    );

    const updated={
      ...alert.data,
      state:"escalated",
      currentEscalationStage:nextIndex+1,
      ownerRole:stage.toRole,
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.alertEscalationStore.put(
      "alerts",
      updated
    );

    return runtime.success({
      alert:updated,
      escalation
    });
  }

  async function resolve({
    outcomeAlertId,
    resolvedBy,
    resolutionEvidence
  }={}){
    const alert=
      await global.INFINICUS.OM.alertEscalationStore.get(
        "alerts",
        outcomeAlertId
      );

    if(!alert.ok) return alert;

    if(!resolutionEvidence){
      return runtime.failure(
        "OM_ALERT_RESOLUTION_EVIDENCE_REQUIRED",
        "Resolution evidence is required."
      );
    }

    const resolution={
      outcomeAlertResolutionId:
        runtime.createId("om_alert_resolution"),
      outcomeAlertId,
      resolvedBy:String(resolvedBy || "unknown"),
      resolutionEvidence:runtime.clone(resolutionEvidence),
      resolvedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.alertEscalationStore.put(
      "resolutions",
      resolution
    );

    const updated={
      ...alert.data,
      state:"resolved",
      resolvedAt:resolution.resolvedAt,
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.alertEscalationStore.put(
      "alerts",
      updated
    );

    return runtime.success({
      alert:updated,
      resolution
    });
  }

  const api=Object.freeze({
    registerPolicy,
    createAlerts,
    acknowledge,
    escalate,
    resolve,
    getAlert:({outcomeAlertId}) =>
      global.INFINICUS.OM.alertEscalationStore.get(
        "alerts",
        outcomeAlertId
      ),
    getAttributionEvidenceHandoff:({
      attributionEvidenceHandoffId
    }) =>
      global.INFINICUS.OM.alertEscalationStore.get(
        "attribution_handoffs",
        attributionEvidenceHandoffId
      ),
    listAlerts:() =>
      global.INFINICUS.OM.alertEscalationStore.list(
        "alerts"
      )
  });

  runtime.registerService(
    "om.alert_escalation",
    api,
    {block:"OM-12"}
  );

  runtime.registerRoute(
    "om.alert_escalation_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.alerts.create",
    createAlerts
  );

  runtime.registerRoute(
    "om.alert.acknowledge",
    acknowledge
  );

  runtime.registerRoute(
    "om.alert.escalate",
    escalate
  );

  runtime.registerRoute(
    "om.alert.resolve",
    resolve
  );

  global.INFINICUS.OM.alertEscalationEngine=api;
})(window);

/* ===== INFINICUS-OM-13-Attribution-Evidence-Engine ===== */

/* --- outcome-monitoring/INFINICUS-OM-13-Attribution-Evidence-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";

  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-13.");
  }

  if(!OM?.alertEscalationEngine){
    throw new Error("OM-12 must be loaded before OM-13.");
  }
})(window);

/* --- outcome-monitoring/INFINICUS-OM-13-Attribution-Evidence-Engine/src/model/attribution-policy.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_ATTRIBUTION_POLICY_INVALID",
        "Attribution policy name and code are required."
      );
    }

    return runtime.success({
      attributionPolicyId:
        input.attributionPolicyId ||
        runtime.createId("om_attribution_policy"),
      name:String(input.name),
      code:String(input.code),
      weights:runtime.clone(input.weights || {
        timing:0.2,
        scope:0.2,
        exposure:0.2,
        mechanism:0.15,
        counterfactual:0.15,
        alternativeExplanations:0.1
      }),
      minimumSufficientEvidence:
        Math.max(0,Math.min(1,Number(input.minimumSufficientEvidence ?? 0.6))),
      minimumStrongAttribution:
        Math.max(0,Math.min(1,Number(input.minimumStrongAttribution ?? 0.75))),
      requireActionIdentity:
        input.requireActionIdentity !== false,
      requireCounterfactual:
        Boolean(input.requireCounterfactual),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.attributionPolicyModel=
    Object.freeze({create});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-13-Attribution-Evidence-Engine/src/scoring/attribution-scorer.js --- */
(function(global){
  "use strict";

  function bounded(value){
    return Math.max(0,Math.min(1,Number(value || 0)));
  }

  function score({
    evidence,
    policy
  }={}){
    const weights=policy.weights;
    const components={
      timing:bounded(evidence.timingAlignment),
      scope:bounded(evidence.scopeAlignment),
      exposure:bounded(evidence.exposureEvidence),
      mechanism:bounded(evidence.mechanismEvidence),
      counterfactual:bounded(evidence.counterfactualEvidence),
      alternativeExplanations:
        1-bounded(evidence.alternativeExplanationStrength)
    };

    const totalWeight=Object.values(weights).reduce(
      (sum,value)=>sum+Number(value || 0),
      0
    ) || 1;

    const attributionScore=
      Object.entries(components).reduce(
        (sum,[key,value])=>
          sum+value*Number(weights[key] || 0),
        0
      ) / totalWeight;

    const missing=[];

    if(!evidence.actionInstanceId){
      missing.push("action_identity");
    }

    if(policy.requireCounterfactual && !evidence.counterfactualReference){
      missing.push("counterfactual");
    }

    let classification="insufficient";

    if(
      !missing.length &&
      attributionScore>=policy.minimumStrongAttribution
    ){
      classification="strong_attribution";
    }else if(
      !missing.length &&
      attributionScore>=policy.minimumSufficientEvidence
    ){
      classification="plausible_attribution";
    }else if(attributionScore>0){
      classification="correlation_only";
    }

    return {
      attributionScore:Number(attributionScore.toFixed(4)),
      components,
      missing,
      sufficient:
        !missing.length &&
        attributionScore>=policy.minimumSufficientEvidence,
      classification
    };
  }

  global.INFINICUS.OM.attributionScorer=
    Object.freeze({score});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-13-Attribution-Evidence-Engine/src/storage/attribution-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_ATTRIBUTION_EVIDENCE";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;

        for(const [name,keyPath] of [
          ["policies","attributionPolicyId"],
          ["evidence","attributionEvidenceId"],
          ["assessments","attributionAssessmentId"],
          ["counterfactuals","counterfactualReferenceId"],
          ["causation_handoffs","causationAssessmentHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
          }
        }
      };

      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "OM_ATTRIBUTION_STORAGE_ERROR",
        error?.message || "Attribution storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_ATTRIBUTION_RECORD_NOT_FOUND",
            "Attribution record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_ATTRIBUTION_STORAGE_ERROR",
        error?.message || "Attribution retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "OM_ATTRIBUTION_STORAGE_ERROR",
        error?.message || "Attribution listing failed."
      );
    }
  }

  global.INFINICUS.OM.attributionEvidenceStore=
    Object.freeze({open,put,get,list});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-13-Attribution-Evidence-Engine/src/engine/attribution-evidence-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.attributionPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.attributionEvidenceStore.put(
      "policies",
      built.data
    );
  }

  async function registerCounterfactual(input={}){
    if(!input.name || !input.referenceType){
      return runtime.failure(
        "OM_COUNTERFACTUAL_INVALID",
        "Counterfactual name and referenceType are required."
      );
    }

    const record={
      counterfactualReferenceId:
        input.counterfactualReferenceId ||
        runtime.createId("om_counterfactual"),
      name:String(input.name),
      referenceType:String(input.referenceType),
      comparisonGroupReference:
        input.comparisonGroupReference || null,
      baselinePeriod:
        runtime.clone(input.baselinePeriod || {}),
      evidence:
        runtime.clone(input.evidence || {}),
      confidence:
        Math.max(0,Math.min(1,Number(input.confidence ?? 0.5))),
      createdAt:new Date().toISOString()
    };

    return global.INFINICUS.OM.attributionEvidenceStore.put(
      "counterfactuals",
      record
    );
  }

  async function assessAttribution({
    attributionEvidenceHandoffId,
    attributionPolicyId,
    evidenceByMetric={}
  }={}){
    const handoff=
      await global.INFINICUS.OM.alertEscalationEngine
        .getAttributionEvidenceHandoff({
          attributionEvidenceHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.attributionEvidenceStore.get(
        "policies",
        attributionPolicyId
      );

    if(!policy.ok) return policy;

    const evidenceRecords=[];
    const assessments=[];

    for(const progress of handoff.data.progressRecords){
      const supplied=evidenceByMetric[progress.metricId] || {};

      const evidence={
        attributionEvidenceId:
          runtime.createId("om_attribution_evidence"),
        monitoringContractId:
          handoff.data.monitoringContractId,
        actionInstanceId:
          supplied.actionInstanceId || null,
        metricId:
          progress.metricId,
        outcomeProgressId:
          progress.outcomeProgressId,
        timingAlignment:
          Number(supplied.timingAlignment ?? 0),
        scopeAlignment:
          Number(supplied.scopeAlignment ?? 0),
        exposureEvidence:
          Number(supplied.exposureEvidence ?? 0),
        mechanismEvidence:
          Number(supplied.mechanismEvidence ?? 0),
        counterfactualEvidence:
          Number(supplied.counterfactualEvidence ?? 0),
        counterfactualReference:
          supplied.counterfactualReference || null,
        alternativeExplanationStrength:
          Number(supplied.alternativeExplanationStrength ?? 0),
        evidenceItems:
          runtime.clone(supplied.evidenceItems || []),
        correlationId:
          handoff.data.correlationId,
        lineage:[
          ...handoff.data.lineage.map(runtime.clone),
          ...progress.lineage.map(runtime.clone)
        ],
        confidence:
          Math.min(
            Number(supplied.confidence ?? 1),
            progress.confidence,
            handoff.data.confidence
          ),
        createdAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.attributionEvidenceStore.put(
        "evidence",
        evidence
      );

      const scored=
        global.INFINICUS.OM.attributionScorer.score({
          evidence,
          policy:policy.data
        });

      const assessment={
        attributionAssessmentId:
          runtime.createId("om_attribution_assessment"),
        attributionEvidenceId:
          evidence.attributionEvidenceId,
        monitoringContractId:
          evidence.monitoringContractId,
        actionInstanceId:
          evidence.actionInstanceId,
        metricId:
          evidence.metricId,
        outcomeProgressId:
          evidence.outcomeProgressId,
        attributionScore:
          scored.attributionScore,
        components:
          runtime.clone(scored.components),
        missingEvidence:
          runtime.clone(scored.missing),
        sufficientEvidence:
          scored.sufficient,
        classification:
          scored.classification,
        causationEstablished:false,
        confidence:
          Number(
            (
              evidence.confidence *
              scored.attributionScore
            ).toFixed(4)
          ),
        correlationId:
          evidence.correlationId,
        lineage:
          evidence.lineage.map(runtime.clone),
        assessedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.attributionEvidenceStore.put(
        "assessments",
        assessment
      );

      evidenceRecords.push(evidence);
      assessments.push(assessment);
    }

    const causationHandoff={
      causationAssessmentHandoffId:
        runtime.createId("om_causation_assessment_handoff"),
      targetBlock:"OM-14",
      monitoringContractId:
        handoff.data.monitoringContractId,
      attributionEvidence:
        evidenceRecords.map(runtime.clone),
      attributionAssessments:
        assessments.map(runtime.clone),
      alerts:
        handoff.data.alerts.map(runtime.clone),
      thresholdBreaches:
        handoff.data.thresholdBreaches.map(runtime.clone),
      variances:
        handoff.data.variances.map(runtime.clone),
      progressRecords:
        handoff.data.progressRecords.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        assessments.length
          ? Number(
              (
                assessments.reduce(
                  (sum,item)=>sum+item.confidence,
                  0
                ) / assessments.length
              ).toFixed(4)
            )
          : 0,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.attributionEvidenceStore.put(
      "causation_handoffs",
      causationHandoff
    );

    await runtime.emit(
      "om.attribution.assessed",
      {
        assessmentCount:assessments.length,
        causationAssessmentHandoffId:
          causationHandoff.causationAssessmentHandoffId
      }
    );

    return runtime.success({
      attributionEvidence:evidenceRecords,
      attributionAssessments:assessments,
      causationAssessmentHandoff:causationHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    registerCounterfactual,
    assessAttribution,
    getAssessment:({attributionAssessmentId}) =>
      global.INFINICUS.OM.attributionEvidenceStore.get(
        "assessments",
        attributionAssessmentId
      ),
    getCausationAssessmentHandoff:({
      causationAssessmentHandoffId
    }) =>
      global.INFINICUS.OM.attributionEvidenceStore.get(
        "causation_handoffs",
        causationAssessmentHandoffId
      ),
    listAssessments:() =>
      global.INFINICUS.OM.attributionEvidenceStore.list(
        "assessments"
      )
  });

  runtime.registerService(
    "om.attribution_evidence",
    api,
    {block:"OM-13"}
  );

  runtime.registerRoute(
    "om.attribution_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.counterfactual.register",
    registerCounterfactual
  );

  runtime.registerRoute(
    "om.attribution.assess",
    assessAttribution
  );

  global.INFINICUS.OM.attributionEvidenceEngine=api;
})(window);

/* ===== INFINICUS-OM-14-Causation-Assessment-Engine ===== */

/* --- outcome-monitoring/INFINICUS-OM-14-Causation-Assessment-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;
  if(!OM?.runtime) throw new Error("OM-01 must be loaded before OM-14.");
  if(!OM?.attributionEvidenceEngine){
    throw new Error("OM-13 must be loaded before OM-14.");
  }
})(window);

/* --- outcome-monitoring/INFINICUS-OM-14-Causation-Assessment-Engine/src/model/causation-policy.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_CAUSATION_POLICY_INVALID",
        "Causation policy name and code are required."
      );
    }

    return runtime.success({
      causationPolicyId:
        input.causationPolicyId ||
        runtime.createId("om_causation_policy"),
      name:String(input.name),
      code:String(input.code),
      weights:runtime.clone(input.weights || {
        temporalOrder:0.2,
        mechanism:0.2,
        doseResponse:0.15,
        counterfactual:0.2,
        reproducibility:0.15,
        attributionStrength:0.1
      }),
      confounderPenaltyWeight:
        Math.max(0,Math.min(1,Number(input.confounderPenaltyWeight ?? 0.35))),
      alternativeExplanationPenaltyWeight:
        Math.max(0,Math.min(1,Number(input.alternativeExplanationPenaltyWeight ?? 0.25))),
      minimumPlausibleCausation:
        Math.max(0,Math.min(1,Number(input.minimumPlausibleCausation ?? 0.6))),
      minimumStrongCausation:
        Math.max(0,Math.min(1,Number(input.minimumStrongCausation ?? 0.8))),
      requireTemporalOrder:
        input.requireTemporalOrder !== false,
      requireCounterfactual:
        Boolean(input.requireCounterfactual),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.causationPolicyModel=
    Object.freeze({create});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-14-Causation-Assessment-Engine/src/scoring/causation-scorer.js --- */
(function(global){
  "use strict";

  const bounded=value=>
    Math.max(0,Math.min(1,Number(value || 0)));

  function score({
    attributionAssessment,
    evidence,
    policy
  }={}){
    const missing=[];

    if(policy.requireTemporalOrder && evidence.temporalOrder!==true){
      missing.push("temporal_order");
    }

    if(policy.requireCounterfactual && !evidence.counterfactualReference){
      missing.push("counterfactual");
    }

    const components={
      temporalOrder:evidence.temporalOrder === true ? 1 : 0,
      mechanism:bounded(evidence.mechanismStrength),
      doseResponse:bounded(evidence.doseResponseStrength),
      counterfactual:bounded(evidence.counterfactualStrength),
      reproducibility:bounded(evidence.reproducibilityStrength),
      attributionStrength:bounded(attributionAssessment.attributionScore)
    };

    const totalWeight=
      Object.values(policy.weights).reduce(
        (sum,value)=>sum+Number(value || 0),
        0
      ) || 1;

    const baseScore=
      Object.entries(components).reduce(
        (sum,[key,value])=>
          sum+value*Number(policy.weights[key] || 0),
        0
      ) / totalWeight;

    const confounderPenalty=
      bounded(evidence.confounderStrength) *
      policy.confounderPenaltyWeight;

    const alternativePenalty=
      bounded(evidence.alternativeExplanationStrength) *
      policy.alternativeExplanationPenaltyWeight;

    const causalScore=
      Math.max(
        0,
        Math.min(1,baseScore-confounderPenalty-alternativePenalty)
      );

    let classification="inconclusive";

    if(
      !missing.length &&
      causalScore>=policy.minimumStrongCausation
    ){
      classification="strong_causal_support";
    }else if(
      !missing.length &&
      causalScore>=policy.minimumPlausibleCausation
    ){
      classification="plausible_causal_support";
    }else if(causalScore>0){
      classification="weak_causal_support";
    }

    return {
      causalScore:Number(causalScore.toFixed(4)),
      baseScore:Number(baseScore.toFixed(4)),
      confounderPenalty:Number(confounderPenalty.toFixed(4)),
      alternativePenalty:Number(alternativePenalty.toFixed(4)),
      components,
      missing,
      classification,
      causationEstablished:
        classification==="strong_causal_support"
    };
  }

  global.INFINICUS.OM.causationScorer=
    Object.freeze({score});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-14-Causation-Assessment-Engine/src/storage/causation-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_CAUSATION_ASSESSMENT";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;

        for(const [name,keyPath] of [
          ["policies","causationPolicyId"],
          ["evidence","causalEvidenceId"],
          ["assessments","causationAssessmentId"],
          ["external_factor_handoffs","externalFactorHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
          }
        }
      };

      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "OM_CAUSATION_STORAGE_ERROR",
        error?.message || "Causation storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_CAUSATION_RECORD_NOT_FOUND",
            "Causation record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_CAUSATION_STORAGE_ERROR",
        error?.message || "Causation retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "OM_CAUSATION_STORAGE_ERROR",
        error?.message || "Causation listing failed."
      );
    }
  }

  global.INFINICUS.OM.causationAssessmentStore=
    Object.freeze({open,put,get,list});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-14-Causation-Assessment-Engine/src/engine/causation-assessment-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.causationPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.causationAssessmentStore.put(
      "policies",
      built.data
    );
  }

  async function assessCausation({
    causationAssessmentHandoffId,
    causationPolicyId,
    causalEvidenceByMetric={}
  }={}){
    const handoff=
      await global.INFINICUS.OM.attributionEvidenceEngine
        .getCausationAssessmentHandoff({
          causationAssessmentHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.causationAssessmentStore.get(
        "policies",
        causationPolicyId
      );

    if(!policy.ok) return policy;

    const evidenceRecords=[];
    const assessments=[];

    for(const attribution of handoff.data.attributionAssessments){
      const supplied=
        causalEvidenceByMetric[attribution.metricId] || {};

      const evidence={
        causalEvidenceId:
          runtime.createId("om_causal_evidence"),
        monitoringContractId:
          handoff.data.monitoringContractId,
        actionInstanceId:
          attribution.actionInstanceId,
        metricId:
          attribution.metricId,
        attributionAssessmentId:
          attribution.attributionAssessmentId,
        temporalOrder:
          supplied.temporalOrder === true,
        mechanismStrength:
          Number(supplied.mechanismStrength ?? 0),
        doseResponseStrength:
          Number(supplied.doseResponseStrength ?? 0),
        counterfactualStrength:
          Number(supplied.counterfactualStrength ?? 0),
        counterfactualReference:
          supplied.counterfactualReference || null,
        confounderStrength:
          Number(supplied.confounderStrength ?? 0),
        alternativeExplanationStrength:
          Number(supplied.alternativeExplanationStrength ?? 0),
        reproducibilityStrength:
          Number(supplied.reproducibilityStrength ?? 0),
        evidenceItems:
          runtime.clone(supplied.evidenceItems || []),
        unresolvedConfounders:
          runtime.clone(supplied.unresolvedConfounders || []),
        correlationId:
          handoff.data.correlationId,
        lineage:[
          ...handoff.data.lineage.map(runtime.clone),
          ...attribution.lineage.map(runtime.clone)
        ],
        confidence:
          Math.min(
            Number(supplied.confidence ?? 1),
            attribution.confidence,
            handoff.data.confidence
          ),
        createdAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.causationAssessmentStore.put(
        "evidence",
        evidence
      );

      const scored=
        global.INFINICUS.OM.causationScorer.score({
          attributionAssessment:attribution,
          evidence,
          policy:policy.data
        });

      const assessment={
        causationAssessmentId:
          runtime.createId("om_causation_assessment"),
        causalEvidenceId:
          evidence.causalEvidenceId,
        attributionAssessmentId:
          attribution.attributionAssessmentId,
        monitoringContractId:
          handoff.data.monitoringContractId,
        actionInstanceId:
          attribution.actionInstanceId,
        metricId:
          attribution.metricId,
        causalScore:
          scored.causalScore,
        baseScore:
          scored.baseScore,
        confounderPenalty:
          scored.confounderPenalty,
        alternativePenalty:
          scored.alternativePenalty,
        components:
          runtime.clone(scored.components),
        missingEvidence:
          runtime.clone(scored.missing),
        classification:
          scored.classification,
        causationEstablished:
          scored.causationEstablished,
        unresolvedConfounders:
          evidence.unresolvedConfounders.map(runtime.clone),
        confidence:
          Number(
            (
              evidence.confidence *
              scored.causalScore
            ).toFixed(4)
          ),
        correlationId:
          handoff.data.correlationId,
        lineage:
          evidence.lineage.map(runtime.clone),
        assessedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.causationAssessmentStore.put(
        "assessments",
        assessment
      );

      evidenceRecords.push(evidence);
      assessments.push(assessment);
    }

    const externalFactorHandoff={
      externalFactorHandoffId:
        runtime.createId("om_external_factor_handoff"),
      targetBlock:"OM-15",
      monitoringContractId:
        handoff.data.monitoringContractId,
      causalEvidence:
        evidenceRecords.map(runtime.clone),
      causationAssessments:
        assessments.map(runtime.clone),
      attributionAssessments:
        handoff.data.attributionAssessments.map(runtime.clone),
      alerts:
        handoff.data.alerts.map(runtime.clone),
      thresholdBreaches:
        handoff.data.thresholdBreaches.map(runtime.clone),
      variances:
        handoff.data.variances.map(runtime.clone),
      progressRecords:
        handoff.data.progressRecords.map(runtime.clone),
      unresolvedConfounders:
        assessments.flatMap(item=>
          item.unresolvedConfounders.map(runtime.clone)
        ),
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        assessments.length
          ? Number(
              (
                assessments.reduce(
                  (sum,item)=>sum+item.confidence,
                  0
                ) / assessments.length
              ).toFixed(4)
            )
          : 0,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.causationAssessmentStore.put(
      "external_factor_handoffs",
      externalFactorHandoff
    );

    await runtime.emit(
      "om.causation.assessed",
      {
        assessmentCount:assessments.length,
        externalFactorHandoffId:
          externalFactorHandoff.externalFactorHandoffId
      }
    );

    return runtime.success({
      causalEvidence:evidenceRecords,
      causationAssessments:assessments,
      externalFactorHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    assessCausation,
    getAssessment:({causationAssessmentId}) =>
      global.INFINICUS.OM.causationAssessmentStore.get(
        "assessments",
        causationAssessmentId
      ),
    getExternalFactorHandoff:({externalFactorHandoffId}) =>
      global.INFINICUS.OM.causationAssessmentStore.get(
        "external_factor_handoffs",
        externalFactorHandoffId
      ),
    listAssessments:() =>
      global.INFINICUS.OM.causationAssessmentStore.list(
        "assessments"
      )
  });

  runtime.registerService(
    "om.causation_assessment",
    api,
    {block:"OM-14"}
  );

  runtime.registerRoute(
    "om.causation_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.causation.assess",
    assessCausation
  );

  global.INFINICUS.OM.causationAssessmentEngine=api;
})(window);

/* ===== INFINICUS-OM-15-External-Factor-Confounder-Engine ===== */

/* --- outcome-monitoring/INFINICUS-OM-15-External-Factor-Confounder-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;
  if(!OM?.runtime) throw new Error("OM-01 must be loaded before OM-15.");
  if(!OM?.causationAssessmentEngine){
    throw new Error("OM-14 must be loaded before OM-15.");
  }
})(window);

/* --- outcome-monitoring/INFINICUS-OM-15-External-Factor-Confounder-Engine/src/model/external-factor.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.factorType){
      return runtime.failure(
        "OM_EXTERNAL_FACTOR_INVALID",
        "External factor name and factorType are required."
      );
    }

    return runtime.success({
      externalFactorId:
        input.externalFactorId ||
        runtime.createId("om_external_factor"),
      name:String(input.name),
      factorType:String(input.factorType),
      description:String(input.description || ""),
      affectedMetricIds:
        runtime.clone(input.affectedMetricIds || []),
      startsAt:input.startsAt || null,
      endsAt:input.endsAt || null,
      direction:String(input.direction || "unknown"),
      magnitude:
        Math.max(0,Math.min(1,Number(input.magnitude ?? 0))),
      confidence:
        Math.max(0,Math.min(1,Number(input.confidence ?? 0.5))),
      evidence:
        runtime.clone(input.evidence || []),
      lineage:
        runtime.clone(input.lineage || []),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.externalFactorModel=
    Object.freeze({create});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-15-External-Factor-Confounder-Engine/src/scoring/confounder-scorer.js --- */
(function(global){
  "use strict";

  const bounded=value=>
    Math.max(0,Math.min(1,Number(value || 0)));

  function overlapScore({
    factorStartsAt,
    factorEndsAt,
    outcomeStartsAt,
    outcomeEndsAt
  }={}){
    if(!factorStartsAt || !outcomeStartsAt){
      return 0;
    }

    const fs=new Date(factorStartsAt).getTime();
    const fe=new Date(factorEndsAt || factorStartsAt).getTime();
    const os=new Date(outcomeStartsAt).getTime();
    const oe=new Date(outcomeEndsAt || outcomeStartsAt).getTime();

    const overlap=Math.max(0,Math.min(fe,oe)-Math.max(fs,os));
    const outcomeDuration=Math.max(1,oe-os);

    return bounded(overlap/outcomeDuration);
  }

  function score({
    factor,
    overlap,
    scopeAlignment=0,
    mechanismStrength=0
  }={}){
    const magnitude=bounded(factor.magnitude);
    const confidence=bounded(factor.confidence);
    const scope=bounded(scopeAlignment);
    const mechanism=bounded(mechanismStrength);

    const materiality=
      magnitude*0.35 +
      confidence*0.25 +
      bounded(overlap)*0.25 +
      scope*0.1 +
      mechanism*0.05;

    let classification="immaterial";

    if(materiality>=0.75){
      classification="major_confounder";
    }else if(materiality>=0.5){
      classification="material_confounder";
    }else if(materiality>=0.25){
      classification="minor_confounder";
    }

    return {
      materiality:Number(materiality.toFixed(4)),
      classification
    };
  }

  global.INFINICUS.OM.confounderScorer=
    Object.freeze({overlapScore,score});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-15-External-Factor-Confounder-Engine/src/storage/external-factor-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_EXTERNAL_FACTORS";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;

        for(const [name,keyPath] of [
          ["factors","externalFactorId"],
          ["assessments","externalFactorAssessmentId"],
          ["confounders","confounderAssessmentId"],
          ["comparison_handoffs","expectedActualComparisonHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
          }
        }
      };

      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "OM_EXTERNAL_FACTOR_STORAGE_ERROR",
        error?.message || "External-factor storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_EXTERNAL_FACTOR_RECORD_NOT_FOUND",
            "External-factor record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_EXTERNAL_FACTOR_STORAGE_ERROR",
        error?.message || "External-factor retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "OM_EXTERNAL_FACTOR_STORAGE_ERROR",
        error?.message || "External-factor listing failed."
      );
    }
  }

  global.INFINICUS.OM.externalFactorStore=
    Object.freeze({open,put,get,list});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-15-External-Factor-Confounder-Engine/src/engine/external-factor-confounder-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerFactor(input={}){
    const built=
      global.INFINICUS.OM.externalFactorModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.externalFactorStore.put(
      "factors",
      built.data
    );
  }

  async function evaluate({
    externalFactorHandoffId,
    factorContextsByMetric={}
  }={}){
    const handoff=
      await global.INFINICUS.OM.causationAssessmentEngine
        .getExternalFactorHandoff({
          externalFactorHandoffId
        });

    if(!handoff.ok) return handoff;

    const factors=
      await global.INFINICUS.OM.externalFactorStore.list(
        "factors"
      );

    if(!factors.ok) return factors;

    const factorAssessments=[];
    const confounders=[];

    for(const causation of handoff.data.causationAssessments){
      const context=
        factorContextsByMetric[causation.metricId] || {};

      for(const factor of factors.data){
        if(
          factor.affectedMetricIds.length &&
          !factor.affectedMetricIds.includes(causation.metricId)
        ){
          continue;
        }

        const overlap=
          global.INFINICUS.OM.confounderScorer.overlapScore({
            factorStartsAt:factor.startsAt,
            factorEndsAt:factor.endsAt,
            outcomeStartsAt:context.outcomeStartsAt,
            outcomeEndsAt:context.outcomeEndsAt
          });

        const scored=
          global.INFINICUS.OM.confounderScorer.score({
            factor,
            overlap,
            scopeAlignment:
              context.scopeAlignmentByFactor?.[factor.externalFactorId] ?? 0,
            mechanismStrength:
              context.mechanismStrengthByFactor?.[factor.externalFactorId] ?? 0
          });

        const assessment={
          externalFactorAssessmentId:
            runtime.createId("om_external_factor_assessment"),
          monitoringContractId:
            handoff.data.monitoringContractId,
          metricId:
            causation.metricId,
          causationAssessmentId:
            causation.causationAssessmentId,
          externalFactorId:
            factor.externalFactorId,
          overlapScore:
            Number(overlap.toFixed(4)),
          materiality:
            scored.materiality,
          classification:
            scored.classification,
          direction:
            factor.direction,
          confidence:
            Math.min(
              factor.confidence,
              causation.confidence,
              handoff.data.confidence
            ),
          evidence:
            factor.evidence.map(runtime.clone),
          correlationId:
            handoff.data.correlationId,
          lineage:[
            ...handoff.data.lineage.map(runtime.clone),
            ...factor.lineage.map(runtime.clone)
          ],
          assessedAt:new Date().toISOString()
        };

        await global.INFINICUS.OM.externalFactorStore.put(
          "assessments",
          assessment
        );

        factorAssessments.push(assessment);

        if(
          ["material_confounder","major_confounder"].includes(
            scored.classification
          )
        ){
          const confounder={
            confounderAssessmentId:
              runtime.createId("om_confounder"),
            monitoringContractId:
              handoff.data.monitoringContractId,
            metricId:
              causation.metricId,
            causationAssessmentId:
              causation.causationAssessmentId,
            externalFactorAssessmentId:
              assessment.externalFactorAssessmentId,
            externalFactorId:
              factor.externalFactorId,
            materiality:
              assessment.materiality,
            classification:
              assessment.classification,
            direction:
              assessment.direction,
            recommendedAdjustment:
              Number(
                (
                  assessment.materiality *
                  (
                    assessment.direction==="positive"
                      ? -1
                      : assessment.direction==="negative"
                        ? 1
                        : 0
                  )
                ).toFixed(4)
              ),
            confidence:
              assessment.confidence,
            status:"active",
            createdAt:new Date().toISOString()
          };

          await global.INFINICUS.OM.externalFactorStore.put(
            "confounders",
            confounder
          );

          confounders.push(confounder);
        }
      }
    }

    const residualConfoundingScore=
      confounders.length
        ? Number(
            (
              confounders.reduce(
                (sum,item)=>sum+item.materiality*item.confidence,
                0
              ) / confounders.length
            ).toFixed(4)
          )
        : 0;

    const comparisonHandoff={
      expectedActualComparisonHandoffId:
        runtime.createId("om_expected_actual_handoff"),
      targetBlock:"OM-16",
      monitoringContractId:
        handoff.data.monitoringContractId,
      causationAssessments:
        handoff.data.causationAssessments.map(runtime.clone),
      attributionAssessments:
        handoff.data.attributionAssessments.map(runtime.clone),
      externalFactorAssessments:
        factorAssessments.map(runtime.clone),
      confounders:
        confounders.map(runtime.clone),
      residualConfoundingScore,
      progressRecords:
        handoff.data.progressRecords.map(runtime.clone),
      alerts:
        handoff.data.alerts.map(runtime.clone),
      thresholdBreaches:
        handoff.data.thresholdBreaches.map(runtime.clone),
      variances:
        handoff.data.variances.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        Math.max(
          0,
          Number(
            (
              handoff.data.confidence *
              (1-Math.min(1,residualConfoundingScore))
            ).toFixed(4)
          )
        ),
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.externalFactorStore.put(
      "comparison_handoffs",
      comparisonHandoff
    );

    await runtime.emit(
      "om.external_factors.evaluated",
      {
        factorAssessmentCount:
          factorAssessments.length,
        confounderCount:
          confounders.length,
        expectedActualComparisonHandoffId:
          comparisonHandoff.expectedActualComparisonHandoffId
      }
    );

    return runtime.success({
      externalFactorAssessments:factorAssessments,
      confounders,
      residualConfoundingScore,
      expectedActualComparisonHandoff:comparisonHandoff
    });
  }

  const api=Object.freeze({
    registerFactor,
    evaluate,
    getFactor:({externalFactorId}) =>
      global.INFINICUS.OM.externalFactorStore.get(
        "factors",
        externalFactorId
      ),
    getExpectedActualComparisonHandoff:({
      expectedActualComparisonHandoffId
    }) =>
      global.INFINICUS.OM.externalFactorStore.get(
        "comparison_handoffs",
        expectedActualComparisonHandoffId
      ),
    listFactors:() =>
      global.INFINICUS.OM.externalFactorStore.list("factors"),
    listConfounders:() =>
      global.INFINICUS.OM.externalFactorStore.list("confounders")
  });

  runtime.registerService(
    "om.external_factor_confounder",
    api,
    {block:"OM-15"}
  );

  runtime.registerRoute(
    "om.external_factor.register",
    registerFactor
  );

  runtime.registerRoute(
    "om.external_factors.evaluate",
    evaluate
  );

  global.INFINICUS.OM.externalFactorConfounderEngine=api;
})(window);

/* ===== INFINICUS-OM-16-Expected-versus-Actual-Comparison-Engine ===== */

/* --- outcome-monitoring/INFINICUS-OM-16-Expected-versus-Actual-Comparison-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;
  if(!OM?.runtime) throw new Error("OM-01 must be loaded before OM-16.");
  if(!OM?.externalFactorConfounderEngine){
    throw new Error("OM-15 must be loaded before OM-16.");
  }
})(window);

/* --- outcome-monitoring/INFINICUS-OM-16-Expected-versus-Actual-Comparison-Engine/src/model/comparison-policy.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_COMPARISON_POLICY_INVALID",
        "Comparison policy name and code are required."
      );
    }

    return runtime.success({
      expectedActualComparisonPolicyId:
        input.expectedActualComparisonPolicyId ||
        runtime.createId("om_comparison_policy"),
      name:String(input.name),
      code:String(input.code),
      achievementThreshold:
        Math.max(0,Math.min(2,Number(input.achievementThreshold ?? 1))),
      acceptableThreshold:
        Math.max(0,Math.min(2,Number(input.acceptableThreshold ?? 0.85))),
      underperformanceThreshold:
        Math.max(0,Math.min(2,Number(input.underperformanceThreshold ?? 0.6))),
      applyConfounderAdjustment:
        input.applyConfounderAdjustment !== false,
      requireCausalContext:
        Boolean(input.requireCausalContext),
      minimumConfidence:
        Math.max(0,Math.min(1,Number(input.minimumConfidence ?? 0.5))),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.expectedActualComparisonPolicyModel=
    Object.freeze({create});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-16-Expected-versus-Actual-Comparison-Engine/src/calculation/comparison-calculator.js --- */
(function(global){
  "use strict";

  function calculate({
    expected,
    actual,
    direction,
    minimumAcceptableValue,
    maximumAcceptableValue
  }={}){
    const e=Number(expected);
    const a=Number(actual);

    if(!Number.isFinite(e) || !Number.isFinite(a)){
      return {
        valid:false,
        issues:["Expected and actual values must be finite numbers."]
      };
    }

    const absoluteGap=a-e;
    const percentageGap=e===0 ? null : (absoluteGap/Math.abs(e))*100;

    let achievementRatio=0;
    let achieved=false;
    let withinAcceptableRange=false;

    switch(direction){
      case "decrease":
        achievementRatio=a===0 ? 1 : e/a;
        achieved=a<=e;
        break;

      case "maintain":
        achievementRatio=
          Math.max(0,1-Math.abs(a-e)/(Math.abs(e)||1));
        achieved=a===e;
        break;

      case "range":{
        const min=
          minimumAcceptableValue==null
            ? e
            : Number(minimumAcceptableValue);
        const max=
          maximumAcceptableValue==null
            ? e
            : Number(maximumAcceptableValue);

        withinAcceptableRange=a>=min && a<=max;
        achieved=withinAcceptableRange;
        achievementRatio=withinAcceptableRange ? 1 : 0;
        break;
      }

      case "increase":
      default:
        achievementRatio=e===0 ? (a>=e ? 1 : 0) : a/e;
        achieved=a>=e;
        break;
    }

    return {
      valid:true,
      expectedValue:e,
      actualValue:a,
      absoluteGap:Number(absoluteGap.toFixed(6)),
      percentageGap:
        percentageGap==null
          ? null
          : Number(percentageGap.toFixed(2)),
      achievementRatio:Number(achievementRatio.toFixed(6)),
      achieved,
      withinAcceptableRange,
      issues:[]
    };
  }

  global.INFINICUS.OM.expectedActualComparisonCalculator=
    Object.freeze({calculate});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-16-Expected-versus-Actual-Comparison-Engine/src/storage/comparison-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_EXPECTED_ACTUAL_COMPARISON";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;

        for(const [name,keyPath] of [
          ["policies","expectedActualComparisonPolicyId"],
          ["comparisons","expectedActualComparisonId"],
          ["interpretations","outcomeComparisonInterpretationId"],
          ["confidence_handoffs","confidenceReliabilityHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
          }
        }
      };

      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "OM_COMPARISON_STORAGE_ERROR",
        error?.message || "Comparison storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_COMPARISON_RECORD_NOT_FOUND",
            "Comparison record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_COMPARISON_STORAGE_ERROR",
        error?.message || "Comparison retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "OM_COMPARISON_STORAGE_ERROR",
        error?.message || "Comparison listing failed."
      );
    }
  }

  global.INFINICUS.OM.expectedActualComparisonStore=
    Object.freeze({open,put,get,list});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-16-Expected-versus-Actual-Comparison-Engine/src/engine/expected-actual-comparison-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.expectedActualComparisonPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.expectedActualComparisonStore.put(
      "policies",
      built.data
    );
  }

  function classify({
    achievementRatio,
    achieved,
    confidence,
    policy
  }){
    if(confidence<policy.minimumConfidence){
      return "low_confidence";
    }

    if(achieved || achievementRatio>=policy.achievementThreshold){
      return "achieved";
    }

    if(achievementRatio>=policy.acceptableThreshold){
      return "acceptable";
    }

    if(achievementRatio>=policy.underperformanceThreshold){
      return "underperforming";
    }

    return "failed";
  }

  async function compare({
    expectedActualComparisonHandoffId,
    expectedActualComparisonPolicyId
  }={}){
    const handoff=
      await global.INFINICUS.OM.externalFactorConfounderEngine
        .getExpectedActualComparisonHandoff({
          expectedActualComparisonHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.expectedActualComparisonStore.get(
        "policies",
        expectedActualComparisonPolicyId
      );

    if(!policy.ok) return policy;

    const comparisons=[];
    const interpretations=[];

    for(const progress of handoff.data.progressRecords){
      const causation=
        handoff.data.causationAssessments.find(
          item=>item.metricId===progress.metricId
        );

      const attribution=
        handoff.data.attributionAssessments.find(
          item=>item.metricId===progress.metricId
        );

      const metricConfounders=
        handoff.data.confounders.filter(
          item=>item.metricId===progress.metricId
        );

      const calculated=
        global.INFINICUS.OM.expectedActualComparisonCalculator.calculate({
          expected:progress.targetValue,
          actual:progress.currentValue,
          direction:progress.direction
        });

      if(!calculated.valid){
        return runtime.failure(
          "OM_EXPECTED_ACTUAL_COMPARISON_FAILED",
          "Expected-versus-actual comparison failed.",
          {
            metricId:progress.metricId,
            issues:calculated.issues
          }
        );
      }

      const rawConfidence=
        Math.min(
          progress.confidence,
          attribution?.confidence ?? 1,
          causation?.confidence ?? 1,
          handoff.data.confidence
        );

      const confounderPenalty=
        policy.data.applyConfounderAdjustment
          ? Math.min(
              1,
              metricConfounders.reduce(
                (sum,item)=>sum+item.materiality*item.confidence,
                0
              )
            )
          : 0;

      const adjustedConfidence=
        Number(
          (
            rawConfidence *
            (1-confounderPenalty)
          ).toFixed(4)
        );

      const status=
        classify({
          achievementRatio:calculated.achievementRatio,
          achieved:calculated.achieved,
          confidence:adjustedConfidence,
          policy:policy.data
        });

      const comparison={
        expectedActualComparisonId:
          runtime.createId("om_expected_actual_comparison"),
        monitoringContractId:
          handoff.data.monitoringContractId,
        metricId:
          progress.metricId,
        outcomeProgressId:
          progress.outcomeProgressId,
        expectedValue:
          calculated.expectedValue,
        actualValue:
          calculated.actualValue,
        absoluteGap:
          calculated.absoluteGap,
        percentageGap:
          calculated.percentageGap,
        achievementRatio:
          calculated.achievementRatio,
        achieved:
          calculated.achieved,
        rawConfidence,
        confounderPenalty:
          Number(confounderPenalty.toFixed(4)),
        adjustedConfidence,
        causationClassification:
          causation?.classification || "not_assessed",
        attributionClassification:
          attribution?.classification || "not_assessed",
        classification:"calculated",
        outcomeStatus:status,
        correlationId:
          handoff.data.correlationId,
        lineage:[
          ...handoff.data.lineage.map(runtime.clone),
          ...progress.lineage.map(runtime.clone)
        ],
        comparedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.expectedActualComparisonStore.put(
        "comparisons",
        comparison
      );

      const interpretation={
        outcomeComparisonInterpretationId:
          runtime.createId("om_comparison_interpretation"),
        expectedActualComparisonId:
          comparison.expectedActualComparisonId,
        metricId:
          progress.metricId,
        outcomeStatus:
          status,
        causalInterpretation:
          causation?.causationEstablished === true
            ? "causal_support_present"
            : "causation_not_established",
        confounderContext:
          metricConfounders.map(runtime.clone),
        adjustedConfidence,
        createdAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.expectedActualComparisonStore.put(
        "interpretations",
        interpretation
      );

      comparisons.push(comparison);
      interpretations.push(interpretation);
    }

    const confidenceHandoff={
      confidenceReliabilityHandoffId:
        runtime.createId("om_confidence_reliability_handoff"),
      targetBlock:"OM-17",
      monitoringContractId:
        handoff.data.monitoringContractId,
      comparisons:
        comparisons.map(runtime.clone),
      interpretations:
        interpretations.map(runtime.clone),
      causationAssessments:
        handoff.data.causationAssessments.map(runtime.clone),
      attributionAssessments:
        handoff.data.attributionAssessments.map(runtime.clone),
      externalFactorAssessments:
        handoff.data.externalFactorAssessments.map(runtime.clone),
      confounders:
        handoff.data.confounders.map(runtime.clone),
      residualConfoundingScore:
        handoff.data.residualConfoundingScore,
      progressRecords:
        handoff.data.progressRecords.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        comparisons.length
          ? Number(
              (
                comparisons.reduce(
                  (sum,item)=>sum+item.adjustedConfidence,
                  0
                ) / comparisons.length
              ).toFixed(4)
            )
          : 0,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.expectedActualComparisonStore.put(
      "confidence_handoffs",
      confidenceHandoff
    );

    await runtime.emit(
      "om.expected_actual.compared",
      {
        comparisonCount:comparisons.length,
        confidenceReliabilityHandoffId:
          confidenceHandoff.confidenceReliabilityHandoffId
      }
    );

    return runtime.success({
      comparisons,
      interpretations,
      confidenceReliabilityHandoff:confidenceHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    compare,
    getComparison:({expectedActualComparisonId}) =>
      global.INFINICUS.OM.expectedActualComparisonStore.get(
        "comparisons",
        expectedActualComparisonId
      ),
    getConfidenceReliabilityHandoff:({
      confidenceReliabilityHandoffId
    }) =>
      global.INFINICUS.OM.expectedActualComparisonStore.get(
        "confidence_handoffs",
        confidenceReliabilityHandoffId
      ),
    listComparisons:() =>
      global.INFINICUS.OM.expectedActualComparisonStore.list(
        "comparisons"
      )
  });

  runtime.registerService(
    "om.expected_actual_comparison",
    api,
    {block:"OM-16"}
  );

  runtime.registerRoute(
    "om.expected_actual_comparison_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.expected_actual.compare",
    compare
  );

  global.INFINICUS.OM.expectedActualComparisonEngine=api;
})(window);

/* ===== INFINICUS-OM-17-Outcome-Confidence-Reliability-Engine ===== */

/* --- outcome-monitoring/INFINICUS-OM-17-Outcome-Confidence-Reliability-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;
  if(!OM?.runtime) throw new Error("OM-01 must be loaded before OM-17.");
  if(!OM?.expectedActualComparisonEngine){
    throw new Error("OM-16 must be loaded before OM-17.");
  }
})(window);

/* --- outcome-monitoring/INFINICUS-OM-17-Outcome-Confidence-Reliability-Engine/src/model/confidence-policy.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_CONFIDENCE_POLICY_INVALID",
        "Confidence policy name and code are required."
      );
    }

    return runtime.success({
      outcomeConfidencePolicyId:
        input.outcomeConfidencePolicyId ||
        runtime.createId("om_confidence_policy"),
      name:String(input.name),
      code:String(input.code),
      weights:runtime.clone(input.weights || {
        comparisonConfidence:0.25,
        attributionConfidence:0.15,
        causationConfidence:0.2,
        sourceReliability:0.15,
        sampleSufficiency:0.1,
        temporalCoverage:0.1,
        evidenceCompleteness:0.05
      }),
      confounderPenaltyWeight:
        Math.max(0,Math.min(1,Number(input.confounderPenaltyWeight ?? 0.3))),
      missingEvidencePenalty:
        Math.max(0,Math.min(1,Number(input.missingEvidencePenalty ?? 0.1))),
      highThreshold:
        Math.max(0,Math.min(1,Number(input.highThreshold ?? 0.8))),
      mediumThreshold:
        Math.max(0,Math.min(1,Number(input.mediumThreshold ?? 0.6))),
      reliabilityHighThreshold:
        Math.max(0,Math.min(1,Number(input.reliabilityHighThreshold ?? 0.8))),
      reliabilityMediumThreshold:
        Math.max(0,Math.min(1,Number(input.reliabilityMediumThreshold ?? 0.6))),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.outcomeConfidencePolicyModel=
    Object.freeze({create});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-17-Outcome-Confidence-Reliability-Engine/src/scoring/confidence-reliability-scorer.js --- */
(function(global){
  "use strict";

  const bounded=value=>
    Math.max(0,Math.min(1,Number(value || 0)));

  function band(value,high,medium){
    if(value>=high) return "high";
    if(value>=medium) return "medium";
    return "low";
  }

  function score({
    dimensions,
    residualConfoundingScore,
    missingEvidenceCount,
    policy
  }={}){
    const totalWeight=
      Object.values(policy.weights).reduce(
        (sum,value)=>sum+Number(value || 0),
        0
      ) || 1;

    const baseConfidence=
      Object.entries(policy.weights).reduce(
        (sum,[key,weight])=>
          sum+bounded(dimensions[key])*Number(weight || 0),
        0
      ) / totalWeight;

    const confounderPenalty=
      bounded(residualConfoundingScore) *
      policy.confounderPenaltyWeight;

    const missingPenalty=
      Math.min(
        1,
        Number(missingEvidenceCount || 0) *
        policy.missingEvidencePenalty
      );

    const confidence=
      Math.max(
        0,
        Math.min(
          1,
          baseConfidence-confounderPenalty-missingPenalty
        )
      );

    const reliability=
      Math.max(
        0,
        Math.min(
          1,
          (
            bounded(dimensions.sourceReliability)*0.35 +
            bounded(dimensions.sampleSufficiency)*0.25 +
            bounded(dimensions.temporalCoverage)*0.2 +
            bounded(dimensions.evidenceCompleteness)*0.2
          ) -
          confounderPenalty*0.5
        )
      );

    return {
      baseConfidence:Number(baseConfidence.toFixed(4)),
      confounderPenalty:Number(confounderPenalty.toFixed(4)),
      missingPenalty:Number(missingPenalty.toFixed(4)),
      confidenceScore:Number(confidence.toFixed(4)),
      reliabilityScore:Number(reliability.toFixed(4)),
      confidenceBand:
        band(
          confidence,
          policy.highThreshold,
          policy.mediumThreshold
        ),
      reliabilityBand:
        band(
          reliability,
          policy.reliabilityHighThreshold,
          policy.reliabilityMediumThreshold
        )
    };
  }

  global.INFINICUS.OM.confidenceReliabilityScorer=
    Object.freeze({score});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-17-Outcome-Confidence-Reliability-Engine/src/storage/confidence-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_CONFIDENCE_RELIABILITY";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;

        for(const [name,keyPath] of [
          ["policies","outcomeConfidencePolicyId"],
          ["ratings","outcomeConfidenceRatingId"],
          ["reliability","outcomeReliabilityRatingId"],
          ["benefit_handoffs","benefitRealizationHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
          }
        }
      };

      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "OM_CONFIDENCE_STORAGE_ERROR",
        error?.message || "Confidence storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_CONFIDENCE_RECORD_NOT_FOUND",
            "Confidence record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_CONFIDENCE_STORAGE_ERROR",
        error?.message || "Confidence retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "OM_CONFIDENCE_STORAGE_ERROR",
        error?.message || "Confidence listing failed."
      );
    }
  }

  global.INFINICUS.OM.outcomeConfidenceStore=
    Object.freeze({open,put,get,list});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-17-Outcome-Confidence-Reliability-Engine/src/engine/outcome-confidence-reliability-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.outcomeConfidencePolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.outcomeConfidenceStore.put(
      "policies",
      built.data
    );
  }

  async function rate({
    confidenceReliabilityHandoffId,
    outcomeConfidencePolicyId,
    evidenceDimensionsByMetric={}
  }={}){
    const handoff=
      await global.INFINICUS.OM.expectedActualComparisonEngine
        .getConfidenceReliabilityHandoff({
          confidenceReliabilityHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.outcomeConfidenceStore.get(
        "policies",
        outcomeConfidencePolicyId
      );

    if(!policy.ok) return policy;

    const ratings=[];
    const reliabilityRatings=[];

    for(const comparison of handoff.data.comparisons){
      const attribution=
        handoff.data.attributionAssessments.find(
          item=>item.metricId===comparison.metricId
        );

      const causation=
        handoff.data.causationAssessments.find(
          item=>item.metricId===comparison.metricId
        );

      const supplied=
        evidenceDimensionsByMetric[comparison.metricId] || {};

      const dimensions={
        comparisonConfidence:
          comparison.adjustedConfidence,
        attributionConfidence:
          attribution?.confidence ?? 0,
        causationConfidence:
          causation?.confidence ?? 0,
        sourceReliability:
          Number(supplied.sourceReliability ?? 0.7),
        sampleSufficiency:
          Number(supplied.sampleSufficiency ?? 0.5),
        temporalCoverage:
          Number(supplied.temporalCoverage ?? 0.5),
        evidenceCompleteness:
          Number(supplied.evidenceCompleteness ?? 0.5)
      };

      const missingEvidenceCount=
        Object.values(dimensions).filter(
          value=>Number(value)<=0
        ).length;

      const scored=
        global.INFINICUS.OM.confidenceReliabilityScorer.score({
          dimensions,
          residualConfoundingScore:
            handoff.data.residualConfoundingScore,
          missingEvidenceCount,
          policy:policy.data
        });

      const rating={
        outcomeConfidenceRatingId:
          runtime.createId("om_outcome_confidence"),
        monitoringContractId:
          handoff.data.monitoringContractId,
        metricId:
          comparison.metricId,
        expectedActualComparisonId:
          comparison.expectedActualComparisonId,
        outcomeStatus:
          comparison.outcomeStatus,
        dimensions:
          runtime.clone(dimensions),
        baseConfidence:
          scored.baseConfidence,
        confounderPenalty:
          scored.confounderPenalty,
        missingEvidencePenalty:
          scored.missingPenalty,
        confidenceScore:
          scored.confidenceScore,
        confidenceBand:
          scored.confidenceBand,
        correlationId:
          handoff.data.correlationId,
        lineage:[
          ...handoff.data.lineage.map(runtime.clone),
          ...comparison.lineage.map(runtime.clone)
        ],
        ratedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.outcomeConfidenceStore.put(
        "ratings",
        rating
      );

      const reliability={
        outcomeReliabilityRatingId:
          runtime.createId("om_outcome_reliability"),
        outcomeConfidenceRatingId:
          rating.outcomeConfidenceRatingId,
        metricId:
          comparison.metricId,
        reliabilityScore:
          scored.reliabilityScore,
        reliabilityBand:
          scored.reliabilityBand,
        dimensions:{
          sourceReliability:
            dimensions.sourceReliability,
          sampleSufficiency:
            dimensions.sampleSufficiency,
          temporalCoverage:
            dimensions.temporalCoverage,
          evidenceCompleteness:
            dimensions.evidenceCompleteness
        },
        ratedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.outcomeConfidenceStore.put(
        "reliability",
        reliability
      );

      ratings.push(rating);
      reliabilityRatings.push(reliability);
    }

    const benefitHandoff={
      benefitRealizationHandoffId:
        runtime.createId("om_benefit_realization_handoff"),
      targetBlock:"OM-18",
      monitoringContractId:
        handoff.data.monitoringContractId,
      comparisons:
        handoff.data.comparisons.map(runtime.clone),
      interpretations:
        handoff.data.interpretations.map(runtime.clone),
      confidenceRatings:
        ratings.map(runtime.clone),
      reliabilityRatings:
        reliabilityRatings.map(runtime.clone),
      causationAssessments:
        handoff.data.causationAssessments.map(runtime.clone),
      attributionAssessments:
        handoff.data.attributionAssessments.map(runtime.clone),
      confounders:
        handoff.data.confounders.map(runtime.clone),
      residualConfoundingScore:
        handoff.data.residualConfoundingScore,
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        ratings.length
          ? Number(
              (
                ratings.reduce(
                  (sum,item)=>sum+item.confidenceScore,
                  0
                ) / ratings.length
              ).toFixed(4)
            )
          : 0,
      reliability:
        reliabilityRatings.length
          ? Number(
              (
                reliabilityRatings.reduce(
                  (sum,item)=>sum+item.reliabilityScore,
                  0
                ) / reliabilityRatings.length
              ).toFixed(4)
            )
          : 0,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.outcomeConfidenceStore.put(
      "benefit_handoffs",
      benefitHandoff
    );

    await runtime.emit(
      "om.outcome_confidence.rated",
      {
        ratingCount:ratings.length,
        benefitRealizationHandoffId:
          benefitHandoff.benefitRealizationHandoffId
      }
    );

    return runtime.success({
      confidenceRatings:ratings,
      reliabilityRatings,
      benefitRealizationHandoff:benefitHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    rate,
    getConfidenceRating:({outcomeConfidenceRatingId}) =>
      global.INFINICUS.OM.outcomeConfidenceStore.get(
        "ratings",
        outcomeConfidenceRatingId
      ),
    getBenefitRealizationHandoff:({
      benefitRealizationHandoffId
    }) =>
      global.INFINICUS.OM.outcomeConfidenceStore.get(
        "benefit_handoffs",
        benefitRealizationHandoffId
      ),
    listConfidenceRatings:() =>
      global.INFINICUS.OM.outcomeConfidenceStore.list(
        "ratings"
      ),
    listReliabilityRatings:() =>
      global.INFINICUS.OM.outcomeConfidenceStore.list(
        "reliability"
      )
  });

  runtime.registerService(
    "om.outcome_confidence_reliability",
    api,
    {block:"OM-17"}
  );

  runtime.registerRoute(
    "om.outcome_confidence_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.outcome_confidence.rate",
    rate
  );

  global.INFINICUS.OM.outcomeConfidenceReliabilityEngine=api;
})(window);

/* ===== INFINICUS-OM-18-Benefit-Realization-Engine ===== */

/* --- outcome-monitoring/INFINICUS-OM-18-Benefit-Realization-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;
  if(!OM?.runtime) throw new Error("OM-01 must be loaded before OM-18.");
  if(!OM?.outcomeConfidenceReliabilityEngine){
    throw new Error("OM-17 must be loaded before OM-18.");
  }
})(window);

/* --- outcome-monitoring/INFINICUS-OM-18-Benefit-Realization-Engine/src/model/benefit-policy.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_BENEFIT_POLICY_INVALID",
        "Benefit policy name and code are required."
      );
    }

    return runtime.success({
      benefitRealizationPolicyId:
        input.benefitRealizationPolicyId ||
        runtime.createId("om_benefit_policy"),
      name:String(input.name),
      code:String(input.code),
      minimumConfidence:
        Math.max(0,Math.min(1,Number(input.minimumConfidence ?? 0.6))),
      minimumReliability:
        Math.max(0,Math.min(1,Number(input.minimumReliability ?? 0.6))),
      realizedThreshold:
        Math.max(0,Math.min(2,Number(input.realizedThreshold ?? 1))),
      partialThreshold:
        Math.max(0,Math.min(2,Number(input.partialThreshold ?? 0.5))),
      sustainabilityMinimum:
        Math.max(0,Math.min(1,Number(input.sustainabilityMinimum ?? 0.5))),
      requireCostEvidence:
        input.requireCostEvidence !== false,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.benefitRealizationPolicyModel=
    Object.freeze({create});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-18-Benefit-Realization-Engine/src/calculation/benefit-calculator.js --- */
(function(global){
  "use strict";

  function calculate({
    expectedBenefit,
    actualBenefit,
    actionCost,
    startedAt,
    realizedAt,
    sustainabilityScore
  }={}){
    const expected=Number(expectedBenefit);
    const actual=Number(actualBenefit);
    const cost=Number(actionCost);

    if(!Number.isFinite(expected) || !Number.isFinite(actual)){
      return {
        valid:false,
        issues:["Expected and actual benefit values must be finite numbers."]
      };
    }

    if(!Number.isFinite(cost) || cost<0){
      return {
        valid:false,
        issues:["Action cost must be a non-negative finite number."]
      };
    }

    const realizationRatio=
      expected===0
        ? (actual>0 ? 1 : 0)
        : actual/expected;

    const netBenefit=actual-cost;
    const benefitCostRatio=
      cost===0
        ? (actual>0 ? null : 0)
        : actual/cost;

    const timeToBenefitDays=
      startedAt && realizedAt
        ? Math.max(
            0,
            (
              new Date(realizedAt).getTime() -
              new Date(startedAt).getTime()
            ) / 86400000
          )
        : null;

    return {
      valid:true,
      expectedBenefit:expected,
      actualBenefit:actual,
      actionCost:cost,
      realizationRatio:Number(realizationRatio.toFixed(6)),
      realizationPercent:Number((realizationRatio*100).toFixed(2)),
      netBenefit:Number(netBenefit.toFixed(6)),
      benefitCostRatio:
        benefitCostRatio==null
          ? null
          : Number(benefitCostRatio.toFixed(6)),
      timeToBenefitDays:
        timeToBenefitDays==null
          ? null
          : Number(timeToBenefitDays.toFixed(2)),
      sustainabilityScore:
        Math.max(0,Math.min(1,Number(sustainabilityScore ?? 0))),
      issues:[]
    };
  }

  global.INFINICUS.OM.benefitRealizationCalculator=
    Object.freeze({calculate});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-18-Benefit-Realization-Engine/src/storage/benefit-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_BENEFIT_REALIZATION";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;
        for(const [name,keyPath] of [
          ["policies","benefitRealizationPolicyId"],
          ["definitions","benefitDefinitionId"],
          ["assessments","benefitRealizationAssessmentId"],
          ["adverse_handoffs","adverseOutcomeHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
          }
        }
      };

      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "OM_BENEFIT_STORAGE_ERROR",
        error?.message || "Benefit storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_BENEFIT_RECORD_NOT_FOUND",
            "Benefit record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_BENEFIT_STORAGE_ERROR",
        error?.message || "Benefit retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "OM_BENEFIT_STORAGE_ERROR",
        error?.message || "Benefit listing failed."
      );
    }
  }

  global.INFINICUS.OM.benefitRealizationStore=
    Object.freeze({open,put,get,list});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-18-Benefit-Realization-Engine/src/engine/benefit-realization-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.benefitRealizationPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.benefitRealizationStore.put(
      "policies",
      built.data
    );
  }

  async function registerBenefitDefinition(input={}){
    if(!input.metricId || !input.benefitType){
      return runtime.failure(
        "OM_BENEFIT_DEFINITION_INVALID",
        "Metric ID and benefit type are required."
      );
    }

    const definition={
      benefitDefinitionId:
        input.benefitDefinitionId ||
        runtime.createId("om_benefit_definition"),
      metricId:String(input.metricId),
      benefitType:String(input.benefitType),
      expectedBenefit:Number(input.expectedBenefit ?? 0),
      actionCost:Number(input.actionCost ?? 0),
      currency:input.currency || null,
      unit:input.unit || null,
      startedAt:input.startedAt || null,
      sustainabilityEvidence:
        runtime.clone(input.sustainabilityEvidence || []),
      createdAt:new Date().toISOString()
    };

    return global.INFINICUS.OM.benefitRealizationStore.put(
      "definitions",
      definition
    );
  }

  async function assess({
    benefitRealizationHandoffId,
    benefitRealizationPolicyId,
    realizedBenefitByMetric={}
  }={}){
    const handoff=
      await global.INFINICUS.OM.outcomeConfidenceReliabilityEngine
        .getBenefitRealizationHandoff({
          benefitRealizationHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.benefitRealizationStore.get(
        "policies",
        benefitRealizationPolicyId
      );

    if(!policy.ok) return policy;

    const definitions=
      await global.INFINICUS.OM.benefitRealizationStore.list(
        "definitions"
      );

    if(!definitions.ok) return definitions;

    const assessments=[];

    for(const comparison of handoff.data.comparisons){
      const confidence=
        handoff.data.confidenceRatings.find(
          item=>item.metricId===comparison.metricId
        );

      const reliability=
        handoff.data.reliabilityRatings.find(
          item=>item.metricId===comparison.metricId
        );

      const definition=
        definitions.data.find(
          item=>item.metricId===comparison.metricId
        );

      if(!definition){
        continue;
      }

      const actualInput=
        realizedBenefitByMetric[comparison.metricId] || {};

      const calculated=
        global.INFINICUS.OM.benefitRealizationCalculator.calculate({
          expectedBenefit:definition.expectedBenefit,
          actualBenefit:
            actualInput.actualBenefit ?? comparison.actualValue,
          actionCost:definition.actionCost,
          startedAt:definition.startedAt,
          realizedAt:actualInput.realizedAt || new Date().toISOString(),
          sustainabilityScore:
            actualInput.sustainabilityScore ?? 0
        });

      if(!calculated.valid){
        return runtime.failure(
          "OM_BENEFIT_REALIZATION_FAILED",
          "Benefit realization calculation failed.",
          {
            metricId:comparison.metricId,
            issues:calculated.issues
          }
        );
      }

      const confidenceScore=
        Number(confidence?.confidenceScore ?? 0);

      const reliabilityScore=
        Number(reliability?.reliabilityScore ?? 0);

      let status="unrealized";

      if(
        confidenceScore<policy.data.minimumConfidence ||
        reliabilityScore<policy.data.minimumReliability
      ){
        status="inconclusive";
      }else if(
        calculated.realizationRatio>=policy.data.realizedThreshold &&
        calculated.sustainabilityScore>=policy.data.sustainabilityMinimum
      ){
        status="realized";
      }else if(
        calculated.realizationRatio>=policy.data.partialThreshold
      ){
        status="partially_realized";
      }

      const assessment={
        benefitRealizationAssessmentId:
          runtime.createId("om_benefit_assessment"),
        monitoringContractId:
          handoff.data.monitoringContractId,
        metricId:
          comparison.metricId,
        benefitDefinitionId:
          definition.benefitDefinitionId,
        expectedActualComparisonId:
          comparison.expectedActualComparisonId,
        benefitType:
          definition.benefitType,
        expectedBenefit:
          calculated.expectedBenefit,
        actualBenefit:
          calculated.actualBenefit,
        actionCost:
          calculated.actionCost,
        netBenefit:
          calculated.netBenefit,
        benefitCostRatio:
          calculated.benefitCostRatio,
        realizationRatio:
          calculated.realizationRatio,
        realizationPercent:
          calculated.realizationPercent,
        timeToBenefitDays:
          calculated.timeToBenefitDays,
        sustainabilityScore:
          calculated.sustainabilityScore,
        confidenceScore,
        reliabilityScore,
        status,
        correlationId:
          handoff.data.correlationId,
        lineage:[
          ...handoff.data.lineage.map(runtime.clone),
          ...comparison.lineage.map(runtime.clone)
        ],
        assessedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.benefitRealizationStore.put(
        "assessments",
        assessment
      );

      assessments.push(assessment);
    }

    const adverseHandoff={
      adverseOutcomeHandoffId:
        runtime.createId("om_adverse_outcome_handoff"),
      targetBlock:"OM-19",
      monitoringContractId:
        handoff.data.monitoringContractId,
      benefitAssessments:
        assessments.map(runtime.clone),
      comparisons:
        handoff.data.comparisons.map(runtime.clone),
      interpretations:
        handoff.data.interpretations.map(runtime.clone),
      confidenceRatings:
        handoff.data.confidenceRatings.map(runtime.clone),
      reliabilityRatings:
        handoff.data.reliabilityRatings.map(runtime.clone),
      causationAssessments:
        handoff.data.causationAssessments.map(runtime.clone),
      attributionAssessments:
        handoff.data.attributionAssessments.map(runtime.clone),
      confounders:
        handoff.data.confounders.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        handoff.data.confidence,
      reliability:
        handoff.data.reliability,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.benefitRealizationStore.put(
      "adverse_handoffs",
      adverseHandoff
    );

    await runtime.emit(
      "om.benefits.assessed",
      {
        assessmentCount:assessments.length,
        adverseOutcomeHandoffId:
          adverseHandoff.adverseOutcomeHandoffId
      }
    );

    return runtime.success({
      benefitAssessments:assessments,
      adverseOutcomeHandoff:adverseHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    registerBenefitDefinition,
    assess,
    getAssessment:({benefitRealizationAssessmentId}) =>
      global.INFINICUS.OM.benefitRealizationStore.get(
        "assessments",
        benefitRealizationAssessmentId
      ),
    getAdverseOutcomeHandoff:({adverseOutcomeHandoffId}) =>
      global.INFINICUS.OM.benefitRealizationStore.get(
        "adverse_handoffs",
        adverseOutcomeHandoffId
      ),
    listAssessments:() =>
      global.INFINICUS.OM.benefitRealizationStore.list(
        "assessments"
      )
  });

  runtime.registerService(
    "om.benefit_realization",
    api,
    {block:"OM-18"}
  );

  runtime.registerRoute(
    "om.benefit_realization_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.benefit_definition.register",
    registerBenefitDefinition
  );

  runtime.registerRoute(
    "om.benefit_realization.assess",
    assess
  );

  global.INFINICUS.OM.benefitRealizationEngine=api;
})(window);

/* ===== INFINICUS-OM-19-Adverse-Outcome-Side-Effect-Detection-Engine ===== */

/* --- outcome-monitoring/INFINICUS-OM-19-Adverse-Outcome-Side-Effect-Detection-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;
  if(!OM?.runtime) throw new Error("OM-01 must be loaded before OM-19.");
  if(!OM?.benefitRealizationEngine){
    throw new Error("OM-18 must be loaded before OM-19.");
  }
})(window);

/* --- outcome-monitoring/INFINICUS-OM-19-Adverse-Outcome-Side-Effect-Detection-Engine/src/model/adverse-policy.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_ADVERSE_POLICY_INVALID",
        "Adverse-outcome policy name and code are required."
      );
    }

    return runtime.success({
      adverseOutcomePolicyId:
        input.adverseOutcomePolicyId ||
        runtime.createId("om_adverse_policy"),
      name:String(input.name),
      code:String(input.code),
      warningMateriality:
        Math.max(0,Math.min(1,Number(input.warningMateriality ?? 0.35))),
      criticalMateriality:
        Math.max(0,Math.min(1,Number(input.criticalMateriality ?? 0.7))),
      requireCausalContext:
        Boolean(input.requireCausalContext),
      requireObservedEvidence:
        input.requireObservedEvidence !== false,
      mitigationThreshold:
        Math.max(0,Math.min(1,Number(input.mitigationThreshold ?? 0.5))),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.adverseOutcomePolicyModel=
    Object.freeze({create});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-19-Adverse-Outcome-Side-Effect-Detection-Engine/src/scoring/adverse-scorer.js --- */
(function(global){
  "use strict";

  const bounded=value=>
    Math.max(0,Math.min(1,Number(value || 0)));

  function score({
    magnitude,
    scope,
    persistence,
    irreversibility,
    confidence
  }={}){
    const materiality=
      bounded(magnitude)*0.35 +
      bounded(scope)*0.2 +
      bounded(persistence)*0.2 +
      bounded(irreversibility)*0.15 +
      bounded(confidence)*0.1;

    return {
      materiality:Number(materiality.toFixed(4))
    };
  }

  global.INFINICUS.OM.adverseOutcomeScorer=
    Object.freeze({score});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-19-Adverse-Outcome-Side-Effect-Detection-Engine/src/storage/adverse-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_ADVERSE_OUTCOMES";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;
        for(const [name,keyPath] of [
          ["policies","adverseOutcomePolicyId"],
          ["definitions","adverseMetricDefinitionId"],
          ["detections","adverseOutcomeDetectionId"],
          ["exceptions_handoffs","monitoringExceptionHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
          }
        }
      };

      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "OM_ADVERSE_STORAGE_ERROR",
        error?.message || "Adverse-outcome storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_ADVERSE_RECORD_NOT_FOUND",
            "Adverse-outcome record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_ADVERSE_STORAGE_ERROR",
        error?.message || "Adverse-outcome retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "OM_ADVERSE_STORAGE_ERROR",
        error?.message || "Adverse-outcome listing failed."
      );
    }
  }

  global.INFINICUS.OM.adverseOutcomeStore=
    Object.freeze({open,put,get,list});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-19-Adverse-Outcome-Side-Effect-Detection-Engine/src/engine/adverse-outcome-side-effect-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.adverseOutcomePolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.adverseOutcomeStore.put(
      "policies",
      built.data
    );
  }

  async function registerAdverseMetric(input={}){
    if(!input.metricId || !input.adverseType){
      return runtime.failure(
        "OM_ADVERSE_METRIC_INVALID",
        "Metric ID and adverse type are required."
      );
    }

    const definition={
      adverseMetricDefinitionId:
        input.adverseMetricDefinitionId ||
        runtime.createId("om_adverse_metric"),
      metricId:String(input.metricId),
      adverseType:String(input.adverseType),
      baselineValue:Number(input.baselineValue ?? 0),
      thresholdValue:Number(input.thresholdValue ?? 0),
      direction:String(input.direction || "increase_is_adverse"),
      unit:input.unit || null,
      displacedCostRate:Number(input.displacedCostRate ?? 0),
      createdAt:new Date().toISOString()
    };

    return global.INFINICUS.OM.adverseOutcomeStore.put(
      "definitions",
      definition
    );
  }

  async function detect({
    adverseOutcomeHandoffId,
    adverseOutcomePolicyId,
    adverseEvidenceByMetric={}
  }={}){
    const handoff=
      await global.INFINICUS.OM.benefitRealizationEngine
        .getAdverseOutcomeHandoff({
          adverseOutcomeHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.adverseOutcomeStore.get(
        "policies",
        adverseOutcomePolicyId
      );

    if(!policy.ok) return policy;

    const definitions=
      await global.INFINICUS.OM.adverseOutcomeStore.list(
        "definitions"
      );

    if(!definitions.ok) return definitions;

    const detections=[];

    for(const definition of definitions.data){
      const supplied=
        adverseEvidenceByMetric[definition.metricId];

      if(!supplied){
        continue;
      }

      if(
        policy.data.requireObservedEvidence &&
        supplied.classification!=="observed"
      ){
        return runtime.failure(
          "OM_ADVERSE_EVIDENCE_INVALID",
          "Adverse evidence must be classified as observed.",
          {metricId:definition.metricId}
        );
      }

      const actual=Number(supplied.actualValue);
      const threshold=Number(definition.thresholdValue);

      if(!Number.isFinite(actual) || !Number.isFinite(threshold)){
        return runtime.failure(
          "OM_ADVERSE_VALUE_INVALID",
          "Adverse actual and threshold values must be finite."
        );
      }

      const breached=
        definition.direction==="decrease_is_adverse"
          ? actual<threshold
          : actual>threshold;

      if(!breached){
        continue;
      }

      const magnitude=
        Math.min(
          1,
          Math.abs(actual-threshold) /
          (Math.abs(threshold) || 1)
        );

      const scored=
        global.INFINICUS.OM.adverseOutcomeScorer.score({
          magnitude,
          scope:supplied.scope ?? 0.5,
          persistence:supplied.persistence ?? 0.5,
          irreversibility:supplied.irreversibility ?? 0,
          confidence:supplied.confidence ?? 0.5
        });

      let severity="minor";

      if(scored.materiality>=policy.data.criticalMateriality){
        severity="critical";
      }else if(scored.materiality>=policy.data.warningMateriality){
        severity="warning";
      }

      const relatedBenefit=
        handoff.data.benefitAssessments.find(
          item=>item.metricId===definition.metricId
        );

      const displacedCost=
        Number(
          (
            Math.abs(actual-definition.baselineValue) *
            definition.displacedCostRate
          ).toFixed(6)
        );

      const benefitOffset=
        relatedBenefit
          ? Math.min(
              Math.max(0,relatedBenefit.actualBenefit),
              displacedCost
            )
          : 0;

      const causation=
        handoff.data.causationAssessments.find(
          item=>item.metricId===definition.metricId
        );

      const attribution=
        handoff.data.attributionAssessments.find(
          item=>item.metricId===definition.metricId
        );

      const detection={
        adverseOutcomeDetectionId:
          runtime.createId("om_adverse_detection"),
        monitoringContractId:
          handoff.data.monitoringContractId,
        metricId:
          definition.metricId,
        adverseMetricDefinitionId:
          definition.adverseMetricDefinitionId,
        adverseType:
          definition.adverseType,
        actualValue:actual,
        thresholdValue:threshold,
        magnitude:Number(magnitude.toFixed(4)),
        materiality:scored.materiality,
        severity,
        displacedCost,
        benefitOffset,
        netAdverseImpact:
          Number((displacedCost-benefitOffset).toFixed(6)),
        persistence:
          Number(supplied.persistence ?? 0),
        irreversibility:
          Number(supplied.irreversibility ?? 0),
        mitigationRequired:
          scored.materiality>=policy.data.mitigationThreshold,
        causationClassification:
          causation?.classification || "not_assessed",
        attributionClassification:
          attribution?.classification || "not_assessed",
        confidence:
          Math.min(
            Number(supplied.confidence ?? 0),
            handoff.data.confidence,
            handoff.data.reliability
          ),
        correlationId:
          handoff.data.correlationId,
        lineage:[
          ...handoff.data.lineage.map(runtime.clone),
          ...(supplied.lineage || []).map(runtime.clone)
        ],
        detectedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.adverseOutcomeStore.put(
        "detections",
        detection
      );

      detections.push(detection);
    }

    const exceptionHandoff={
      monitoringExceptionHandoffId:
        runtime.createId("om_monitoring_exception_handoff"),
      targetBlock:"OM-20",
      monitoringContractId:
        handoff.data.monitoringContractId,
      adverseOutcomes:
        detections.map(runtime.clone),
      benefitAssessments:
        handoff.data.benefitAssessments.map(runtime.clone),
      comparisons:
        handoff.data.comparisons.map(runtime.clone),
      confidenceRatings:
        handoff.data.confidenceRatings.map(runtime.clone),
      reliabilityRatings:
        handoff.data.reliabilityRatings.map(runtime.clone),
      causationAssessments:
        handoff.data.causationAssessments.map(runtime.clone),
      attributionAssessments:
        handoff.data.attributionAssessments.map(runtime.clone),
      confounders:
        handoff.data.confounders.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        handoff.data.confidence,
      reliability:
        handoff.data.reliability,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.adverseOutcomeStore.put(
      "exceptions_handoffs",
      exceptionHandoff
    );

    await runtime.emit(
      "om.adverse_outcomes.detected",
      {
        adverseOutcomeCount:detections.length,
        monitoringExceptionHandoffId:
          exceptionHandoff.monitoringExceptionHandoffId
      }
    );

    return runtime.success({
      adverseOutcomes:detections,
      monitoringExceptionHandoff:exceptionHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    registerAdverseMetric,
    detect,
    getDetection:({adverseOutcomeDetectionId}) =>
      global.INFINICUS.OM.adverseOutcomeStore.get(
        "detections",
        adverseOutcomeDetectionId
      ),
    getMonitoringExceptionHandoff:({
      monitoringExceptionHandoffId
    }) =>
      global.INFINICUS.OM.adverseOutcomeStore.get(
        "exceptions_handoffs",
        monitoringExceptionHandoffId
      ),
    listDetections:() =>
      global.INFINICUS.OM.adverseOutcomeStore.list(
        "detections"
      )
  });

  runtime.registerService(
    "om.adverse_outcome_side_effect_detection",
    api,
    {block:"OM-19"}
  );

  runtime.registerRoute(
    "om.adverse_outcome_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.adverse_metric.register",
    registerAdverseMetric
  );

  runtime.registerRoute(
    "om.adverse_outcomes.detect",
    detect
  );

  global.INFINICUS.OM.adverseOutcomeSideEffectEngine=api;
})(window);

/* ===== INFINICUS-OM-20-Monitoring-Exception-Missing-Data-Engine ===== */

/* --- outcome-monitoring/INFINICUS-OM-20-Monitoring-Exception-Missing-Data-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";

  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-20.");
  }

  if(!OM?.adverseOutcomeSideEffectEngine){
    throw new Error("OM-19 must be loaded before OM-20.");
  }
})(window);

/* --- outcome-monitoring/INFINICUS-OM-20-Monitoring-Exception-Missing-Data-Engine/src/model/exception-policy.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_EXCEPTION_POLICY_INVALID",
        "Exception policy name and code are required."
      );
    }

    return runtime.success({
      monitoringExceptionPolicyId:
        input.monitoringExceptionPolicyId ||
        runtime.createId("om_exception_policy"),
      name:String(input.name),
      code:String(input.code),
      missingCheckpointWarningCount:
        Math.max(1,Number(input.missingCheckpointWarningCount || 1)),
      missingCheckpointCriticalCount:
        Math.max(1,Number(input.missingCheckpointCriticalCount || 3)),
      staleMinutesWarning:
        Math.max(1,Number(input.staleMinutesWarning || 120)),
      staleMinutesCritical:
        Math.max(1,Number(input.staleMinutesCritical || 1440)),
      minimumEvidenceCompleteness:
        Math.max(
          0,
          Math.min(
            1,
            Number(input.minimumEvidenceCompleteness ?? 0.8)
          )
        ),
      allowWaiver:Boolean(input.allowWaiver),
      requireRemediation:
        input.requireRemediation !== false,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.monitoringExceptionPolicyModel=
    Object.freeze({create});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-20-Monitoring-Exception-Missing-Data-Engine/src/detection/exception-detector.js --- */
(function(global){
  "use strict";

  function detect({
    context,
    policy,
    now=new Date().toISOString()
  }={}){
    const exceptions=[];

    for(const metric of context.metrics || []){
      const observations=
        (context.observations || []).filter(
          item=>item.metricId===metric.metricId
        );

      const checkpoints=
        (context.checkpoints || []).filter(
          item=>item.metricId===metric.metricId
        );

      const completedCheckpointIds=
        new Set(
          observations
            .map(item=>item.monitoringCheckpointId)
            .filter(Boolean)
        );

      const overdueCheckpoints=
        checkpoints.filter(checkpoint=>{
          const due=
            new Date(
              checkpoint.graceEndsAt ||
              checkpoint.scheduledAt
            ).getTime();

          return (
            due < new Date(now).getTime() &&
            !completedCheckpointIds.has(
              checkpoint.monitoringCheckpointId
            )
          );
        });

      if(overdueCheckpoints.length){
        exceptions.push({
          exceptionType:"missing_checkpoint",
          metricId:metric.metricId,
          count:overdueCheckpoints.length,
          references:
            overdueCheckpoints.map(
              item=>item.monitoringCheckpointId
            ),
          severity:
            overdueCheckpoints.length >=
            policy.missingCheckpointCriticalCount
              ? "critical"
              : "warning"
        });
      }

      if(!observations.length){
        exceptions.push({
          exceptionType:"missing_observation",
          metricId:metric.metricId,
          count:1,
          references:[],
          severity:"critical"
        });
      }

      const latest=
        observations
          .slice()
          .sort(
            (a,b)=>
              new Date(b.sourceTimestamp).getTime() -
              new Date(a.sourceTimestamp).getTime()
          )[0];

      if(latest?.sourceTimestamp){
        const staleMinutes=
          (
            new Date(now).getTime() -
            new Date(latest.sourceTimestamp).getTime()
          ) / 60000;

        if(staleMinutes>=policy.staleMinutesWarning){
          exceptions.push({
            exceptionType:"stale_observation",
            metricId:metric.metricId,
            count:1,
            references:[latest.observationId],
            staleMinutes:Number(staleMinutes.toFixed(2)),
            severity:
              staleMinutes>=policy.staleMinutesCritical
                ? "critical"
                : "warning"
          });
        }
      }

      const requiredEvidence=
        Number(metric.requiredEvidenceCount || 1);

      const actualEvidence=
        observations.filter(
          item=>item.rawEvidence!=null
        ).length;

      const completeness=
        requiredEvidence===0
          ? 1
          : Math.min(1,actualEvidence/requiredEvidence);

      if(completeness<policy.minimumEvidenceCompleteness){
        exceptions.push({
          exceptionType:"incomplete_evidence",
          metricId:metric.metricId,
          count:1,
          references:
            observations.map(item=>item.observationId),
          evidenceCompleteness:
            Number(completeness.toFixed(4)),
          severity:
            completeness<0.5 ? "critical" : "warning"
        });
      }
    }

    for(const failure of context.collectionFailures || []){
      exceptions.push({
        exceptionType:
          failure.error?.code==="OM_COLLECTOR_NOT_FOUND"
            ? "connector_unavailable"
            : "collection_failure",
        metricId:failure.metricId || null,
        count:1,
        references:
          [failure.bindingId].filter(Boolean),
        severity:"critical",
        failure
      });
    }

    return exceptions;
  }

  global.INFINICUS.OM.monitoringExceptionDetector=
    Object.freeze({detect});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-20-Monitoring-Exception-Missing-Data-Engine/src/storage/exception-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_MONITORING_EXCEPTIONS";
  let dbPromise;

  const requestPromise=request=>
    new Promise((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;

        for(const [name,keyPath] of [
          ["policies","monitoringExceptionPolicyId"],
          ["exceptions","monitoringExceptionId"],
          ["events","monitoringExceptionEventId"],
          ["waivers","monitoringExceptionWaiverId"],
          ["resolutions","monitoringExceptionResolutionId"],
          ["audit_handoffs","outcomeAuditHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
          }
        }
      };

      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");

      await requestPromise(
        tx.objectStore(storeName).put(
          structuredClone(record)
        )
      );

      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "OM_EXCEPTION_STORAGE_ERROR",
        error?.message || "Exception storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");

      const value=await requestPromise(
        tx.objectStore(storeName).get(id)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_EXCEPTION_RECORD_NOT_FOUND",
            "Monitoring exception record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_EXCEPTION_STORAGE_ERROR",
        error?.message || "Exception retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");

      const values=await requestPromise(
        tx.objectStore(storeName).getAll()
      );

      return runtime.success(
        values.map(structuredClone)
      );
    }catch(error){
      return runtime.failure(
        "OM_EXCEPTION_STORAGE_ERROR",
        error?.message || "Exception listing failed."
      );
    }
  }

  global.INFINICUS.OM.monitoringExceptionStore=
    Object.freeze({open,put,get,list});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-20-Monitoring-Exception-Missing-Data-Engine/src/engine/monitoring-exception-missing-data-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.monitoringExceptionPolicyModel.create(
        input
      );

    if(!built.ok) return built;

    return global.INFINICUS.OM.monitoringExceptionStore.put(
      "policies",
      built.data
    );
  }

  async function detect({
    monitoringExceptionHandoffId,
    monitoringExceptionPolicyId,
    monitoringContext={}
  }={}){
    const handoff=
      await global.INFINICUS.OM.adverseOutcomeSideEffectEngine
        .getMonitoringExceptionHandoff({
          monitoringExceptionHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.monitoringExceptionStore.get(
        "policies",
        monitoringExceptionPolicyId
      );

    if(!policy.ok) return policy;

    const detected=
      global.INFINICUS.OM.monitoringExceptionDetector.detect({
        context:monitoringContext,
        policy:policy.data
      });

    const exceptions=[];

    for(const item of detected){
      const exception={
        monitoringExceptionId:
          runtime.createId("om_monitoring_exception"),
        monitoringContractId:
          handoff.data.monitoringContractId,
        metricId:item.metricId,
        exceptionType:item.exceptionType,
        severity:item.severity,
        count:item.count,
        references:
          runtime.clone(item.references || []),
        details:
          runtime.clone(item),
        ownerRole:
          item.severity==="critical"
            ? "monitoring_manager"
            : "monitoring_analyst",
        remediationRequired:
          policy.data.requireRemediation,
        recommendedRemediation:
          item.exceptionType==="missing_observation"
            ? "Restore source collection and backfill the missing observation."
            : item.exceptionType==="connector_unavailable"
              ? "Restore or replace the observation connector."
              : item.exceptionType==="stale_observation"
                ? "Refresh the source and collect a current observation."
                : item.exceptionType==="incomplete_evidence"
                  ? "Collect the required supporting evidence."
                  : "Investigate and correct the monitoring failure.",
        state:"open",
        correlationId:
          handoff.data.correlationId,
        lineage:
          handoff.data.lineage.map(runtime.clone),
        detectedAt:new Date().toISOString(),
        updatedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.monitoringExceptionStore.put(
        "exceptions",
        exception
      );

      exceptions.push(exception);
    }

    const auditHandoff={
      outcomeAuditHandoffId:
        runtime.createId("om_outcome_audit_handoff"),
      targetBlock:"OM-21",
      monitoringContractId:
        handoff.data.monitoringContractId,
      monitoringExceptions:
        exceptions.map(runtime.clone),
      adverseOutcomes:
        handoff.data.adverseOutcomes.map(runtime.clone),
      benefitAssessments:
        handoff.data.benefitAssessments.map(runtime.clone),
      comparisons:
        handoff.data.comparisons.map(runtime.clone),
      confidenceRatings:
        handoff.data.confidenceRatings.map(runtime.clone),
      reliabilityRatings:
        handoff.data.reliabilityRatings.map(runtime.clone),
      causationAssessments:
        handoff.data.causationAssessments.map(runtime.clone),
      attributionAssessments:
        handoff.data.attributionAssessments.map(runtime.clone),
      confounders:
        handoff.data.confounders.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        handoff.data.confidence,
      reliability:
        handoff.data.reliability,
      status:
        exceptions.some(item=>item.severity==="critical")
          ? "exceptions_present"
          : "ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.monitoringExceptionStore.put(
      "audit_handoffs",
      auditHandoff
    );

    await runtime.emit(
      "om.monitoring_exceptions.detected",
      {
        exceptionCount:exceptions.length,
        outcomeAuditHandoffId:
          auditHandoff.outcomeAuditHandoffId
      }
    );

    return runtime.success({
      monitoringExceptions:exceptions,
      outcomeAuditHandoff:auditHandoff
    });
  }

  async function waive({
    monitoringExceptionId,
    waivedBy,
    reason,
    expiresAt=null
  }={}){
    const exception=
      await global.INFINICUS.OM.monitoringExceptionStore.get(
        "exceptions",
        monitoringExceptionId
      );

    if(!exception.ok) return exception;

    const waiver={
      monitoringExceptionWaiverId:
        runtime.createId("om_exception_waiver"),
      monitoringExceptionId,
      waivedBy:String(waivedBy || "unknown"),
      reason:String(reason || ""),
      expiresAt,
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.monitoringExceptionStore.put(
      "waivers",
      waiver
    );

    const updated={
      ...exception.data,
      state:"waived",
      waiverId:waiver.monitoringExceptionWaiverId,
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.monitoringExceptionStore.put(
      "exceptions",
      updated
    );

    return runtime.success({
      exception:updated,
      waiver
    });
  }

  async function resolve({
    monitoringExceptionId,
    resolvedBy,
    resolutionEvidence
  }={}){
    const exception=
      await global.INFINICUS.OM.monitoringExceptionStore.get(
        "exceptions",
        monitoringExceptionId
      );

    if(!exception.ok) return exception;

    if(!resolutionEvidence){
      return runtime.failure(
        "OM_EXCEPTION_RESOLUTION_EVIDENCE_REQUIRED",
        "Resolution evidence is required."
      );
    }

    const resolution={
      monitoringExceptionResolutionId:
        runtime.createId("om_exception_resolution"),
      monitoringExceptionId,
      resolvedBy:String(resolvedBy || "unknown"),
      resolutionEvidence:
        runtime.clone(resolutionEvidence),
      resolvedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.monitoringExceptionStore.put(
      "resolutions",
      resolution
    );

    const updated={
      ...exception.data,
      state:"resolved",
      resolutionId:
        resolution.monitoringExceptionResolutionId,
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.monitoringExceptionStore.put(
      "exceptions",
      updated
    );

    return runtime.success({
      exception:updated,
      resolution
    });
  }

  const api=Object.freeze({
    registerPolicy,
    detect,
    waive,
    resolve,
    getException:({monitoringExceptionId}) =>
      global.INFINICUS.OM.monitoringExceptionStore.get(
        "exceptions",
        monitoringExceptionId
      ),
    getOutcomeAuditHandoff:({outcomeAuditHandoffId}) =>
      global.INFINICUS.OM.monitoringExceptionStore.get(
        "audit_handoffs",
        outcomeAuditHandoffId
      ),
    listExceptions:() =>
      global.INFINICUS.OM.monitoringExceptionStore.list(
        "exceptions"
      )
  });

  runtime.registerService(
    "om.monitoring_exception_missing_data",
    api,
    {block:"OM-20"}
  );

  runtime.registerRoute(
    "om.monitoring_exception_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.monitoring_exceptions.detect",
    detect
  );

  runtime.registerRoute(
    "om.monitoring_exception.waive",
    waive
  );

  runtime.registerRoute(
    "om.monitoring_exception.resolve",
    resolve
  );

  global.INFINICUS.OM.monitoringExceptionMissingDataEngine=api;
})(window);

/* ===== INFINICUS-OM-21-Outcome-Evidence-Audit-Trail-Engine ===== */

/* --- outcome-monitoring/INFINICUS-OM-21-Outcome-Evidence-Audit-Trail-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";

  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-21.");
  }

  if(!OM?.monitoringExceptionMissingDataEngine){
    throw new Error("OM-20 must be loaded before OM-21.");
  }
})(window);

/* --- outcome-monitoring/INFINICUS-OM-21-Outcome-Evidence-Audit-Trail-Engine/src/model/audit-policy.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_AUDIT_POLICY_INVALID",
        "Audit policy name and code are required."
      );
    }

    return runtime.success({
      outcomeAuditPolicyId:
        input.outcomeAuditPolicyId ||
        runtime.createId("om_audit_policy"),
      name:String(input.name),
      code:String(input.code),
      requireLineage:
        input.requireLineage !== false,
      requireCorrelationId:
        input.requireCorrelationId !== false,
      minimumCompleteness:
        Math.max(
          0,
          Math.min(
            1,
            Number(input.minimumCompleteness ?? 0.9)
          )
        ),
      hashAlgorithm:String(input.hashAlgorithm || "SHA-256"),
      includeRawEvidence:
        input.includeRawEvidence !== false,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.outcomeAuditPolicyModel=
    Object.freeze({create});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-21-Outcome-Evidence-Audit-Trail-Engine/src/audit/canonicalizer.js --- */
(function(global){
  "use strict";

  function canonicalize(value){
    if(value===null || typeof value!=="object"){
      return JSON.stringify(value);
    }

    if(Array.isArray(value)){
      return `[${value.map(canonicalize).join(",")}]`;
    }

    const keys=Object.keys(value).sort();

    return `{${keys.map(
      key=>`${JSON.stringify(key)}:${canonicalize(value[key])}`
    ).join(",")}}`;
  }

  async function sha256(value){
    const input=
      new TextEncoder().encode(canonicalize(value));

    const digest=
      await crypto.subtle.digest("SHA-256",input);

    return [...new Uint8Array(digest)]
      .map(byte=>byte.toString(16).padStart(2,"0"))
      .join("");
  }

  global.INFINICUS.OM.auditCanonicalizer=
    Object.freeze({canonicalize,sha256});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-21-Outcome-Evidence-Audit-Trail-Engine/src/validation/audit-validator.js --- */
(function(global){
  "use strict";

  function validate({
    auditPackage,
    policy
  }={}){
    const issues=[];

    if(policy.status!=="active"){
      issues.push("Audit policy is inactive.");
    }

    if(!auditPackage.monitoringContractId){
      issues.push("Monitoring contract ID is required.");
    }

    if(
      policy.requireCorrelationId &&
      !auditPackage.correlationId
    ){
      issues.push("Correlation ID is required.");
    }

    if(
      policy.requireLineage &&
      (!Array.isArray(auditPackage.lineage) ||
       !auditPackage.lineage.length)
    ){
      issues.push("Audit lineage is required.");
    }

    const requiredSections=[
      "comparisons",
      "confidenceRatings",
      "reliabilityRatings",
      "benefitAssessments",
      "adverseOutcomes",
      "monitoringExceptions"
    ];

    const presentCount=
      requiredSections.filter(
        section=>Array.isArray(auditPackage[section])
      ).length;

    const completeness=
      presentCount/requiredSections.length;

    if(completeness<policy.minimumCompleteness){
      issues.push("Audit package completeness is below policy minimum.");
    }

    return {
      valid:issues.length===0,
      issues,
      completeness:Number(completeness.toFixed(4))
    };
  }

  global.INFINICUS.OM.outcomeAuditValidator=
    Object.freeze({validate});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-21-Outcome-Evidence-Audit-Trail-Engine/src/storage/audit-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_OUTCOME_AUDIT";
  let dbPromise;

  const requestPromise=request=>
    new Promise((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;

        for(const [name,keyPath] of [
          ["policies","outcomeAuditPolicyId"],
          ["packages","outcomeAuditPackageId"],
          ["events","outcomeAuditEventId"],
          ["exports","outcomeAuditExportId"],
          ["verdict_handoffs","outcomeVerdictHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
          }
        }
      };

      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");

      await requestPromise(
        tx.objectStore(storeName).put(
          structuredClone(record)
        )
      );

      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "OM_AUDIT_STORAGE_ERROR",
        error?.message || "Audit storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");

      const value=await requestPromise(
        tx.objectStore(storeName).get(id)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_AUDIT_RECORD_NOT_FOUND",
            "Audit record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_AUDIT_STORAGE_ERROR",
        error?.message || "Audit retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");

      const values=await requestPromise(
        tx.objectStore(storeName).getAll()
      );

      return runtime.success(
        values.map(structuredClone)
      );
    }catch(error){
      return runtime.failure(
        "OM_AUDIT_STORAGE_ERROR",
        error?.message || "Audit listing failed."
      );
    }
  }

  global.INFINICUS.OM.outcomeAuditStore=
    Object.freeze({open,put,get,list});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-21-Outcome-Evidence-Audit-Trail-Engine/src/engine/outcome-evidence-audit-trail-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.outcomeAuditPolicyModel.create(
        input
      );

    if(!built.ok) return built;

    return global.INFINICUS.OM.outcomeAuditStore.put(
      "policies",
      built.data
    );
  }

  async function assemble({
    outcomeAuditHandoffId,
    outcomeAuditPolicyId,
    supplementalEvidence={}
  }={}){
    const handoff=
      await global.INFINICUS.OM.monitoringExceptionMissingDataEngine
        .getOutcomeAuditHandoff({
          outcomeAuditHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.outcomeAuditStore.get(
        "policies",
        outcomeAuditPolicyId
      );

    if(!policy.ok) return policy;

    const auditPackage={
      outcomeAuditPackageId:
        runtime.createId("om_outcome_audit_package"),
      monitoringContractId:
        handoff.data.monitoringContractId,
      actionInstanceId:
        supplementalEvidence.actionInstanceId || null,
      actionCompletionCertificateId:
        supplementalEvidence.actionCompletionCertificateId || null,
      observations:
        runtime.clone(supplementalEvidence.observations || []),
      validationRecords:
        runtime.clone(supplementalEvidence.validationRecords || []),
      progressRecords:
        runtime.clone(supplementalEvidence.progressRecords || []),
      varianceRecords:
        runtime.clone(supplementalEvidence.varianceRecords || []),
      alertRecords:
        runtime.clone(supplementalEvidence.alertRecords || []),
      attributionAssessments:
        handoff.data.attributionAssessments.map(runtime.clone),
      causationAssessments:
        handoff.data.causationAssessments.map(runtime.clone),
      confounders:
        handoff.data.confounders.map(runtime.clone),
      comparisons:
        handoff.data.comparisons.map(runtime.clone),
      confidenceRatings:
        handoff.data.confidenceRatings.map(runtime.clone),
      reliabilityRatings:
        handoff.data.reliabilityRatings.map(runtime.clone),
      benefitAssessments:
        handoff.data.benefitAssessments.map(runtime.clone),
      adverseOutcomes:
        handoff.data.adverseOutcomes.map(runtime.clone),
      monitoringExceptions:
        handoff.data.monitoringExceptions.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        handoff.data.confidence,
      reliability:
        handoff.data.reliability,
      generatedAt:new Date().toISOString()
    };

    const validation=
      global.INFINICUS.OM.outcomeAuditValidator.validate({
        auditPackage,
        policy:policy.data
      });

    if(!validation.valid){
      return runtime.failure(
        "OM_AUDIT_PACKAGE_INVALID",
        "Outcome audit package failed validation.",
        validation
      );
    }

    const packageHash=
      await global.INFINICUS.OM.auditCanonicalizer.sha256(
        auditPackage
      );

    const storedPackage={
      ...auditPackage,
      auditCompleteness:
        validation.completeness,
      hashAlgorithm:
        policy.data.hashAlgorithm,
      packageHash,
      tamperEvidence:{
        canonicalization:"sorted-key-json",
        immutableLedger:false,
        generatedAt:new Date().toISOString()
      },
      state:"sealed"
    };

    await global.INFINICUS.OM.outcomeAuditStore.put(
      "packages",
      storedPackage
    );

    const auditEvent={
      outcomeAuditEventId:
        runtime.createId("om_audit_event"),
      outcomeAuditPackageId:
        storedPackage.outcomeAuditPackageId,
      eventType:"package_sealed",
      packageHash,
      occurredAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.outcomeAuditStore.put(
      "events",
      auditEvent
    );

    const verdictHandoff={
      outcomeVerdictHandoffId:
        runtime.createId("om_outcome_verdict_handoff"),
      targetBlock:"OM-22",
      monitoringContractId:
        handoff.data.monitoringContractId,
      outcomeAuditPackageId:
        storedPackage.outcomeAuditPackageId,
      packageHash,
      auditCompleteness:
        storedPackage.auditCompleteness,
      comparisons:
        storedPackage.comparisons.map(runtime.clone),
      confidenceRatings:
        storedPackage.confidenceRatings.map(runtime.clone),
      reliabilityRatings:
        storedPackage.reliabilityRatings.map(runtime.clone),
      benefitAssessments:
        storedPackage.benefitAssessments.map(runtime.clone),
      adverseOutcomes:
        storedPackage.adverseOutcomes.map(runtime.clone),
      monitoringExceptions:
        storedPackage.monitoringExceptions.map(runtime.clone),
      causationAssessments:
        storedPackage.causationAssessments.map(runtime.clone),
      attributionAssessments:
        storedPackage.attributionAssessments.map(runtime.clone),
      correlationId:
        storedPackage.correlationId,
      lineage:
        storedPackage.lineage.map(runtime.clone),
      confidence:
        storedPackage.confidence,
      reliability:
        storedPackage.reliability,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.outcomeAuditStore.put(
      "verdict_handoffs",
      verdictHandoff
    );

    await runtime.emit(
      "om.outcome_audit.sealed",
      {
        outcomeAuditPackageId:
          storedPackage.outcomeAuditPackageId,
        packageHash,
        outcomeVerdictHandoffId:
          verdictHandoff.outcomeVerdictHandoffId
      }
    );

    return runtime.success({
      auditPackage:storedPackage,
      auditEvent,
      outcomeVerdictHandoff:verdictHandoff
    });
  }

  async function verify({
    outcomeAuditPackageId
  }={}){
    const record=
      await global.INFINICUS.OM.outcomeAuditStore.get(
        "packages",
        outcomeAuditPackageId
      );

    if(!record.ok) return record;

    const {
      packageHash,
      auditCompleteness,
      hashAlgorithm,
      tamperEvidence,
      state,
      ...hashable
    }=record.data;

    const calculatedHash=
      await global.INFINICUS.OM.auditCanonicalizer.sha256(
        hashable
      );

    return runtime.success({
      outcomeAuditPackageId,
      valid:calculatedHash===packageHash,
      storedHash:packageHash,
      calculatedHash
    });
  }

  async function exportPackage({
    outcomeAuditPackageId,
    format="json"
  }={}){
    const record=
      await global.INFINICUS.OM.outcomeAuditStore.get(
        "packages",
        outcomeAuditPackageId
      );

    if(!record.ok) return record;

    if(format!=="json"){
      return runtime.failure(
        "OM_AUDIT_EXPORT_FORMAT_UNSUPPORTED",
        "Only JSON export is supported in this package."
      );
    }

    const exportRecord={
      outcomeAuditExportId:
        runtime.createId("om_audit_export"),
      outcomeAuditPackageId,
      format,
      payload:JSON.stringify(record.data,null,2),
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.outcomeAuditStore.put(
      "exports",
      exportRecord
    );

    return runtime.success(exportRecord);
  }

  const api=Object.freeze({
    registerPolicy,
    assemble,
    verify,
    exportPackage,
    getAuditPackage:({outcomeAuditPackageId}) =>
      global.INFINICUS.OM.outcomeAuditStore.get(
        "packages",
        outcomeAuditPackageId
      ),
    getOutcomeVerdictHandoff:({
      outcomeVerdictHandoffId
    }) =>
      global.INFINICUS.OM.outcomeAuditStore.get(
        "verdict_handoffs",
        outcomeVerdictHandoffId
      ),
    listAuditEvents:() =>
      global.INFINICUS.OM.outcomeAuditStore.list(
        "events"
      )
  });

  runtime.registerService(
    "om.outcome_evidence_audit_trail",
    api,
    {block:"OM-21"}
  );

  runtime.registerRoute(
    "om.outcome_audit_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.outcome_audit.assemble",
    assemble
  );

  runtime.registerRoute(
    "om.outcome_audit.verify",
    verify
  );

  runtime.registerRoute(
    "om.outcome_audit.export",
    exportPackage
  );

  global.INFINICUS.OM.outcomeEvidenceAuditTrailEngine=api;
})(window);

/* ===== INFINICUS-OM-22-Outcome-Evaluation-Verdict-Engine ===== */

/* --- outcome-monitoring/INFINICUS-OM-22-Outcome-Evaluation-Verdict-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";

  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-22.");
  }

  if(!OM?.outcomeEvidenceAuditTrailEngine){
    throw new Error("OM-21 must be loaded before OM-22.");
  }
})(window);

/* --- outcome-monitoring/INFINICUS-OM-22-Outcome-Evaluation-Verdict-Engine/src/model/verdict-policy.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_VERDICT_POLICY_INVALID",
        "Verdict policy name and code are required."
      );
    }

    return runtime.success({
      outcomeVerdictPolicyId:
        input.outcomeVerdictPolicyId ||
        runtime.createId("om_verdict_policy"),
      name:String(input.name),
      code:String(input.code),
      minimumAuditCompleteness:
        Math.max(0,Math.min(1,Number(input.minimumAuditCompleteness ?? 0.9))),
      minimumConfidence:
        Math.max(0,Math.min(1,Number(input.minimumConfidence ?? 0.6))),
      minimumReliability:
        Math.max(0,Math.min(1,Number(input.minimumReliability ?? 0.6))),
      adverseMaterialityLimit:
        Math.max(0,Math.min(1,Number(input.adverseMaterialityLimit ?? 0.5))),
      unresolvedCriticalExceptionLimit:
        Math.max(0,Number(input.unresolvedCriticalExceptionLimit ?? 0)),
      requireHumanReviewForConditional:
        input.requireHumanReviewForConditional !== false,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.outcomeVerdictPolicyModel=
    Object.freeze({create});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-22-Outcome-Evaluation-Verdict-Engine/src/evaluation/verdict-evaluator.js --- */
(function(global){
  "use strict";

  function evaluate({
    handoff,
    policy
  }={}){
    const reasons=[];

    if(policy.status!=="active"){
      return {
        valid:false,
        issues:["Verdict policy is inactive."]
      };
    }

    const unresolvedCriticalExceptions=
      (handoff.monitoringExceptions || []).filter(
        item=>
          item.severity==="critical" &&
          !["resolved","waived"].includes(item.state)
      ).length;

    const maximumAdverseMateriality=
      (handoff.adverseOutcomes || []).reduce(
        (max,item)=>
          Math.max(max,Number(item.materiality || 0)),
        0
      );

    const realizedBenefits=
      (handoff.benefitAssessments || []).filter(
        item=>item.status==="realized"
      ).length;

    const partialBenefits=
      (handoff.benefitAssessments || []).filter(
        item=>item.status==="partially_realized"
      ).length;

    const failedComparisons=
      (handoff.comparisons || []).filter(
        item=>item.outcomeStatus==="failed"
      ).length;

    const achievedComparisons=
      (handoff.comparisons || []).filter(
        item=>item.outcomeStatus==="achieved"
      ).length;

    const confidence=
      Number(handoff.confidence ?? 0);

    const reliability=
      Number(handoff.reliability ?? 0);

    const auditComplete=
      Number(handoff.auditCompleteness ?? 0) >=
      policy.minimumAuditCompleteness;

    const confidenceSufficient=
      confidence>=policy.minimumConfidence;

    const reliabilitySufficient=
      reliability>=policy.minimumReliability;

    const adverseAcceptable=
      maximumAdverseMateriality<=
      policy.adverseMaterialityLimit;

    const exceptionsAcceptable=
      unresolvedCriticalExceptions<=
      policy.unresolvedCriticalExceptionLimit;

    let verdict="inconclusive";
    let humanReviewRequired=false;

    if(!auditComplete){
      reasons.push("Audit completeness is below the required minimum.");
    }

    if(!confidenceSufficient){
      reasons.push("Outcome confidence is below the required minimum.");
    }

    if(!reliabilitySufficient){
      reasons.push("Outcome reliability is below the required minimum.");
    }

    if(!exceptionsAcceptable){
      reasons.push("Unresolved critical monitoring exceptions remain.");
    }

    if(!adverseAcceptable){
      reasons.push("Material adverse outcomes exceed the allowed limit.");
    }

    if(
      auditComplete &&
      confidenceSufficient &&
      reliabilitySufficient &&
      exceptionsAcceptable
    ){
      if(
        achievedComparisons>0 &&
        realizedBenefits>0 &&
        adverseAcceptable &&
        failedComparisons===0
      ){
        verdict="successful";
        reasons.push("Expected outcomes were achieved with realized benefits.");
      }else if(
        achievedComparisons>0 &&
        (realizedBenefits>0 || partialBenefits>0) &&
        adverseAcceptable
      ){
        verdict="partially_successful";
        reasons.push("Some expected outcomes or benefits were realized.");
      }else if(
        failedComparisons>0 &&
        realizedBenefits===0
      ){
        verdict="unsuccessful";
        reasons.push("Expected outcomes were not achieved.");
      }else{
        verdict="conditional";
        humanReviewRequired=
          policy.requireHumanReviewForConditional;
        reasons.push("Evidence supports a conditional outcome verdict.");
      }
    }

    if(
      !adverseAcceptable &&
      verdict==="successful"
    ){
      verdict="conditional";
      humanReviewRequired=true;
    }

    return {
      valid:true,
      verdict,
      humanReviewRequired,
      reasons,
      metrics:{
        unresolvedCriticalExceptions,
        maximumAdverseMateriality:
          Number(maximumAdverseMateriality.toFixed(4)),
        realizedBenefits,
        partialBenefits,
        achievedComparisons,
        failedComparisons,
        confidence,
        reliability,
        auditCompleteness:
          Number(handoff.auditCompleteness ?? 0)
      }
    };
  }

  global.INFINICUS.OM.outcomeVerdictEvaluator=
    Object.freeze({evaluate});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-22-Outcome-Evaluation-Verdict-Engine/src/storage/verdict-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_OUTCOME_VERDICTS";
  let dbPromise;

  const requestPromise=request=>
    new Promise((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;

        for(const [name,keyPath] of [
          ["policies","outcomeVerdictPolicyId"],
          ["verdicts","outcomeVerdictId"],
          ["reviews","outcomeVerdictReviewId"],
          ["learning_handoffs","learningPackageHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
          }
        }
      };

      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");

      await requestPromise(
        tx.objectStore(storeName).put(
          structuredClone(record)
        )
      );

      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "OM_VERDICT_STORAGE_ERROR",
        error?.message || "Verdict storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");

      const value=await requestPromise(
        tx.objectStore(storeName).get(id)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_VERDICT_RECORD_NOT_FOUND",
            "Verdict record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_VERDICT_STORAGE_ERROR",
        error?.message || "Verdict retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");

      const values=await requestPromise(
        tx.objectStore(storeName).getAll()
      );

      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "OM_VERDICT_STORAGE_ERROR",
        error?.message || "Verdict listing failed."
      );
    }
  }

  global.INFINICUS.OM.outcomeVerdictStore=
    Object.freeze({open,put,get,list});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-22-Outcome-Evaluation-Verdict-Engine/src/engine/outcome-evaluation-verdict-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.outcomeVerdictPolicyModel.create(
        input
      );

    if(!built.ok) return built;

    return global.INFINICUS.OM.outcomeVerdictStore.put(
      "policies",
      built.data
    );
  }

  async function evaluate({
    outcomeVerdictHandoffId,
    outcomeVerdictPolicyId
  }={}){
    const handoff=
      await global.INFINICUS.OM.outcomeEvidenceAuditTrailEngine
        .getOutcomeVerdictHandoff({
          outcomeVerdictHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.outcomeVerdictStore.get(
        "policies",
        outcomeVerdictPolicyId
      );

    if(!policy.ok) return policy;

    const evaluated=
      global.INFINICUS.OM.outcomeVerdictEvaluator.evaluate({
        handoff:handoff.data,
        policy:policy.data
      });

    if(!evaluated.valid){
      return runtime.failure(
        "OM_OUTCOME_VERDICT_INVALID",
        "Outcome verdict evaluation failed.",
        evaluated
      );
    }

    const verdict={
      outcomeVerdictId:
        runtime.createId("om_outcome_verdict"),
      monitoringContractId:
        handoff.data.monitoringContractId,
      outcomeAuditPackageId:
        handoff.data.outcomeAuditPackageId,
      packageHash:
        handoff.data.packageHash,
      verdict:
        evaluated.verdict,
      rationale:
        runtime.clone(evaluated.reasons),
      evaluationMetrics:
        runtime.clone(evaluated.metrics),
      humanReviewRequired:
        evaluated.humanReviewRequired,
      reviewStatus:
        evaluated.humanReviewRequired
          ? "pending"
          : "not_required",
      confidence:
        handoff.data.confidence,
      reliability:
        handoff.data.reliability,
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      status:"issued",
      issuedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.outcomeVerdictStore.put(
      "verdicts",
      verdict
    );

    const learningHandoff={
      learningPackageHandoffId:
        runtime.createId("om_learning_package_handoff"),
      targetBlock:"OM-23",
      monitoringContractId:
        handoff.data.monitoringContractId,
      outcomeVerdictId:
        verdict.outcomeVerdictId,
      outcomeAuditPackageId:
        verdict.outcomeAuditPackageId,
      verdict:
        verdict.verdict,
      rationale:
        verdict.rationale.map(runtime.clone),
      evaluationMetrics:
        runtime.clone(verdict.evaluationMetrics),
      comparisons:
        handoff.data.comparisons.map(runtime.clone),
      confidenceRatings:
        handoff.data.confidenceRatings.map(runtime.clone),
      reliabilityRatings:
        handoff.data.reliabilityRatings.map(runtime.clone),
      benefitAssessments:
        handoff.data.benefitAssessments.map(runtime.clone),
      adverseOutcomes:
        handoff.data.adverseOutcomes.map(runtime.clone),
      monitoringExceptions:
        handoff.data.monitoringExceptions.map(runtime.clone),
      causationAssessments:
        handoff.data.causationAssessments.map(runtime.clone),
      attributionAssessments:
        handoff.data.attributionAssessments.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        handoff.data.confidence,
      reliability:
        handoff.data.reliability,
      status:
        verdict.humanReviewRequired
          ? "awaiting_review"
          : "ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.outcomeVerdictStore.put(
      "learning_handoffs",
      learningHandoff
    );

    await runtime.emit(
      "om.outcome_verdict.issued",
      {
        outcomeVerdictId:
          verdict.outcomeVerdictId,
        verdict:
          verdict.verdict,
        learningPackageHandoffId:
          learningHandoff.learningPackageHandoffId
      }
    );

    return runtime.success({
      outcomeVerdict:verdict,
      learningPackageHandoff:learningHandoff
    });
  }

  async function review({
    outcomeVerdictId,
    reviewedBy,
    decision,
    note=null
  }={}){
    const verdict=
      await global.INFINICUS.OM.outcomeVerdictStore.get(
        "verdicts",
        outcomeVerdictId
      );

    if(!verdict.ok) return verdict;

    if(!verdict.data.humanReviewRequired){
      return runtime.failure(
        "OM_VERDICT_REVIEW_NOT_REQUIRED",
        "This verdict does not require human review."
      );
    }

    if(!["approved","rejected","revised"].includes(decision)){
      return runtime.failure(
        "OM_VERDICT_REVIEW_DECISION_INVALID",
        "Review decision is invalid."
      );
    }

    const review={
      outcomeVerdictReviewId:
        runtime.createId("om_verdict_review"),
      outcomeVerdictId,
      reviewedBy:String(reviewedBy || "unknown"),
      decision,
      note,
      reviewedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.outcomeVerdictStore.put(
      "reviews",
      review
    );

    const updated={
      ...verdict.data,
      reviewStatus:decision,
      reviewedAt:review.reviewedAt
    };

    await global.INFINICUS.OM.outcomeVerdictStore.put(
      "verdicts",
      updated
    );

    return runtime.success({
      outcomeVerdict:updated,
      review
    });
  }

  const api=Object.freeze({
    registerPolicy,
    evaluate,
    review,
    getVerdict:({outcomeVerdictId}) =>
      global.INFINICUS.OM.outcomeVerdictStore.get(
        "verdicts",
        outcomeVerdictId
      ),
    getLearningPackageHandoff:({
      learningPackageHandoffId
    }) =>
      global.INFINICUS.OM.outcomeVerdictStore.get(
        "learning_handoffs",
        learningPackageHandoffId
      ),
    listVerdicts:() =>
      global.INFINICUS.OM.outcomeVerdictStore.list(
        "verdicts"
      )
  });

  runtime.registerService(
    "om.outcome_evaluation_verdict",
    api,
    {block:"OM-22"}
  );

  runtime.registerRoute(
    "om.outcome_verdict_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.outcome_verdict.evaluate",
    evaluate
  );

  runtime.registerRoute(
    "om.outcome_verdict.review",
    review
  );

  global.INFINICUS.OM.outcomeEvaluationVerdictEngine=api;
})(window);

/* ===== INFINICUS-OM-23-Learning-Package-Generation-Engine ===== */

/* --- outcome-monitoring/INFINICUS-OM-23-Learning-Package-Generation-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";

  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-23.");
  }

  if(!OM?.outcomeEvaluationVerdictEngine){
    throw new Error("OM-22 must be loaded before OM-23.");
  }
})(window);

/* --- outcome-monitoring/INFINICUS-OM-23-Learning-Package-Generation-Engine/src/model/learning-policy.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_LEARNING_POLICY_INVALID",
        "Learning policy name and code are required."
      );
    }

    return runtime.success({
      learningPackagePolicyId:
        input.learningPackagePolicyId ||
        runtime.createId("om_learning_policy"),
      name:String(input.name),
      code:String(input.code),
      minimumConfidence:
        Math.max(0,Math.min(1,Number(input.minimumConfidence ?? 0.5))),
      minimumReliability:
        Math.max(0,Math.min(1,Number(input.minimumReliability ?? 0.5))),
      allowHypotheses:
        input.allowHypotheses !== false,
      requireLimitations:
        input.requireLimitations !== false,
      requireApplicabilityScope:
        input.requireApplicabilityScope !== false,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.learningPackagePolicyModel=
    Object.freeze({create});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-23-Learning-Package-Generation-Engine/src/extraction/lesson-extractor.js --- */
(function(global){
  "use strict";

  function extract({
    handoff,
    policy,
    context={}
  }={}){
    const lessons=[];
    const successFactors=[];
    const failureFactors=[];
    const hypotheses=[];
    const limitations=[];

    const highConfidence=
      Number(handoff.confidence ?? 0) >=
      policy.minimumConfidence;

    const highReliability=
      Number(handoff.reliability ?? 0) >=
      policy.minimumReliability;

    for(const comparison of handoff.comparisons || []){
      if(comparison.outcomeStatus==="achieved"){
        successFactors.push({
          metricId:comparison.metricId,
          type:"target_achievement",
          evidenceReference:
            comparison.expectedActualComparisonId,
          confidence:
            comparison.adjustedConfidence
        });
      }

      if(
        ["underperforming","failed"].includes(
          comparison.outcomeStatus
        )
      ){
        failureFactors.push({
          metricId:comparison.metricId,
          type:"target_underperformance",
          evidenceReference:
            comparison.expectedActualComparisonId,
          confidence:
            comparison.adjustedConfidence
        });
      }
    }

    for(const benefit of handoff.benefitAssessments || []){
      lessons.push({
        learningItemId:
          `benefit_${benefit.benefitRealizationAssessmentId}`,
        category:"benefit_realization",
        metricId:benefit.metricId,
        statement:
          benefit.status==="realized"
            ? "The monitored action produced a realized benefit."
            : benefit.status==="partially_realized"
              ? "The monitored action produced only part of the expected benefit."
              : "The expected benefit was not demonstrated.",
        evidenceReference:
          benefit.benefitRealizationAssessmentId,
        evidenceType:"factual",
        confidence:
          Math.min(
            Number(benefit.confidenceScore ?? 0),
            Number(benefit.reliabilityScore ?? 0)
          )
      });
    }

    for(const adverse of handoff.adverseOutcomes || []){
      lessons.push({
        learningItemId:
          `adverse_${adverse.adverseOutcomeDetectionId}`,
        category:"adverse_outcome",
        metricId:adverse.metricId,
        statement:
          "The action was associated with a material adverse outcome that must influence future decisions.",
        evidenceReference:
          adverse.adverseOutcomeDetectionId,
        evidenceType:
          adverse.causationClassification==="strong_causal_support"
            ? "factual"
            : "contextual",
        confidence:
          adverse.confidence
      });
    }

    for(const exception of handoff.monitoringExceptions || []){
      if(!["resolved","waived"].includes(exception.state)){
        limitations.push(
          `Unresolved monitoring exception: ${exception.exceptionType}`
        );
      }
    }

    if(!highConfidence){
      limitations.push(
        "Outcome confidence is below the preferred learning threshold."
      );
    }

    if(!highReliability){
      limitations.push(
        "Outcome reliability is below the preferred learning threshold."
      );
    }

    if(
      policy.allowHypotheses &&
      handoff.verdict==="inconclusive"
    ){
      hypotheses.push({
        hypothesisId:"hypothesis_inconclusive_outcome",
        statement:
          "Additional observations may resolve the inconclusive outcome.",
        evidenceScope:"current_monitoring_contract",
        confidence:
          Math.min(
            Number(handoff.confidence ?? 0),
            Number(handoff.reliability ?? 0)
          )
      });
    }

    return {
      lessons,
      successFactors,
      failureFactors,
      hypotheses,
      limitations,
      applicabilityScope:
        context.applicabilityScope ||
        "same business, same action class, comparable operating conditions"
    };
  }

  global.INFINICUS.OM.lessonExtractor=
    Object.freeze({extract});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-23-Learning-Package-Generation-Engine/src/storage/learning-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_LEARNING_PACKAGES";
  let dbPromise;

  const requestPromise=request=>
    new Promise((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;

        for(const [name,keyPath] of [
          ["policies","learningPackagePolicyId"],
          ["packages","outcomeLearningPackageId"],
          ["items","learningItemRecordId"],
          ["publication_handoffs","learningPublicationHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
          }
        }
      };

      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");

      await requestPromise(
        tx.objectStore(storeName).put(
          structuredClone(record)
        )
      );

      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "OM_LEARNING_STORAGE_ERROR",
        error?.message || "Learning storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");

      const value=await requestPromise(
        tx.objectStore(storeName).get(id)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_LEARNING_RECORD_NOT_FOUND",
            "Learning record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_LEARNING_STORAGE_ERROR",
        error?.message || "Learning retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");

      const values=await requestPromise(
        tx.objectStore(storeName).getAll()
      );

      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "OM_LEARNING_STORAGE_ERROR",
        error?.message || "Learning listing failed."
      );
    }
  }

  global.INFINICUS.OM.learningPackageStore=
    Object.freeze({open,put,get,list});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-23-Learning-Package-Generation-Engine/src/engine/learning-package-generation-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.learningPackagePolicyModel.create(
        input
      );

    if(!built.ok) return built;

    return global.INFINICUS.OM.learningPackageStore.put(
      "policies",
      built.data
    );
  }

  async function generate({
    learningPackageHandoffId,
    learningPackagePolicyId,
    learningContext={}
  }={}){
    const handoff=
      await global.INFINICUS.OM.outcomeEvaluationVerdictEngine
        .getLearningPackageHandoff({
          learningPackageHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.learningPackageStore.get(
        "policies",
        learningPackagePolicyId
      );

    if(!policy.ok) return policy;

    const extracted=
      global.INFINICUS.OM.lessonExtractor.extract({
        handoff:handoff.data,
        policy:policy.data,
        context:learningContext
      });

    if(
      policy.data.requireLimitations &&
      !Array.isArray(extracted.limitations)
    ){
      return runtime.failure(
        "OM_LEARNING_LIMITATIONS_REQUIRED",
        "Learning package limitations are required."
      );
    }

    if(
      policy.data.requireApplicabilityScope &&
      !extracted.applicabilityScope
    ){
      return runtime.failure(
        "OM_LEARNING_SCOPE_REQUIRED",
        "Learning applicability scope is required."
      );
    }

    const learningPackage={
      outcomeLearningPackageId:
        runtime.createId("om_learning_package"),
      monitoringContractId:
        handoff.data.monitoringContractId,
      outcomeVerdictId:
        handoff.data.outcomeVerdictId,
      outcomeAuditPackageId:
        handoff.data.outcomeAuditPackageId,
      verdict:
        handoff.data.verdict,
      rationale:
        handoff.data.rationale.map(runtime.clone),
      lessons:
        extracted.lessons.map(runtime.clone),
      successFactors:
        extracted.successFactors.map(runtime.clone),
      failureFactors:
        extracted.failureFactors.map(runtime.clone),
      hypotheses:
        extracted.hypotheses.map(runtime.clone),
      limitations:
        extracted.limitations.map(String),
      applicabilityScope:
        extracted.applicabilityScope,
      decisionRuleFeedback:
        runtime.clone(
          learningContext.decisionRuleFeedback || []
        ),
      modelCalibrationFeedback:
        runtime.clone(
          learningContext.modelCalibrationFeedback || []
        ),
      dataQualityLearning:
        runtime.clone(
          learningContext.dataQualityLearning || []
        ),
      operationalLearning:
        runtime.clone(
          learningContext.operationalLearning || []
        ),
      riskLearning:
        runtime.clone(
          learningContext.riskLearning || []
        ),
      confidence:
        handoff.data.confidence,
      reliability:
        handoff.data.reliability,
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      status:"generated",
      generatedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.learningPackageStore.put(
      "packages",
      learningPackage
    );

    for(const item of learningPackage.lessons){
      await global.INFINICUS.OM.learningPackageStore.put(
        "items",
        {
          learningItemRecordId:
            runtime.createId("om_learning_item"),
          outcomeLearningPackageId:
            learningPackage.outcomeLearningPackageId,
          item:runtime.clone(item),
          createdAt:new Date().toISOString()
        }
      );
    }

    const publicationHandoff={
      learningPublicationHandoffId:
        runtime.createId("om_learning_publication_handoff"),
      targetBlock:"OM-24",
      monitoringContractId:
        handoff.data.monitoringContractId,
      outcomeLearningPackageId:
        learningPackage.outcomeLearningPackageId,
      outcomeVerdictId:
        handoff.data.outcomeVerdictId,
      verdict:
        learningPackage.verdict,
      lessons:
        learningPackage.lessons.map(runtime.clone),
      successFactors:
        learningPackage.successFactors.map(runtime.clone),
      failureFactors:
        learningPackage.failureFactors.map(runtime.clone),
      hypotheses:
        learningPackage.hypotheses.map(runtime.clone),
      limitations:
        learningPackage.limitations.map(String),
      applicabilityScope:
        learningPackage.applicabilityScope,
      decisionRuleFeedback:
        learningPackage.decisionRuleFeedback.map(runtime.clone),
      modelCalibrationFeedback:
        learningPackage.modelCalibrationFeedback.map(runtime.clone),
      dataQualityLearning:
        learningPackage.dataQualityLearning.map(runtime.clone),
      operationalLearning:
        learningPackage.operationalLearning.map(runtime.clone),
      riskLearning:
        learningPackage.riskLearning.map(runtime.clone),
      correlationId:
        learningPackage.correlationId,
      lineage:
        learningPackage.lineage.map(runtime.clone),
      confidence:
        learningPackage.confidence,
      reliability:
        learningPackage.reliability,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.learningPackageStore.put(
      "publication_handoffs",
      publicationHandoff
    );

    await runtime.emit(
      "om.learning_package.generated",
      {
        outcomeLearningPackageId:
          learningPackage.outcomeLearningPackageId,
        learningPublicationHandoffId:
          publicationHandoff.learningPublicationHandoffId
      }
    );

    return runtime.success({
      learningPackage,
      learningPublicationHandoff:publicationHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    generate,
    getLearningPackage:({
      outcomeLearningPackageId
    }) =>
      global.INFINICUS.OM.learningPackageStore.get(
        "packages",
        outcomeLearningPackageId
      ),
    getLearningPublicationHandoff:({
      learningPublicationHandoffId
    }) =>
      global.INFINICUS.OM.learningPackageStore.get(
        "publication_handoffs",
        learningPublicationHandoffId
      ),
    listLearningPackages:() =>
      global.INFINICUS.OM.learningPackageStore.list(
        "packages"
      )
  });

  runtime.registerService(
    "om.learning_package_generation",
    api,
    {block:"OM-23"}
  );

  runtime.registerRoute(
    "om.learning_package_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.learning_package.generate",
    generate
  );

  global.INFINICUS.OM.learningPackageGenerationEngine=api;
})(window);

/* ===== INFINICUS-OM-24-Continuous-Learning-Publication-Handoff-Engine ===== */

/* --- outcome-monitoring/INFINICUS-OM-24-Continuous-Learning-Publication-Handoff-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-24.");
  }

  if(!OM?.learningPackageGenerationEngine){
    throw new Error("OM-23 must be loaded before OM-24.");
  }
})(window);

/* --- outcome-monitoring/INFINICUS-OM-24-Continuous-Learning-Publication-Handoff-Engine/src/model/publication-policy.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_PUBLICATION_POLICY_INVALID",
        "Publication policy name and code are required."
      );
    }

    return runtime.success({
      learningPublicationPolicyId:
        input.learningPublicationPolicyId ||
        runtime.createId("om_learning_publication_policy"),
      name:String(input.name),
      code:String(input.code),
      minimumConfidence:
        Math.max(0,Math.min(1,Number(input.minimumConfidence ?? 0.5))),
      minimumReliability:
        Math.max(0,Math.min(1,Number(input.minimumReliability ?? 0.5))),
      requireApplicabilityScope:
        input.requireApplicabilityScope !== false,
      requireLimitations:
        input.requireLimitations !== false,
      allowHypotheses:
        input.allowHypotheses !== false,
      maximumAttempts:
        Math.max(1,Number(input.maximumAttempts || 3)),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.learningPublicationPolicyModel=
    Object.freeze({create});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-24-Continuous-Learning-Publication-Handoff-Engine/src/validation/publication-validator.js --- */
(function(global){
  "use strict";

  function validate({
    handoff,
    policy,
    target
  }={}){
    const issues=[];

    if(policy.status!=="active"){
      issues.push("Publication policy is inactive.");
    }

    if(target.status!=="active"){
      issues.push("Publication target is inactive.");
    }

    if(!handoff.outcomeLearningPackageId){
      issues.push("Learning package ID is required.");
    }

    if(
      Number(handoff.confidence ?? 0) <
      policy.minimumConfidence
    ){
      issues.push("Learning confidence is below publication minimum.");
    }

    if(
      Number(handoff.reliability ?? 0) <
      policy.minimumReliability
    ){
      issues.push("Learning reliability is below publication minimum.");
    }

    if(
      policy.requireApplicabilityScope &&
      !handoff.applicabilityScope
    ){
      issues.push("Applicability scope is required.");
    }

    if(
      policy.requireLimitations &&
      !Array.isArray(handoff.limitations)
    ){
      issues.push("Limitations are required.");
    }

    if(
      !policy.allowHypotheses &&
      Array.isArray(handoff.hypotheses) &&
      handoff.hypotheses.length
    ){
      issues.push("Hypotheses are not allowed by publication policy.");
    }

    if(!Array.isArray(handoff.lineage) || !handoff.lineage.length){
      issues.push("Learning lineage is required.");
    }

    return {
      valid:issues.length===0,
      issues
    };
  }

  global.INFINICUS.OM.learningPublicationValidator=
    Object.freeze({validate});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-24-Continuous-Learning-Publication-Handoff-Engine/src/storage/publication-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_LEARNING_PUBLICATION";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;

        for(const [name,keyPath] of [
          ["policies","learningPublicationPolicyId"],
          ["targets","learningPublicationTargetId"],
          ["publications","learningPublicationId"],
          ["receipts","learningPublicationReceiptId"],
          ["failures","learningPublicationFailureId"],
          ["assembly_handoffs","outcomeMonitoringAssemblyHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});

            if(name==="publications"){
              store.createIndex(
                "idempotencyKey",
                "idempotencyKey",
                {unique:true}
              );
            }
          }
        }
      };

      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "OM_PUBLICATION_STORAGE_ERROR",
        error?.message || "Publication storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_PUBLICATION_RECORD_NOT_FOUND",
            "Publication record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_PUBLICATION_STORAGE_ERROR",
        error?.message || "Publication retrieval failed."
      );
    }
  }

  async function getByIdempotencyKey(key){
    try{
      const db=await open();
      const tx=db.transaction("publications","readonly");
      const value=await reqp(
        tx.objectStore("publications")
          .index("idempotencyKey")
          .get(key)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_PUBLICATION_NOT_FOUND",
            "Publication was not previously completed."
          );
    }catch(error){
      return runtime.failure(
        "OM_PUBLICATION_STORAGE_ERROR",
        error?.message || "Publication lookup failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "OM_PUBLICATION_STORAGE_ERROR",
        error?.message || "Publication listing failed."
      );
    }
  }

  global.INFINICUS.OM.learningPublicationStore=
    Object.freeze({
      open,
      put,
      get,
      getByIdempotencyKey,
      list
    });
})(window);

/* --- outcome-monitoring/INFINICUS-OM-24-Continuous-Learning-Publication-Handoff-Engine/src/engine/continuous-learning-publication-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const publishers=new Map();

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.learningPublicationPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.learningPublicationStore.put(
      "policies",
      built.data
    );
  }

  async function registerTarget(input={}){
    if(!input.name || !input.targetType){
      return runtime.failure(
        "OM_PUBLICATION_TARGET_INVALID",
        "Publication target name and targetType are required."
      );
    }

    const target={
      learningPublicationTargetId:
        input.learningPublicationTargetId ||
        runtime.createId("om_learning_target"),
      name:String(input.name),
      targetType:String(input.targetType),
      endpointReference:input.endpointReference || null,
      credentialReference:input.credentialReference || null,
      supportedPackageVersion:
        String(input.supportedPackageVersion || "1.0.0"),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    };

    return global.INFINICUS.OM.learningPublicationStore.put(
      "targets",
      target
    );
  }

  function registerPublisher(targetType,publisher){
    if(!targetType || typeof publisher!=="function"){
      return runtime.failure(
        "OM_PUBLISHER_INVALID",
        "Target type and publisher function are required."
      );
    }

    publishers.set(targetType,publisher);
    return runtime.success({targetType});
  }

  async function publish({
    learningPublicationHandoffId,
    learningPublicationPolicyId,
    learningPublicationTargetId
  }={}){
    const handoff=
      await global.INFINICUS.OM.learningPackageGenerationEngine
        .getLearningPublicationHandoff({
          learningPublicationHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.learningPublicationStore.get(
        "policies",
        learningPublicationPolicyId
      );

    if(!policy.ok) return policy;

    const target=
      await global.INFINICUS.OM.learningPublicationStore.get(
        "targets",
        learningPublicationTargetId
      );

    if(!target.ok) return target;

    const validation=
      global.INFINICUS.OM.learningPublicationValidator.validate({
        handoff:handoff.data,
        policy:policy.data,
        target:target.data
      });

    if(!validation.valid){
      return runtime.failure(
        "OM_LEARNING_PUBLICATION_INVALID",
        "Learning package failed publication validation.",
        validation
      );
    }

    const idempotencyKey=
      `om_learning_${handoff.data.outcomeLearningPackageId}_${target.data.learningPublicationTargetId}`;

    const existing=
      await global.INFINICUS.OM.learningPublicationStore
        .getByIdempotencyKey(idempotencyKey);

    if(existing.ok){
      return runtime.success({
        publication:existing.data,
        idempotentReplay:true
      });
    }

    const publisher=publishers.get(target.data.targetType);

    if(!publisher){
      return runtime.failure(
        "OM_LEARNING_PUBLISHER_NOT_FOUND",
        `No publisher registered for target type: ${target.data.targetType}`
      );
    }

    let publicationResponse;
    let lastError;

    for(
      let attempt=1;
      attempt<=policy.data.maximumAttempts;
      attempt++
    ){
      try{
        publicationResponse=
          await publisher({
            target:runtime.clone(target.data),
            learningPackage:runtime.clone(handoff.data),
            attempt
          });
        lastError=null;
        break;
      }catch(error){
        lastError=error;

        await global.INFINICUS.OM.learningPublicationStore.put(
          "failures",
          {
            learningPublicationFailureId:
              runtime.createId("om_learning_publication_failure"),
            outcomeLearningPackageId:
              handoff.data.outcomeLearningPackageId,
            learningPublicationTargetId:
              target.data.learningPublicationTargetId,
            attempt,
            error:{
              message:error?.message || "Publication attempt failed."
            },
            createdAt:new Date().toISOString()
          }
        );
      }
    }

    if(lastError){
      return runtime.failure(
        "OM_LEARNING_PUBLICATION_FAILED",
        lastError?.message || "Learning publication failed."
      );
    }

    const publication={
      learningPublicationId:
        runtime.createId("om_learning_publication"),
      outcomeLearningPackageId:
        handoff.data.outcomeLearningPackageId,
      outcomeVerdictId:
        handoff.data.outcomeVerdictId,
      monitoringContractId:
        handoff.data.monitoringContractId,
      learningPublicationTargetId:
        target.data.learningPublicationTargetId,
      idempotencyKey,
      packageVersion:"1.0.0",
      publicationResponse:
        runtime.clone(publicationResponse || {}),
      confidence:
        handoff.data.confidence,
      reliability:
        handoff.data.reliability,
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      status:"published",
      publishedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.learningPublicationStore.put(
      "publications",
      publication
    );

    const receipt={
      learningPublicationReceiptId:
        runtime.createId("om_learning_publication_receipt"),
      learningPublicationId:
        publication.learningPublicationId,
      outcomeLearningPackageId:
        publication.outcomeLearningPackageId,
      targetType:
        target.data.targetType,
      targetReference:
        target.data.endpointReference,
      externalPublicationId:
        publicationResponse?.publicationId || null,
      status:"accepted",
      receivedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.learningPublicationStore.put(
      "receipts",
      receipt
    );

    const assemblyHandoff={
      outcomeMonitoringAssemblyHandoffId:
        runtime.createId("om_assembly_handoff"),
      targetBlock:"OM-25",
      monitoringContractId:
        handoff.data.monitoringContractId,
      outcomeLearningPackageId:
        handoff.data.outcomeLearningPackageId,
      outcomeVerdictId:
        handoff.data.outcomeVerdictId,
      learningPublicationId:
        publication.learningPublicationId,
      learningPublicationReceiptId:
        receipt.learningPublicationReceiptId,
      verdict:
        handoff.data.verdict,
      publicationTarget:
        runtime.clone(target.data),
      confidence:
        handoff.data.confidence,
      reliability:
        handoff.data.reliability,
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      status:"published",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.learningPublicationStore.put(
      "assembly_handoffs",
      assemblyHandoff
    );

    await runtime.emit(
      "om.learning_package.published",
      {
        learningPublicationId:
          publication.learningPublicationId,
        outcomeMonitoringAssemblyHandoffId:
          assemblyHandoff.outcomeMonitoringAssemblyHandoffId
      }
    );

    return runtime.success({
      publication,
      receipt,
      outcomeMonitoringAssemblyHandoff:assemblyHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    registerTarget,
    registerPublisher,
    publish,
    getPublication:({learningPublicationId}) =>
      global.INFINICUS.OM.learningPublicationStore.get(
        "publications",
        learningPublicationId
      ),
    getOutcomeMonitoringAssemblyHandoff:({
      outcomeMonitoringAssemblyHandoffId
    }) =>
      global.INFINICUS.OM.learningPublicationStore.get(
        "assembly_handoffs",
        outcomeMonitoringAssemblyHandoffId
      ),
    listPublications:() =>
      global.INFINICUS.OM.learningPublicationStore.list(
        "publications"
      )
  });

  runtime.registerService(
    "om.continuous_learning_publication",
    api,
    {block:"OM-24"}
  );

  runtime.registerRoute(
    "om.learning_publication_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.learning_publication_target.register",
    registerTarget
  );

  runtime.registerRoute(
    "om.learning_package.publish",
    publish
  );

  global.INFINICUS.OM.continuousLearningPublicationEngine=api;
})(window);

/* ===== INFINICUS-OM-25-Master-Integration-Production-Assembly-Deployment-Engine ===== */

/* --- outcome-monitoring/INFINICUS-OM-25-Master-Integration-Production-Assembly-Deployment-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";

  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-25.");
  }

  if(!OM?.continuousLearningPublicationEngine){
    throw new Error("OM-24 must be loaded before OM-25.");
  }
})(window);

/* --- outcome-monitoring/INFINICUS-OM-25-Master-Integration-Production-Assembly-Deployment-Engine/src/manifest/om-layer-manifest.js --- */
(function(global){
  "use strict";

  const blocks=[
    ["OM-01","runtime","Outcome Monitoring Core Runtime and Registry"],
    ["OM-02","monitoringContractIntakeEngine","Monitoring Contract Intake and Validation Engine"],
    ["OM-03","metricKPIRegistryEngine","Metric and KPI Registry"],
    ["OM-04","observationSourceConnectorRegistryEngine","Observation Source and Connector Registry"],
    ["OM-05","observationCollectionEngine","Observation Collection Engine"],
    ["OM-06","dataQualityEvidenceValidationEngine","Data Quality and Evidence Validation Engine"],
    ["OM-07","baselineTargetRegistryEngine","Baseline and Target Registry"],
    ["OM-08","observationWindowScheduleEngine","Observation Window and Monitoring Schedule Engine"],
    ["OM-09","metricNormalizationAggregationEngine","Metric Normalization and Aggregation Engine"],
    ["OM-10","outcomeProgressCalculationEngine","Outcome Progress Calculation Engine"],
    ["OM-11","varianceThresholdDetectionEngine","Variance and Threshold Detection Engine"],
    ["OM-12","alertEscalationEngine","Alert and Escalation Engine"],
    ["OM-13","attributionEvidenceEngine","Attribution Evidence Engine"],
    ["OM-14","causationAssessmentEngine","Causation Assessment Engine"],
    ["OM-15","externalFactorConfounderEngine","External Factor and Confounder Engine"],
    ["OM-16","expectedActualComparisonEngine","Expected-versus-Actual Comparison Engine"],
    ["OM-17","outcomeConfidenceReliabilityEngine","Outcome Confidence and Reliability Engine"],
    ["OM-18","benefitRealizationEngine","Benefit Realization Engine"],
    ["OM-19","adverseOutcomeSideEffectEngine","Adverse Outcome and Side-Effect Detection Engine"],
    ["OM-20","monitoringExceptionMissingDataEngine","Monitoring Exception and Missing-Data Engine"],
    ["OM-21","outcomeEvidenceAuditTrailEngine","Outcome Evidence and Audit Trail Engine"],
    ["OM-22","outcomeEvaluationVerdictEngine","Outcome Evaluation and Verdict Engine"],
    ["OM-23","learningPackageGenerationEngine","Learning Package Generation Engine"],
    ["OM-24","continuousLearningPublicationEngine","Continuous Learning Publication and Handoff Engine"]
  ].map(([block,serviceKey,name],index)=>({
    block,
    sequence:index+1,
    serviceKey,
    name,
    version:"1.0.0",
    required:true
  }));

  const requiredRoutes=[
    "om.monitoring_contract.intake",
    "om.metrics.register_from_handoff",
    "om.observation_sources.bind_from_handoff",
    "om.observations.collect",
    "om.observations.validate_quality",
    "om.baselines_targets.register_from_handoff",
    "om.monitoring_schedules.create",
    "om.metrics.normalize_aggregate",
    "om.outcome_progress.calculate",
    "om.variance_thresholds.detect",
    "om.alerts.create",
    "om.attribution.assess",
    "om.causation.assess",
    "om.external_factors.evaluate",
    "om.expected_actual.compare",
    "om.outcome_confidence.rate",
    "om.benefit_realization.assess",
    "om.adverse_outcomes.detect",
    "om.monitoring_exceptions.detect",
    "om.outcome_audit.assemble",
    "om.outcome_verdict.evaluate",
    "om.learning_package.generate",
    "om.learning_package.publish"
  ];

  global.INFINICUS.OM.layerManifest=
    Object.freeze({
      layer:"Outcome Monitoring",
      version:"1.0.0",
      blocks:Object.freeze(blocks),
      requiredRoutes:Object.freeze(requiredRoutes),
      inputBoundary:"ABA-24",
      outputBoundary:"Continuous Learning",
      totalBlocks:25
    });
})(window);

/* --- outcome-monitoring/INFINICUS-OM-25-Master-Integration-Production-Assembly-Deployment-Engine/src/validation/readiness-validator.js --- */
(function(global){
  "use strict";

  function validate({
    runtime,
    manifest,
    config={}
  }={}){
    const issues=[];
    const services=[];

    for(const block of manifest.blocks){
      const present=
        Boolean(global.INFINICUS?.OM?.[block.serviceKey]);

      services.push({
        block:block.block,
        serviceKey:block.serviceKey,
        present
      });

      if(block.required && !present){
        issues.push(
          `${block.block} service is missing: ${block.serviceKey}`
        );
      }
    }

    const routes=[];

    for(const routeName of manifest.requiredRoutes){
      let present=false;

      try{
        present=Boolean(
          runtime.getRoute?.(routeName) ||
          runtime.routes?.get?.(routeName)
        );
      }catch{
        present=false;
      }

      routes.push({routeName,present});

      if(!present){
        issues.push(`Required route is missing: ${routeName}`);
      }
    }

    if(config.environment && !["development","staging","production"].includes(config.environment)){
      issues.push("Deployment environment is invalid.");
    }

    if(
      config.environment==="production" &&
      !config.releaseVersion
    ){
      issues.push("Release version is required for production.");
    }

    return {
      ready:issues.length===0,
      issues,
      services,
      routes
    };
  }

  global.INFINICUS.OM.outcomeMonitoringReadinessValidator=
    Object.freeze({validate});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-25-Master-Integration-Production-Assembly-Deployment-Engine/src/storage/master-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_MASTER_INTEGRATION";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;

        for(const [name,keyPath] of [
          ["assemblies","outcomeMonitoringAssemblyId"],
          ["manifests","outcomeMonitoringDeploymentManifestId"],
          ["deployments","outcomeMonitoringDeploymentId"],
          ["receipts","outcomeMonitoringDeploymentReceiptId"],
          ["rollbacks","outcomeMonitoringRollbackId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
          }
        }
      };

      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "OM_MASTER_STORAGE_ERROR",
        error?.message || "Master integration storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_MASTER_RECORD_NOT_FOUND",
            "Master integration record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_MASTER_STORAGE_ERROR",
        error?.message || "Master integration retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "OM_MASTER_STORAGE_ERROR",
        error?.message || "Master integration listing failed."
      );
    }
  }

  global.INFINICUS.OM.masterIntegrationStore=
    Object.freeze({open,put,get,list});
})(window);

/* --- outcome-monitoring/INFINICUS-OM-25-Master-Integration-Production-Assembly-Deployment-Engine/src/engine/master-integration-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const deploymentAdapters=new Map();

  function registerDeploymentAdapter(adapterType,adapter){
    if(!adapterType || typeof adapter!=="function"){
      return runtime.failure(
        "OM_DEPLOYMENT_ADAPTER_INVALID",
        "Adapter type and deployment function are required."
      );
    }

    deploymentAdapters.set(adapterType,adapter);
    return runtime.success({adapterType});
  }

  function diagnose(config={}){
    const result=
      global.INFINICUS.OM.outcomeMonitoringReadinessValidator.validate({
        runtime,
        manifest:global.INFINICUS.OM.layerManifest,
        config
      });

    return runtime.success({
      layer:"Outcome Monitoring",
      version:"1.0.0",
      totalBlocks:25,
      verifiedBlocks:
        result.services.filter(item=>item.present).length,
      verifiedRoutes:
        result.routes.filter(item=>item.present).length,
      productionReady:result.ready,
      issues:result.issues,
      services:result.services,
      routes:result.routes
    });
  }

  async function assemble({
    outcomeMonitoringAssemblyHandoffId,
    environment="staging",
    releaseVersion="1.0.0"
  }={}){
    const handoff=
      await global.INFINICUS.OM.continuousLearningPublicationEngine
        .getOutcomeMonitoringAssemblyHandoff({
          outcomeMonitoringAssemblyHandoffId
        });

    if(!handoff.ok) return handoff;

    const diagnostics=diagnose({
      environment,
      releaseVersion
    });

    if(!diagnostics.ok) return diagnostics;

    if(!diagnostics.data.productionReady){
      return runtime.failure(
        "OM_LAYER_NOT_READY",
        "Outcome Monitoring layer is not ready for assembly.",
        diagnostics.data
      );
    }

    const assembly={
      outcomeMonitoringAssemblyId:
        runtime.createId("om_layer_assembly"),
      outcomeMonitoringAssemblyHandoffId,
      layer:"Outcome Monitoring",
      version:"1.0.0",
      releaseVersion,
      environment,
      blocks:
        global.INFINICUS.OM.layerManifest.blocks.map(
          runtime.clone
        ),
      requiredRoutes:
        global.INFINICUS.OM.layerManifest.requiredRoutes.map(String),
      continuousLearningPublication:{
        learningPublicationId:
          handoff.data.learningPublicationId,
        learningPublicationReceiptId:
          handoff.data.learningPublicationReceiptId,
        outcomeLearningPackageId:
          handoff.data.outcomeLearningPackageId
      },
      confidence:
        handoff.data.confidence,
      reliability:
        handoff.data.reliability,
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      state:"assembled",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.masterIntegrationStore.put(
      "assemblies",
      assembly
    );

    const deploymentManifest={
      outcomeMonitoringDeploymentManifestId:
        runtime.createId("om_deployment_manifest"),
      outcomeMonitoringAssemblyId:
        assembly.outcomeMonitoringAssemblyId,
      layer:assembly.layer,
      layerVersion:assembly.version,
      releaseVersion,
      environment,
      entryNamespace:"window.INFINICUS.OM",
      masterAPI:
        "window.INFINICUS.OM.masterIntegrationEngine",
      blockOrder:
        assembly.blocks.map(item=>item.block),
      inputBoundary:"ABA-24",
      outputBoundary:"Continuous Learning",
      rollbackVersion:null,
      generatedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.masterIntegrationStore.put(
      "manifests",
      deploymentManifest
    );

    await runtime.emit(
      "om.layer.assembled",
      {
        outcomeMonitoringAssemblyId:
          assembly.outcomeMonitoringAssemblyId,
        outcomeMonitoringDeploymentManifestId:
          deploymentManifest.outcomeMonitoringDeploymentManifestId
      }
    );

    return runtime.success({
      assembly,
      deploymentManifest,
      diagnostics:diagnostics.data
    });
  }

  async function deploy({
    outcomeMonitoringDeploymentManifestId,
    adapterType,
    deploymentConfig={}
  }={}){
    const manifest=
      await global.INFINICUS.OM.masterIntegrationStore.get(
        "manifests",
        outcomeMonitoringDeploymentManifestId
      );

    if(!manifest.ok) return manifest;

    const adapter=deploymentAdapters.get(adapterType);

    if(!adapter){
      return runtime.failure(
        "OM_DEPLOYMENT_ADAPTER_NOT_FOUND",
        `No deployment adapter registered: ${adapterType}`
      );
    }

    const deployment={
      outcomeMonitoringDeploymentId:
        runtime.createId("om_deployment"),
      outcomeMonitoringDeploymentManifestId,
      adapterType,
      environment:manifest.data.environment,
      state:"deploying",
      startedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.masterIntegrationStore.put(
      "deployments",
      deployment
    );

    try{
      const response=
        await adapter({
          manifest:runtime.clone(manifest.data),
          config:runtime.clone(deploymentConfig)
        });

      const completed={
        ...deployment,
        state:"deployed",
        response:runtime.clone(response || {}),
        completedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.masterIntegrationStore.put(
        "deployments",
        completed
      );

      const receipt={
        outcomeMonitoringDeploymentReceiptId:
          runtime.createId("om_deployment_receipt"),
        outcomeMonitoringDeploymentId:
          completed.outcomeMonitoringDeploymentId,
        releaseVersion:
          manifest.data.releaseVersion,
        environment:
          manifest.data.environment,
        deploymentReference:
          response?.deploymentId || null,
        state:"deployed",
        createdAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.masterIntegrationStore.put(
        "receipts",
        receipt
      );

      await runtime.emit(
        "om.layer.deployed",
        {
          outcomeMonitoringDeploymentId:
            completed.outcomeMonitoringDeploymentId,
          outcomeMonitoringDeploymentReceiptId:
            receipt.outcomeMonitoringDeploymentReceiptId
        }
      );

      return runtime.success({
        deployment:completed,
        receipt
      });
    }catch(error){
      const failed={
        ...deployment,
        state:"failed",
        error:{
          message:error?.message || "Deployment failed."
        },
        completedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.masterIntegrationStore.put(
        "deployments",
        failed
      );

      return runtime.failure(
        "OM_DEPLOYMENT_FAILED",
        failed.error.message,
        failed
      );
    }
  }

  async function recordRollback({
    outcomeMonitoringDeploymentId,
    reason,
    rollbackVersion
  }={}){
    const deployment=
      await global.INFINICUS.OM.masterIntegrationStore.get(
        "deployments",
        outcomeMonitoringDeploymentId
      );

    if(!deployment.ok) return deployment;

    const rollback={
      outcomeMonitoringRollbackId:
        runtime.createId("om_rollback"),
      outcomeMonitoringDeploymentId,
      reason:String(reason || ""),
      rollbackVersion:String(rollbackVersion || ""),
      state:"recorded",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.masterIntegrationStore.put(
      "rollbacks",
      rollback
    );

    return runtime.success({rollback});
  }

  const api=Object.freeze({
    registerDeploymentAdapter,
    diagnose,
    assemble,
    deploy,
    recordRollback,
    getAssembly:({outcomeMonitoringAssemblyId}) =>
      global.INFINICUS.OM.masterIntegrationStore.get(
        "assemblies",
        outcomeMonitoringAssemblyId
      ),
    getDeployment:({outcomeMonitoringDeploymentId}) =>
      global.INFINICUS.OM.masterIntegrationStore.get(
        "deployments",
        outcomeMonitoringDeploymentId
      ),
    listDeployments:() =>
      global.INFINICUS.OM.masterIntegrationStore.list(
        "deployments"
      ),
    manifest:global.INFINICUS.OM.layerManifest
  });

  runtime.registerService(
    "om.master_integration",
    api,
    {block:"OM-25"}
  );

  runtime.registerRoute(
    "om.master.diagnose",
    diagnose
  );

  runtime.registerRoute(
    "om.master.assemble",
    assemble
  );

  runtime.registerRoute(
    "om.master.deploy",
    deploy
  );

  runtime.registerRoute(
    "om.master.rollback.record",
    recordRollback
  );

  global.INFINICUS.OM.masterIntegrationEngine=api;
})(window);
