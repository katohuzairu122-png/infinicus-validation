import{validateTwinSnapshot}from"./snapshot-validator.js";import{mapSnapshotToFragments}from"./fragment-mapper.js";import{success,failure}from"./result-envelope.js";

export function createDigitalTwinContextAdapter(options={}){
 const readSnapshot=options.readSnapshot;const emit=options.emit??(async()=>success());
 async function acquire({decisionCase,boundary,requestedScopes=[]}={},context={}){
  if(typeof readSnapshot!=="function")return failure("ADI_TWIN_READER_REQUIRED","A read-only Digital Twin snapshot reader is required.");
  if(!decisionCase?.decisionId||!boundary?.tenantId||!boundary?.businessId)return failure("ADI_TWIN_QUERY_INVALID","Decision and business boundaries are required.");
  let snapshot;
  try{snapshot=await readSnapshot(Object.freeze({tenantId:boundary.tenantId,businessId:boundary.businessId,decisionId:decisionCase.decisionId,requestedScopes:Object.freeze([...requestedScopes])}),context)}
  catch(error){return failure("ADI_TWIN_READ_FAILED","Digital Twin snapshot retrieval failed.",{message:error.message})}
  const validation=validateTwinSnapshot(snapshot,boundary);
  if(!validation.valid){await emit("adi.digital_twin_context.rejected",{decisionId:decisionCase.decisionId,errors:validation.errors},{...boundary,traceId:decisionCase.traceId});return failure("ADI_TWIN_SNAPSHOT_INVALID","Digital Twin snapshot failed validation.",{errors:validation.errors,warnings:validation.warnings})}
  const fragments=mapSnapshotToFragments(snapshot,validation);
  await emit("adi.digital_twin_context.acquired",{decisionId:decisionCase.decisionId,snapshotId:snapshot.snapshotId,twinVersion:snapshot.version,fragmentCount:fragments.length},{...boundary,traceId:decisionCase.traceId});
  return success(Object.freeze({fragments,snapshot:Object.freeze({snapshotId:snapshot.snapshotId,twinId:snapshot.twinId,version:snapshot.version,publishedAt:snapshot.publishedAt}),warnings:validation.warnings}));
 }
 return Object.freeze({blockId:"ADI-05",version:"1.0.0",mode:"read_only",acquire});
}
