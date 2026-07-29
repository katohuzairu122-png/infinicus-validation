(function(global){
  "use strict";
  const runtime=global.INFINICUS.CL.runtime;
  const store=global.INFINICUS.CL.dataQualityObservationLearningEngineStore;

  async function registerPolicy(input={}){
    const built=global.INFINICUS.CL.dataQualityObservationLearningEnginePolicyModel.create(input);
    if(!built.ok) return built;
    return store.put("policies",built.data);
  }

  async function process(input={}){
    const policyId=input.dataQualityObservationLearningEnginePolicyId;
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
      dataQualityObservationLearningEngineRecordId:runtime.createId("cl_record"),
      block:"CL-16",
      purpose:"Learn from observation quality, source reliability, and missing-data patterns.",
      sourceBlock:"CL-15",
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
      operationalImprovementHandoffId:runtime.createId("cl_handoff"),
      targetBlock:"CL-17",
      sourceBlock:"CL-16",
      sourceRecordId:record.dataQualityObservationLearningEngineRecordId,
      record:runtime.clone(record),
      confidence,
      reliability,
      correlationId:record.correlationId,
      lineage:record.lineage.map(runtime.clone),
      status:status==="accepted"||status==="review_required" ? "ready" : "blocked",
      createdAt:new Date().toISOString()
    };

    await store.put("handoffs",handoff);
    await runtime.emit("cl.data_quality.learn.completed",{sourceRecordId:record.dataQualityObservationLearningEngineRecordId,handoffId:handoff.operationalImprovementHandoffId});
    return runtime.success({record,handoff});
  }


  const api=Object.freeze({registerPolicy,process,
    getRecord:({dataQualityObservationLearningEngineRecordId})=>store.get("records",dataQualityObservationLearningEngineRecordId),
    getHandoff:({operationalImprovementHandoffId})=>store.get("handoffs",operationalImprovementHandoffId),
    listRecords:()=>store.list("records")});
  runtime.registerService("cl.data_quality_observation_learning_engine",api,{block:"CL-16"});

  runtime.registerRoute("cl.data_quality_learning_policy.register",registerPolicy);
  runtime.registerRoute("cl.data_quality.learn",process);

  global.INFINICUS.CL.dataQualityObservationLearningEngine=api;
})(window);
