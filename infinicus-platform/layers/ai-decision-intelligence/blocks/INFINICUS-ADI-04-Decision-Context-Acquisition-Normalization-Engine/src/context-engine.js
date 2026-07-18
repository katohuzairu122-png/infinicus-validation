import{createProviderRegistry}from"./provider-registry.js";import{normalizeFragment}from"./normalizer.js";import{freshnessOf,detectConflicts,qualitySummary}from"./assessment.js";import{success,failure}from"./result-envelope.js";
const localId=prefix=>`${prefix}_${globalThis.crypto?.randomUUID?.()??`${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;

export function createDecisionContextEngine(options={}){
 const providers=options.providers??createProviderRegistry();const emit=options.emit??(async()=>success());const createId=options.createId??localId;const now=options.now??(()=>new Date());const maxAgeHours=options.maxAgeHours??168;

 function verifyBoundary(decisionCase,accessDecision){
  if(!decisionCase?.security?.accessDecisionId)return failure("ADI_CONTEXT_CASE_UNSECURED","ADI-03 secured DecisionCase is required.");
  if(!accessDecision?.allowed||accessDecision.accessDecisionId!==decisionCase.security.accessDecisionId)return failure("ADI_CONTEXT_ACCESS_INVALID","Matching allowed AccessDecision is required.");
  if(accessDecision.tenantId!==decisionCase.tenantId||accessDecision.businessId!==decisionCase.businessId||accessDecision.decisionId!==decisionCase.decisionId)return failure("ADI_CONTEXT_BOUNDARY_MISMATCH","Access and decision boundaries do not match.");
  return success({tenantId:decisionCase.tenantId,businessId:decisionCase.businessId,decisionId:decisionCase.decisionId});
 }

 async function acquire(input={},context={}){
  const decisionCase=input.decisionCase;const accessDecision=input.accessDecision??decisionCase?.security?.accessProof;const boundaryResult=verifyBoundary(decisionCase,accessDecision);if(!boundaryResult.ok)return boundaryResult;
  const boundary=boundaryResult.data;const selected=new Set(input.providerIds??[]);const entries=providers.entries().filter(item=>!selected.size||selected.has(item.descriptor.providerId));
  if(!entries.length)return failure("ADI_CONTEXT_PROVIDER_REQUIRED","At least one registered context provider is required.");
  const fragments=[],failures=[],invalid=[];
  for(const item of entries){try{
   const response=await item.provider.acquire({decisionCase,boundary,requestedScopes:input.requestedScopes??[]},context);
   const records=Array.isArray(response)?response:Array.isArray(response?.fragments)?response.fragments:[];
   if(!records.length){failures.push(Object.freeze({providerId:item.descriptor.providerId,code:"NO_CONTEXT_RETURNED"}));continue;}
   for(const raw of records){const normalized=normalizeFragment(raw,item.descriptor,boundary);if(normalized.valid)fragments.push(normalized.fragment);else invalid.push(Object.freeze({providerId:item.descriptor.providerId,recordId:raw?.recordId??null,errors:normalized.errors}));}
  }catch(error){failures.push(Object.freeze({providerId:item.descriptor.providerId,code:"PROVIDER_FAILED",message:error.message}));}}
  const acquiredAt=now().toISOString();const enriched=fragments.map(fragment=>Object.freeze({...fragment,freshness:freshnessOf(fragment.observedAt,now(),maxAgeHours)}));
  const requestedTypes=new Set(input.requiredSourceTypes??[]);const presentTypes=new Set(enriched.map(item=>item.sourceType));const missingSourceTypes=[...requestedTypes].filter(type=>!presentTypes.has(type));
  const envelope=Object.freeze({
   contextId:createId("context"),decisionId:boundary.decisionId,tenantId:boundary.tenantId,businessId:boundary.businessId,
   accessDecisionId:accessDecision.accessDecisionId,fragments:Object.freeze(enriched),
   conflicts:detectConflicts(enriched),providerFailures:Object.freeze(failures),invalidFragments:Object.freeze(invalid),
   missingSourceTypes:Object.freeze(missingSourceTypes),quality:qualitySummary(enriched,failures),
   acquiredAt,schemaVersion:"1.0.0",normalizationPolicy:"preserve_values_and_provenance"
  });
  await emit("adi.decision_context.acquired",{contextId:envelope.contextId,decisionId:envelope.decisionId,quality:envelope.quality,fragmentCount:envelope.fragments.length},{...boundary,traceId:decisionCase.traceId});
  return success(envelope,{partial:failures.length>0||invalid.length>0||missingSourceTypes.length>0});
 }
 return Object.freeze({blockId:"ADI-04",version:"1.0.0",providers,verifyBoundary,acquire});
}
