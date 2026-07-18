const text=value=>typeof value==="string"?value.trim():"";

export function validateSimulationRun(run,boundary,decisionId){
 const errors=[],warnings=[];
 if(!run||typeof run!=="object")return Object.freeze({valid:false,errors:Object.freeze(["run_required"]),warnings:Object.freeze([])});
 for(const field of["runId","engineVersion","modelVersion","schemaVersion"]){if(!text(run[field]))errors.push(`${field}_required`)}
 if(run.tenantId!==boundary.tenantId)errors.push("tenant_boundary_mismatch");
 if(run.businessId!==boundary.businessId)errors.push("business_boundary_mismatch");
 if(run.decisionId&&run.decisionId!==decisionId)errors.push("decision_boundary_mismatch");
 if(run.status!=="completed")errors.push("run_not_completed");
 if(Number.isNaN(Date.parse(run.completedAt)))errors.push("completed_at_invalid");
 if(!Number.isInteger(run.sampleSize)||run.sampleSize<1)errors.push("sample_size_invalid");
 if(!Array.isArray(run.scenarios)||run.scenarios.length<1)errors.push("scenarios_required");
 if(!run.outputs||typeof run.outputs!=="object"||Array.isArray(run.outputs))errors.push("outputs_object_required");
 if(!Array.isArray(run.assumptions))warnings.push("assumptions_missing");
 if(!run.randomSeed)warnings.push("random_seed_unrecorded");
 if(!run.inputFingerprint)warnings.push("input_fingerprint_missing");
 if(!run.quality)warnings.push("quality_unreported");
 return Object.freeze({valid:errors.length===0,errors:Object.freeze(errors),warnings:Object.freeze(warnings)});
}
