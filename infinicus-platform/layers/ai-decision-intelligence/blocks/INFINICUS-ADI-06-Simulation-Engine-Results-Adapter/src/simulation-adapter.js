import{validateSimulationRun}from"./run-validator.js";import{mapRunToFragments}from"./fragment-mapper.js";import{success,failure}from"./result-envelope.js";

export function createSimulationResultsAdapter(options={}){
 const readCompletedRun=options.readCompletedRun;const emit=options.emit??(async()=>success());
 async function acquire({decisionCase,boundary,requestedScopes=[],runIds=[]}={},context={}){
  if(typeof readCompletedRun!=="function")return failure("ADI_SIMULATION_READER_REQUIRED","A read-only completed simulation run reader is required.");
  if(!decisionCase?.decisionId||!boundary?.tenantId||!boundary?.businessId)return failure("ADI_SIMULATION_QUERY_INVALID","Decision and business boundaries are required.");
  let result;
  try{result=await readCompletedRun(Object.freeze({tenantId:boundary.tenantId,businessId:boundary.businessId,decisionId:decisionCase.decisionId,runIds:Object.freeze([...runIds]),requestedScopes:Object.freeze([...requestedScopes])}),context)}
  catch(error){return failure("ADI_SIMULATION_READ_FAILED","Completed simulation result retrieval failed.",{message:error.message})}
  const runs=Array.isArray(result)?result:[result];const fragments=[],acceptedRuns=[],rejectedRuns=[];
  for(const run of runs){const validation=validateSimulationRun(run,boundary,decisionCase.decisionId);if(!validation.valid){rejectedRuns.push(Object.freeze({runId:run?.runId??null,errors:validation.errors,warnings:validation.warnings}));continue}fragments.push(...mapRunToFragments(run,validation));acceptedRuns.push(Object.freeze({runId:run.runId,engineVersion:run.engineVersion,modelVersion:run.modelVersion,completedAt:run.completedAt,warnings:validation.warnings}));}
  if(!acceptedRuns.length){await emit("adi.simulation_results.rejected",{decisionId:decisionCase.decisionId,rejectedRuns},{...boundary,traceId:decisionCase.traceId});return failure("ADI_SIMULATION_RUN_INVALID","No completed simulation run passed validation.",{rejectedRuns})}
  await emit("adi.simulation_results.acquired",{decisionId:decisionCase.decisionId,acceptedRunCount:acceptedRuns.length,rejectedRunCount:rejectedRuns.length,fragmentCount:fragments.length},{...boundary,traceId:decisionCase.traceId});
  return success(Object.freeze({fragments:Object.freeze(fragments),acceptedRuns:Object.freeze(acceptedRuns),rejectedRuns:Object.freeze(rejectedRuns)}),{partial:rejectedRuns.length>0});
 }
 return Object.freeze({blockId:"ADI-06",version:"1.0.0",mode:"read_only",acquire});
}
