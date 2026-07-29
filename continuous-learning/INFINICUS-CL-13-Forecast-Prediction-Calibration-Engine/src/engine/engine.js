(function(global){
  "use strict";
  const runtime=global.INFINICUS.CL.runtime;
  const store=global.INFINICUS.CL.forecastPredictionCalibrationEngineStore;

  async function registerPolicy(input={}){
    const built=global.INFINICUS.CL.forecastPredictionCalibrationEnginePolicyModel.create(input);
    if(!built.ok) return built;
    return store.put("policies",built.data);
  }

  async function process(input={}){
    const policyId=input.forecastPredictionCalibrationEnginePolicyId;
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
      forecastPredictionCalibrationEngineRecordId:runtime.createId("cl_record"),
      block:"CL-13",
      purpose:"Calibrate forecast and prediction models using realized outcomes.",
      sourceBlock:"CL-12",
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
      simulationCalibrationHandoffId:runtime.createId("cl_handoff"),
      targetBlock:"CL-14",
      sourceBlock:"CL-13",
      sourceRecordId:record.forecastPredictionCalibrationEngineRecordId,
      record:runtime.clone(record),
      confidence,
      reliability,
      correlationId:record.correlationId,
      lineage:record.lineage.map(runtime.clone),
      status:status==="accepted"||status==="review_required" ? "ready" : "blocked",
      createdAt:new Date().toISOString()
    };

    await store.put("handoffs",handoff);
    await runtime.emit("cl.forecasts.calibrate.completed",{sourceRecordId:record.forecastPredictionCalibrationEngineRecordId,handoffId:handoff.simulationCalibrationHandoffId});
    return runtime.success({record,handoff});
  }


  const api=Object.freeze({registerPolicy,process,
    getRecord:({forecastPredictionCalibrationEngineRecordId})=>store.get("records",forecastPredictionCalibrationEngineRecordId),
    getHandoff:({simulationCalibrationHandoffId})=>store.get("handoffs",simulationCalibrationHandoffId),
    listRecords:()=>store.list("records")});
  runtime.registerService("cl.forecast_prediction_calibration_engine",api,{block:"CL-13"});

  runtime.registerRoute("cl.forecast_calibration_policy.register",registerPolicy);
  runtime.registerRoute("cl.forecasts.calibrate",process);

  global.INFINICUS.CL.forecastPredictionCalibrationEngine=api;
})(window);
