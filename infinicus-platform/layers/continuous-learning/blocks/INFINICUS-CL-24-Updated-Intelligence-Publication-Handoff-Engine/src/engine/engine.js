(function(global){
  "use strict";
  const runtime=global.INFINICUS.CL.runtime;
  const store=global.INFINICUS.CL.updatedIntelligencePublicationEngineStore;

  async function registerPolicy(input={}){
    const built=global.INFINICUS.CL.updatedIntelligencePublicationEnginePolicyModel.create(input);
    if(!built.ok) return built;
    return store.put("policies",built.data);
  }

  async function process(input={}){
    const policyId=input.updatedIntelligencePublicationEnginePolicyId;
    const policy=await store.get("policies",policyId);
    if(!policy.ok) return policy;

    const upstream=input.upstreamHandoff||input.payload||{};
    const confidence=Number(upstream.confidence??input.confidence??0.7);
    const reliability=Number(upstream.reliability??input.reliability??0.7);

    const status=
      confidence>=policy.data.minimumConfidence &&
      reliability>=policy.data.minimumReliability
        ? (policy.data.requireHumanReview ? "review_required" : "accepted")
        : "insufficient_evidence";

    const record={
      updatedIntelligencePublicationEngineRecordId:runtime.createId("cl_record"),
      block:"CL-24",
      purpose:"Publish governed updates to downstream INFINICUS intelligence layers.",
      sourceBlock:"CL-23",
      status,
      confidence,
      reliability,
      findings:runtime.clone(input.findings||upstream.findings||[]),
      recommendations:runtime.clone(input.recommendations||[]),
      conflicts:runtime.clone(input.conflicts||[]),
      assumptions:runtime.clone(input.assumptions||[]),
      updates:runtime.clone(input.updates||[]),
      correlationId:upstream.correlationId||input.correlationId||null,
      lineage:runtime.clone(upstream.lineage||input.lineage||[]),
      createdAt:new Date().toISOString()
    };

    await store.put("records",record);

    const handoff={
      continuousLearningAssemblyHandoffId:runtime.createId("cl_handoff"),
      targetBlock:"CL-25",
      sourceBlock:"CL-24",
      sourceRecordId:record.updatedIntelligencePublicationEngineRecordId,
      record:runtime.clone(record),
      confidence,
      reliability,
      correlationId:record.correlationId,
      lineage:record.lineage.map(runtime.clone),
      status:status==="accepted"||status==="review_required" ? "ready" : "blocked",
      createdAt:new Date().toISOString()
    };

    await store.put("handoffs",handoff);
    await runtime.emit("cl.updated_intelligence.publish.completed",{sourceRecordId:record.updatedIntelligencePublicationEngineRecordId,handoffId:handoff.continuousLearningAssemblyHandoffId});
    return runtime.success({record,handoff});
  }


  const api=Object.freeze({registerPolicy,process,
    getRecord:({updatedIntelligencePublicationEngineRecordId})=>store.get("records",updatedIntelligencePublicationEngineRecordId),
    getHandoff:({continuousLearningAssemblyHandoffId})=>store.get("handoffs",continuousLearningAssemblyHandoffId),
    listRecords:()=>store.list("records")});
  runtime.registerService("cl.updated_intelligence_publication_engine",api,{block:"CL-24"});

  runtime.registerRoute("cl.updated_intelligence_policy.register",registerPolicy);
  runtime.registerRoute("cl.updated_intelligence.publish",process);

  global.INFINICUS.CL.updatedIntelligencePublicationEngine=api;
})(window);
