const clone=value=>value===undefined?undefined:structuredClone(value);

export function mapRunToFragments(run,validation){
 const common={tenantId:run.tenantId,businessId:run.businessId,sourceType:"simulation_results",scope:"simulation",quality:run.quality??"unknown",observedAt:run.completedAt,schemaVersion:run.schemaVersion,sourceSystem:run.sourceSystem??"infinicus_simulation_engine"};
 const metadata={runId:run.runId,engineVersion:run.engineVersion,modelVersion:run.modelVersion,sampleSize:run.sampleSize,randomSeed:run.randomSeed??null,inputFingerprint:run.inputFingerprint??null,status:run.status};
 return Object.freeze([
  Object.freeze({...common,fragmentId:`simulation:${run.runId}:outputs`,recordId:run.runId,data:{metadata,outputs:clone(run.outputs),verdict:clone(run.verdict??null)},units:clone(run.units??{}),currency:run.currency??null}),
  Object.freeze({...common,fragmentId:`simulation:${run.runId}:scenarios`,recordId:`${run.runId}:scenarios`,data:{scenarios:clone(run.scenarios)},units:{}}),
  Object.freeze({...common,fragmentId:`simulation:${run.runId}:assumptions`,recordId:`${run.runId}:assumptions`,data:{assumptions:clone(run.assumptions??[]),validationWarnings:[...validation.warnings]},units:{}})
 ]);
}
