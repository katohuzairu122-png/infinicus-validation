(function(global){
  "use strict";
  const runtime=global.INFINICUS.CL.runtime;
  const store=global.INFINICUS.CL.simulationModelCalibrationEngineStore;

  async function registerPolicy(input={}){
    const built=global.INFINICUS.CL.simulationModelCalibrationEnginePolicyModel.create(input);
    if(!built.ok) return built;
    return store.put("policies",built.data);
  }

  async function process(input={}){
    const policyId=input.simulationModelCalibrationEnginePolicyId;
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
      simulationModelCalibrationEngineRecordId:runtime.createId("cl_record"),
      block:"CL-14",
      purpose:"Calibrate simulation parameters and distributions.",
      sourceBlock:"CL-13",
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
      digitalTwinCalibrationHandoffId:runtime.createId("cl_handoff"),
      targetBlock:"CL-15",
      sourceBlock:"CL-14",
      sourceRecordId:record.simulationModelCalibrationEngineRecordId,
      record:runtime.clone(record),
      confidence,
      reliability,
      correlationId:record.correlationId,
      lineage:record.lineage.map(runtime.clone),
      status:status==="accepted"||status==="review_required" ? "ready" : "blocked",
      createdAt:new Date().toISOString()
    };

    await store.put("handoffs",handoff);
    await runtime.emit("cl.simulations.calibrate.completed",{sourceRecordId:record.simulationModelCalibrationEngineRecordId,handoffId:handoff.digitalTwinCalibrationHandoffId});
    return runtime.success({record,handoff});
  }


  const api=Object.freeze({registerPolicy,process,
    getRecord:({simulationModelCalibrationEngineRecordId})=>store.get("records",simulationModelCalibrationEngineRecordId),
    getHandoff:({digitalTwinCalibrationHandoffId})=>store.get("handoffs",digitalTwinCalibrationHandoffId),
    listRecords:()=>store.list("records")});
  runtime.registerService("cl.simulation_model_calibration_engine",api,{block:"CL-14"});

  runtime.registerRoute("cl.simulation_calibration_policy.register",registerPolicy);
  runtime.registerRoute("cl.simulations.calibrate",process);

  global.INFINICUS.CL.simulationModelCalibrationEngine=api;
})(window);
