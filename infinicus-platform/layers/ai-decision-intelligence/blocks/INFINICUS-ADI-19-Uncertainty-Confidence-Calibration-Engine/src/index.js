const ok=(data,meta={})=>({ok:true,data,error:null,meta});
const fail=(code,message,details=null)=>({ok:false,data:null,error:{code,message,details},meta:{}});
const id=p=>`${p}_${globalThis.crypto?.randomUUID?.()??Date.now().toString(36)}`;
const clamp=x=>Math.max(0,Math.min(1,Number(x)));
const round=x=>Math.round(x*10000)/10000;

export function createConfidenceCalibrationEngine(options={}){
 const rankingEngine=options.rankingEngine,scenarioEngine=options.scenarioEngine,riskEngine=options.riskEngine;
 const calibrator=options.calibrator??null,createId=options.createId??id,emit=options.emit??(async()=>ok(null));
 const reports=new Map();
 async function assess(input={}){
  const ranking=rankingEngine?.get({rankingId:input.rankingId,tenantId:input.tenantId,businessId:input.businessId});
  const scenarios=scenarioEngine?.get({scenarioComparisonId:input.scenarioComparisonId,tenantId:input.tenantId,businessId:input.businessId});
  const risks=riskEngine?.get({riskAssessmentId:input.riskAssessmentId,tenantId:input.tenantId,businessId:input.businessId});
  if(!ranking?.ok||!scenarios?.ok||!risks?.ok)return fail("ADI_CONFIDENCE_INPUT_INVALID","Ranking, scenario comparison and risk assessment are required.");
  const alternatives=[];
  for(const row of ranking.data.rows.filter(x=>x.eligibilityStatus==="eligible")){
   const run=scenarios.data.runs.find(x=>x.alternativeId===row.alternativeId);
   const risk=risks.data.alternatives.find(x=>x.alternativeId===row.alternativeId);
   const totalFindings=risk?.findings?.length??0;
   const quantified=totalFindings?(risk.findings.filter(x=>x.exposure!==null).length/totalFindings):1;
   const stabilityInput=input.stabilityByAlternative?.[row.alternativeId];
   const stability=Number.isFinite(Number(stabilityInput))?clamp(stabilityInput):0;
   const components=Object.freeze({criterionCoverage:clamp(row.coverage??0),simulationCoverage:run?.status==="completed"?1:0,riskQuantification:clamp(quantified),sensitivityStability:stability});
   const raw=round(.35*components.criterionCoverage+.25*components.simulationCoverage+.2*components.riskQuantification+.2*components.sensitivityStability);
   let calibrated=raw,calibrationVersion=null,uncalibrated=true;
   if(calibrator?.calibrate){const result=await calibrator.calibrate({rawConfidence:raw,alternativeId:row.alternativeId,components});if(!Number.isFinite(Number(result?.calibratedConfidence))||!result?.version)return fail("ADI_CALIBRATION_INVALID","Calibrator must return calibratedConfidence and version.");calibrated=round(clamp(result.calibratedConfidence));calibrationVersion=String(result.version);uncalibrated=false}
   const missing=[];if(components.criterionCoverage<1)missing.push("criterion_coverage");if(!components.simulationCoverage)missing.push("simulation");if(components.riskQuantification<1)missing.push("risk_quantification");if(stabilityInput===undefined)missing.push("sensitivity_stability");
   alternatives.push(Object.freeze({alternativeId:row.alternativeId,components,rawConfidence:raw,calibratedConfidence:calibrated,confidenceBand:calibrated>=.75?"high":calibrated>=.5?"medium":"low",calibrationVersion,uncalibrated,missingFactors:Object.freeze(missing)}));
  }
  const report=Object.freeze({confidenceReportId:createId("confidence_report"),rankingId:ranking.data.rankingId,scenarioComparisonId:scenarios.data.scenarioComparisonId,riskAssessmentId:risks.data.riskAssessmentId,tenantId:ranking.data.tenantId,businessId:ranking.data.businessId,decisionId:ranking.data.decisionId,alternatives:Object.freeze(alternatives),formula:Object.freeze({criterionCoverage:.35,simulationCoverage:.25,riskQuantification:.2,sensitivityStability:.2}),status:alternatives.some(x=>x.missingFactors.length)?"partial":"completed",createdAt:new Date().toISOString(),schemaVersion:"1.0.0",disclaimer:"Confidence qualifies analytical support; it does not change rank or constitute approval."});
  reports.set(report.confidenceReportId,report);await emit("adi.confidence.assessed",{confidenceReportId:report.confidenceReportId,status:report.status},{tenantId:report.tenantId,businessId:report.businessId,decisionId:report.decisionId});return ok(report)
 }
 function get(q){const x=reports.get(q.confidenceReportId);return x&&x.tenantId===q.tenantId&&x.businessId===q.businessId?ok(x):fail("ADI_CONFIDENCE_REPORT_NOT_FOUND","Confidence report was not found.")}
 return Object.freeze({blockId:"ADI-19",version:"1.0.0",assess,get})
}
export function attachToADIRuntime(runtime,options={}){const r=runtime?.getService?.("adi.scoring_ranking"),s=runtime?.getService?.("adi.simulation_orchestration"),k=runtime?.getService?.("adi.risk_assessment");if(!r?.ok||!s?.ok||!k?.ok)return fail("ADI_CONFIDENCE_DEPENDENCY_REQUIRED","ADI-16, ADI-17 and ADI-18 must be attached before ADI-19.");const e=createConfidenceCalibrationEngine({...options,rankingEngine:r.data,scenarioEngine:s.data,riskEngine:k.data,createId:runtime.createId,emit:runtime.emit});let x=runtime.registerService("adi.confidence_calibration",e,{blockId:"ADI-19",version:"1.0.0"});if(!x.ok)return x;for(const[n,h]of[["adi.confidence.assess",q=>e.assess(q)],["adi.confidence.get",q=>e.get(q)]]){x=runtime.registerRoute(n,h,{blockId:"ADI-19"});if(!x.ok)return x}return runtime.success({blockId:"ADI-19",service:"adi.confidence_calibration"})}
