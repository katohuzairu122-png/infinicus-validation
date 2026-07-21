const id=value=>typeof value==="string"?value.trim():"";

export function validateTwinSnapshot(snapshot,boundary){
 const errors=[],warnings=[];
 if(!snapshot||typeof snapshot!=="object")return Object.freeze({valid:false,errors:Object.freeze(["snapshot_required"]),warnings:Object.freeze([])});
 if(!id(snapshot.snapshotId))errors.push("snapshot_id_required");
 if(!id(snapshot.twinId))errors.push("twin_id_required");
 if(!id(snapshot.version))errors.push("version_required");
 if(snapshot.tenantId!==boundary.tenantId)errors.push("tenant_boundary_mismatch");
 if(snapshot.businessId!==boundary.businessId)errors.push("business_boundary_mismatch");
 if(snapshot.publicationStatus!=="published")errors.push("snapshot_not_published");
 if(Number.isNaN(Date.parse(snapshot.publishedAt)))errors.push("published_at_invalid");
 if(!id(snapshot.schemaVersion))errors.push("schema_version_required");
 if(!snapshot.state||typeof snapshot.state!=="object"||Array.isArray(snapshot.state))errors.push("state_object_required");
 if(!Array.isArray(snapshot.entities))warnings.push("entities_missing");
 if(!Array.isArray(snapshot.relationships))warnings.push("relationships_missing");
 if(!Array.isArray(snapshot.assumptions))warnings.push("assumptions_missing");
 if(!snapshot.quality)warnings.push("quality_unreported");
 return Object.freeze({valid:errors.length===0,errors:Object.freeze(errors),warnings:Object.freeze(warnings)});
}
