import{sha256}from"./canonical-hash.js";import{createEvidenceRepository}from"./repository.js";import{success,failure}from"./result-envelope.js";
const localId=prefix=>`${prefix}_${globalThis.crypto?.randomUUID?.()??`${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
const freeze=value=>Object.freeze(structuredClone(value));

export function createEvidenceRegistry(options={}){
 const repository=options.repository??createEvidenceRepository();const createId=options.createId??localId;const emit=options.emit??(async()=>success());const now=options.now??(()=>new Date());
 async function register(input={}){
  const required=["tenantId","businessId","decisionId","accessDecisionId","sourceType","sourceRecordId","schemaVersion"];
  const missing=required.filter(field=>typeof input[field]!=="string"||!input[field].trim());
  if(missing.length||input.content===undefined)return failure("ADI_EVIDENCE_INVALID","Evidence identity, source, schema and content are required.",{missing:[...missing,...(input.content===undefined?["content"]:[])]});
  let contentHash;try{contentHash=await sha256(input.content)}catch(error){return failure("ADI_EVIDENCE_HASH_FAILED","Evidence content could not be hashed.",{message:error.message})}
  const duplicate=repository.findByHash({...input,contentHash});if(duplicate)return success(duplicate,{duplicate:true});
  const evidence=Object.freeze({
   evidenceId:input.evidenceId||createId("evidence"),tenantId:input.tenantId,businessId:input.businessId,decisionId:input.decisionId,accessDecisionId:input.accessDecisionId,
   contextId:input.contextId??null,fragmentId:input.fragmentId??null,sourceType:input.sourceType,providerId:input.providerId??null,
   sourceSystem:input.sourceSystem??null,sourceRecordId:input.sourceRecordId,schemaVersion:input.schemaVersion,
   content:freeze(input.content),contentHash,hashAlgorithm:"SHA-256",quality:input.quality??"unknown",freshness:input.freshness??"undated",
   observedAt:input.observedAt??null,retrievedAt:input.retrievedAt??now().toISOString(),registeredAt:now().toISOString(),
   parentEvidenceIds:Object.freeze([...(input.parentEvidenceIds??[])]),status:"active",provenanceVersion:"1.0.0"
  });
  if(!repository.append(evidence))return failure("ADI_EVIDENCE_DUPLICATE_ID","Evidence ID already exists.");
  await emit("adi.evidence.registered",{evidenceId:evidence.evidenceId,decisionId:evidence.decisionId,contentHash},{tenantId:evidence.tenantId,businessId:evidence.businessId,decisionId:evidence.decisionId});return success(evidence);
 }
 async function ingestContext(contextEnvelope){
  if(!contextEnvelope?.contextId||!contextEnvelope?.accessDecisionId||!Array.isArray(contextEnvelope.fragments))return failure("ADI_CONTEXT_ENVELOPE_INVALID","A canonical authorized ADI-04 DecisionContextEnvelope is required.");
  const registered=[],failed=[];
  for(const fragment of contextEnvelope.fragments){const result=await register({tenantId:contextEnvelope.tenantId,businessId:contextEnvelope.businessId,decisionId:contextEnvelope.decisionId,accessDecisionId:contextEnvelope.accessDecisionId,contextId:contextEnvelope.contextId,fragmentId:fragment.fragmentId,sourceType:fragment.sourceType,providerId:fragment.providerId,sourceSystem:fragment.provenance?.sourceSystem,sourceRecordId:fragment.recordId,schemaVersion:fragment.schemaVersion,content:{data:fragment.data,units:fragment.units,currency:fragment.currency},quality:fragment.quality,freshness:fragment.freshness,observedAt:fragment.observedAt,retrievedAt:fragment.provenance?.retrievedAt});if(result.ok)registered.push(result.data);else failed.push({fragmentId:fragment.fragmentId,error:result.error});}
  return success(Object.freeze({contextId:contextEnvelope.contextId,registered:Object.freeze(registered),failed:Object.freeze(failed)}),{partial:failed.length>0});
 }
 function get({evidenceId,tenantId,businessId,decisionId}){const record=repository.get(evidenceId);if(!record)return failure("ADI_EVIDENCE_NOT_FOUND","Evidence record was not found.");if(record.tenantId!==tenantId||record.businessId!==businessId||record.decisionId!==decisionId)return failure("ADI_EVIDENCE_BOUNDARY_MISMATCH","Evidence boundary does not match.");return success(record)}
 function list(boundary){return success(repository.list(boundary))}
 async function lifecycle(action,{evidenceId,tenantId,businessId,decisionId,replacementEvidenceId=null,reason}){const found=get({evidenceId,tenantId,businessId,decisionId});if(!found.ok)return found;if(!["superseded","revoked"].includes(action)||!reason)return failure("ADI_EVIDENCE_LIFECYCLE_INVALID","Supported action and reason are required.");if(action==="superseded"&&!replacementEvidenceId)return failure("ADI_EVIDENCE_REPLACEMENT_REQUIRED","Replacement evidence ID is required.");const entry=Object.freeze({lifecycleId:createId("evidence_event"),evidenceId,action,replacementEvidenceId,reason,recordedAt:now().toISOString()});repository.appendLifecycle(entry);await emit(`adi.evidence.${action}`,entry,{tenantId,businessId,decisionId});return success(entry)}
 async function verify({evidenceId,tenantId,businessId,decisionId}){const found=get({evidenceId,tenantId,businessId,decisionId});if(!found.ok)return found;const actual=await sha256(found.data.content);return success(Object.freeze({evidenceId,valid:actual===found.data.contentHash,expectedHash:found.data.contentHash,actualHash:actual,verifiedAt:now().toISOString()}))}
 return Object.freeze({blockId:"ADI-07",version:"1.0.0",register,ingestContext,get,list,verify,supersede:input=>lifecycle("superseded",input),revoke:input=>lifecycle("revoked",input),lifecycleFor:evidenceId=>success(repository.lifecycleFor(evidenceId))});
}
