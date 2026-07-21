import{CONTEXT_SOURCE_TYPES,QUALITY_LEVELS,FRAGMENT_SCOPES}from"./constants.js";
const id=value=>typeof value==="string"?value.trim():"";

export function normalizeFragment(raw,providerDescriptor,boundary){
 const sourceType=id(raw?.sourceType||providerDescriptor.sourceType);
 const quality=id(raw?.quality||"unknown").toLowerCase();
 const scope=id(raw?.scope||"general").toLowerCase();
 const observedAt=id(raw?.observedAt);const timestamp=Date.parse(observedAt);
 const errors=[];
 if(!CONTEXT_SOURCE_TYPES.includes(sourceType))errors.push("unsupported_source_type");
 if(!QUALITY_LEVELS.includes(quality))errors.push("invalid_quality");
 if(!FRAGMENT_SCOPES.includes(scope))errors.push("invalid_scope");
 if(!raw?.recordId)errors.push("record_id_required");
 if(!raw?.schemaVersion)errors.push("schema_version_required");
 if(!raw||typeof raw.data!=="object"||Array.isArray(raw.data)||raw.data===null)errors.push("object_data_required");
 if(raw?.tenantId&&raw.tenantId!==boundary.tenantId)errors.push("tenant_boundary_mismatch");
 if(raw?.businessId&&raw.businessId!==boundary.businessId)errors.push("business_boundary_mismatch");
 return Object.freeze({
  valid:errors.length===0,errors:Object.freeze(errors),
  fragment:errors.length?null:Object.freeze({
   fragmentId:id(raw.fragmentId)||`${providerDescriptor.providerId}:${raw.recordId}`,
   providerId:providerDescriptor.providerId,sourceType,scope,recordId:id(raw.recordId),
   tenantId:boundary.tenantId,businessId:boundary.businessId,data:Object.freeze({...raw.data}),
   units:Object.freeze({...raw.units}),currency:id(raw.currency)||null,quality,
   observedAt:Number.isNaN(timestamp)?null:new Date(timestamp).toISOString(),
   schemaVersion:id(raw.schemaVersion),provenance:Object.freeze({
    sourceSystem:id(raw.sourceSystem||providerDescriptor.providerId),sourceRecordId:id(raw.recordId),
    retrievedAt:new Date().toISOString(),transformation:"structural_normalization_only"
   })
  })
 });
}
