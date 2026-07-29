(function(g){"use strict";const r=g.INFINICUS.BO.runtime;const store=g.INFINICUS.BO.leadOpportunitySalesPipelineEngineStore;

async function registerPolicy(input={}){
  const built=g.INFINICUS.BO.leadOpportunitySalesPipelineEnginePolicyModel.create(input);
  return built.ok?store.put("policies",built.data):built;
}

async function process(input={}){
  const policy=await store.get("policies",input.leadOpportunitySalesPipelineEnginePolicyId);
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
    leadOpportunitySalesPipelineEngineRecordId:r.createId("bo_record"),
    block:"BO-06",
    purpose:"Control leads, qualification, opportunities, stages, expected value, ownership, and conversion.",
    businessId,
    entityType:String(input.entityType||"leadOpportunitySalesPipelineEngine"),
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
    eventType:String(input.eventType||"bo.sales_pipeline.process"),
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
    quotationPricingHandoffId:r.createId("bo_handoff"),
    sourceBlock:"BO-06",
    targetBlock:"BO-07",
    sourceRecordId:record.leadOpportunitySalesPipelineEngineRecordId,
    businessId:record.businessId,
    record:r.clone(record),
    event:r.clone(event),
    correlationId:record.correlationId,
    lineage:record.lineage.map(r.clone),
    status:["completed","executed","authorized"].includes(record.state)?"ready":"pending",
    createdAt:new Date().toISOString()
  };

  await store.put("handoffs",handoff);
  await r.emit("bo.sales_pipeline.process.completed",{recordId:record.leadOpportunitySalesPipelineEngineRecordId,handoffId:handoff.quotationPricingHandoffId});
  return r.success({record,event,handoff});
}

const api=Object.freeze({registerPolicy,process,
getRecord:({leadOpportunitySalesPipelineEngineRecordId})=>store.get("records",leadOpportunitySalesPipelineEngineRecordId),
getHandoff:({quotationPricingHandoffId})=>store.get("handoffs",quotationPricingHandoffId),
listRecords:()=>store.list("records"),
listEvents:()=>store.list("events")});
r.registerService("bo.lead_opportunity_sales_pipeline_engine",api,{block:"BO-06"});

r.registerRoute("bo.sales_pipeline_policy.register",registerPolicy);
r.registerRoute("bo.sales_pipeline.process",process);

g.INFINICUS.BO.leadOpportunitySalesPipelineEngine=api;
})(window);
