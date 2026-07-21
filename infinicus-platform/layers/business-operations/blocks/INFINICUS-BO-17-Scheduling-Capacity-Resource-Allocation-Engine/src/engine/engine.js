(function(g){"use strict";const r=g.INFINICUS.BO.runtime;const store=g.INFINICUS.BO.schedulingCapacityResourceAllocationEngineStore;

async function registerPolicy(input={}){
  const built=g.INFINICUS.BO.schedulingCapacityResourceAllocationEnginePolicyModel.create(input);
  return built.ok?store.put("policies",built.data):built;
}

async function process(input={}){
  const policy=await store.get("policies",input.schedulingCapacityResourceAllocationEnginePolicyId);
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
    schedulingCapacityResourceAllocationEngineRecordId:r.createId("bo_record"),
    block:"BO-17",
    purpose:"Manage schedules, capacity, appointments, workload balancing, conflicts, queues, and overbooking controls.",
    businessId,
    entityType:String(input.entityType||"schedulingCapacityResourceAllocationEngine"),
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
    eventType:String(input.eventType||"bo.resources.allocate"),
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
    assetMaintenanceHandoffId:r.createId("bo_handoff"),
    sourceBlock:"BO-17",
    targetBlock:"BO-18",
    sourceRecordId:record.schedulingCapacityResourceAllocationEngineRecordId,
    businessId:record.businessId,
    record:r.clone(record),
    event:r.clone(event),
    correlationId:record.correlationId,
    lineage:record.lineage.map(r.clone),
    status:["completed","executed","authorized"].includes(record.state)?"ready":"pending",
    createdAt:new Date().toISOString()
  };

  await store.put("handoffs",handoff);
  await r.emit("bo.resources.allocate.completed",{recordId:record.schedulingCapacityResourceAllocationEngineRecordId,handoffId:handoff.assetMaintenanceHandoffId});
  return r.success({record,event,handoff});
}

const api=Object.freeze({registerPolicy,process,
getRecord:({schedulingCapacityResourceAllocationEngineRecordId})=>store.get("records",schedulingCapacityResourceAllocationEngineRecordId),
getHandoff:({assetMaintenanceHandoffId})=>store.get("handoffs",assetMaintenanceHandoffId),
listRecords:()=>store.list("records"),
listEvents:()=>store.list("events")});
r.registerService("bo.scheduling_capacity_resource_allocation_engine",api,{block:"BO-17"});

r.registerRoute("bo.scheduling_policy.register",registerPolicy);
r.registerRoute("bo.resources.allocate",process);

g.INFINICUS.BO.schedulingCapacityResourceAllocationEngine=api;
})(window);
