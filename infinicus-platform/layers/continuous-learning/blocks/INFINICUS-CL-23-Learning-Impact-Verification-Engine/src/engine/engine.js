(function(global){
  "use strict";
  const runtime=global.INFINICUS.CL.runtime;
  const store=global.INFINICUS.CL.learningImpactVerificationEngineStore;

  async function registerPolicy(input={}){
    const built=global.INFINICUS.CL.learningImpactVerificationEnginePolicyModel.create(input);
    if(!built.ok) return built;
    return store.put("policies",built.data);
  }

  async function process(input={}){
    const policyId=input.learningImpactVerificationEnginePolicyId;
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
      learningImpactVerificationEngineRecordId:runtime.createId("cl_record"),
      block:"CL-23",
      purpose:"Verify whether deployed learning improved future performance.",
      sourceBlock:"CL-22",
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
      updatedIntelligenceHandoffId:runtime.createId("cl_handoff"),
      targetBlock:"CL-24",
      sourceBlock:"CL-23",
      sourceRecordId:record.learningImpactVerificationEngineRecordId,
      record:runtime.clone(record),
      confidence,
      reliability,
      correlationId:record.correlationId,
      lineage:record.lineage.map(runtime.clone),
      status:status==="accepted"||status==="review_required" ? "ready" : "blocked",
      createdAt:new Date().toISOString()
    };

    await store.put("handoffs",handoff);
    await runtime.emit("cl.learning_impact.verify.completed",{sourceRecordId:record.learningImpactVerificationEngineRecordId,handoffId:handoff.updatedIntelligenceHandoffId});
    return runtime.success({record,handoff});
  }


  const api=Object.freeze({registerPolicy,process,
    getRecord:({learningImpactVerificationEngineRecordId})=>store.get("records",learningImpactVerificationEngineRecordId),
    getHandoff:({updatedIntelligenceHandoffId})=>store.get("handoffs",updatedIntelligenceHandoffId),
    listRecords:()=>store.list("records")});
  runtime.registerService("cl.learning_impact_verification_engine",api,{block:"CL-23"});

  runtime.registerRoute("cl.learning_impact_policy.register",registerPolicy);
  runtime.registerRoute("cl.learning_impact.verify",process);

  global.INFINICUS.CL.learningImpactVerificationEngine=api;
})(window);
