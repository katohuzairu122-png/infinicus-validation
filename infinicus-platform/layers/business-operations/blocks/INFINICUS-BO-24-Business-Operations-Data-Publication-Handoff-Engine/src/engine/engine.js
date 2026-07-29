(function(g){"use strict";const r=g.INFINICUS.BO.runtime;const store=g.INFINICUS.BO.businessOperationsDataPublicationEngineStore;

async function registerPolicy(input={}){
  const built=g.INFINICUS.BO.businessOperationsDataPublicationEnginePolicyModel.create(input);
  return built.ok?store.put("policies",built.data):built;
}

async function process(input={}){
  const policy=await store.get("policies",input.businessOperationsDataPublicationEnginePolicyId);
  if(!policy.ok)return policy;

  const upstream=input.upstreamHandoff||{};
  const businessId=input.businessId||upstream.businessId||null;
  const evidence=r.clone(input.executionEvidence||[]);
  const requestedState=String(input.state||"planned");

  if(!["planned","authorized","executed","completed","failed","reversed"].includes(requestedState)){
    return r.failure("BO_OPERATIONAL_STATE_INVALID","Unsupported operational state.");
  }

  if(["executed","completed"].includes(requestedState) && evidence.length<policy.data.minimumEvidence){
    return r.failure("BO_EXECUTION_EVIDENCE_REQUIRED","Execution evidence is required for executed or completed state.");
  }

  if(policy.data.requireAuthorization && ["executed","completed"].includes(requestedState) && !input.authorizedBy){
    return r.failure("BO_AUTHORIZATION_REQUIRED","Authorization is required before execution.");
  }

  const record={
    businessOperationsDataPublicationEngineRecordId:r.createId("bo_record"),
    block:"BO-24",
    purpose:"Publish governed operational snapshots, transactions, events, risks, and quality indicators downstream.",
    businessId,
    entityType:String(input.entityType||"businessOperationsDataPublicationEngine"),
    entityId:input.entityId||r.createId("bo_entity"),
    operationType:String(input.operationType||"manage"),
    payload:r.clone(input.payload||{}),
    executionEvidence:evidence,
    authorizedBy:input.authorizedBy||null,
    state:requestedState,
    status:String(input.status||"active"),
    correlationId:input.correlationId||upstream.correlationId||r.createId("bo_correlation"),
    lineage:r.clone(input.lineage||upstream.lineage||[]),
    version:Number(input.version||1),
    createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };

  await store.put("records",record);

  r.registerEntity({
    entityId:record.entityId,
    entityType:record.entityType,
    businessId:record.businessId,
    status:record.status,
    version:record.version,
    correlationId:record.correlationId,
    lineage:record.lineage
  });

  r.setOperationalState({
    entityType:record.entityType,
    entityId:record.entityId,
    state:record.state,
    evidenceReference:evidence[0]?.evidenceReference||null,
    correlationId:record.correlationId
  });

  const event={
    operationalEventId:r.createId("bo_operational_event"),
    eventType:String(input.eventType||"bo.operations_data.publish"),
    businessId:record.businessId,
    entityType:record.entityType,
    entityId:record.entityId,
    state:record.state,
    correlationId:record.correlationId,
    lineage:record.lineage.map(r.clone),
    occurredAt:new Date().toISOString()
  };

  await store.put("events",event);

  const handoff={
    businessOperationsAssemblyHandoffId:r.createId("bo_handoff"),
    sourceBlock:"BO-24",
    targetBlock:"BO-25",
    sourceRecordId:record.businessOperationsDataPublicationEngineRecordId,
    businessId:record.businessId,
    record:r.clone(record),
    event:r.clone(event),
    correlationId:record.correlationId,
    lineage:record.lineage.map(r.clone),
    status:["completed","executed","authorized"].includes(record.state)?"ready":"pending",
    createdAt:new Date().toISOString()
  };

  await store.put("handoffs",handoff);
  await r.emit("bo.operations_data.publish.completed",{recordId:record.businessOperationsDataPublicationEngineRecordId,handoffId:handoff.businessOperationsAssemblyHandoffId});
  return r.success({record,event,handoff});
}

const api=Object.freeze({registerPolicy,process,
getRecord:({businessOperationsDataPublicationEngineRecordId})=>store.get("records",businessOperationsDataPublicationEngineRecordId),
getHandoff:({businessOperationsAssemblyHandoffId})=>store.get("handoffs",businessOperationsAssemblyHandoffId),
listRecords:()=>store.list("records"),
listEvents:()=>store.list("events")});
r.registerService("bo.business_operations_data_publication_engine",api,{block:"BO-24"});

r.registerRoute("bo.operations_publication_policy.register",registerPolicy);
r.registerRoute("bo.operations_data.publish",process);

g.INFINICUS.BO.businessOperationsDataPublicationEngine=api;
})(window);
