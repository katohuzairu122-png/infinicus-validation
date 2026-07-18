(function(g){"use strict";const r=g.INFINICUS.BO.runtime;const store=g.INFINICUS.BO.fulfilmentDeliveryLogisticsEngineStore;

async function registerPolicy(input={}){
  const built=g.INFINICUS.BO.fulfilmentDeliveryLogisticsEnginePolicyModel.create(input);
  return built.ok?store.put("policies",built.data):built;
}

async function process(input={}){
  const policy=await store.get("policies",input.fulfilmentDeliveryLogisticsEnginePolicyId);
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
    fulfilmentDeliveryLogisticsEngineRecordId:r.createId("bo_record"),
    block:"BO-14",
    purpose:"Control fulfilment, dispatch, routing, delivery tracking, proof of delivery, failures, and returns.",
    businessId,
    entityType:String(input.entityType||"fulfilmentDeliveryLogisticsEngine"),
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
    eventType:String(input.eventType||"bo.fulfilment.process"),
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
    workforceOperationsHandoffId:r.createId("bo_handoff"),
    sourceBlock:"BO-14",
    targetBlock:"BO-15",
    sourceRecordId:record.fulfilmentDeliveryLogisticsEngineRecordId,
    businessId:record.businessId,
    record:r.clone(record),
    event:r.clone(event),
    correlationId:record.correlationId,
    lineage:record.lineage.map(r.clone),
    status:["completed","executed","authorized"].includes(record.state)?"ready":"pending",
    createdAt:new Date().toISOString()
  };

  await store.put("handoffs",handoff);
  await r.emit("bo.fulfilment.process.completed",{recordId:record.fulfilmentDeliveryLogisticsEngineRecordId,handoffId:handoff.workforceOperationsHandoffId});
  return r.success({record,event,handoff});
}

const api=Object.freeze({registerPolicy,process,
getRecord:({fulfilmentDeliveryLogisticsEngineRecordId})=>store.get("records",fulfilmentDeliveryLogisticsEngineRecordId),
getHandoff:({workforceOperationsHandoffId})=>store.get("handoffs",workforceOperationsHandoffId),
listRecords:()=>store.list("records"),
listEvents:()=>store.list("events")});
r.registerService("bo.fulfilment_delivery_logistics_engine",api,{block:"BO-14"});

r.registerRoute("bo.fulfilment_policy.register",registerPolicy);
r.registerRoute("bo.fulfilment.process",process);

g.INFINICUS.BO.fulfilmentDeliveryLogisticsEngine=api;
})(window);
