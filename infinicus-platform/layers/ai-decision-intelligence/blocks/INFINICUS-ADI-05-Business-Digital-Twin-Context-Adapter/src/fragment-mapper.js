const clone=value=>value===undefined?undefined:structuredClone(value);

export function mapSnapshotToFragments(snapshot,validation){
 const common={
  tenantId:snapshot.tenantId,businessId:snapshot.businessId,sourceType:"business_digital_twin",
  quality:snapshot.quality??"unknown",observedAt:snapshot.publishedAt,schemaVersion:snapshot.schemaVersion,
  sourceSystem:snapshot.sourceSystem??"infinicus_business_digital_twin"
 };
 const fragments=[{
  ...common,fragmentId:`twin:${snapshot.snapshotId}:state`,recordId:snapshot.snapshotId,scope:"general",
  data:{twinId:snapshot.twinId,twinVersion:snapshot.version,publicationStatus:snapshot.publicationStatus,state:clone(snapshot.state)},
  units:clone(snapshot.units??{})
 }];
 if(Array.isArray(snapshot.entities)&&snapshot.entities.length)fragments.push({...common,fragmentId:`twin:${snapshot.snapshotId}:entities`,recordId:`${snapshot.snapshotId}:entities`,scope:"operations",data:{entities:clone(snapshot.entities)},units:{}});
 if(Array.isArray(snapshot.relationships)&&snapshot.relationships.length)fragments.push({...common,fragmentId:`twin:${snapshot.snapshotId}:relationships`,recordId:`${snapshot.snapshotId}:relationships`,scope:"operations",data:{relationships:clone(snapshot.relationships)},units:{}});
 if(Array.isArray(snapshot.assumptions)&&snapshot.assumptions.length)fragments.push({...common,fragmentId:`twin:${snapshot.snapshotId}:assumptions`,recordId:`${snapshot.snapshotId}:assumptions`,scope:"general",data:{assumptions:clone(snapshot.assumptions),validationWarnings:[...validation.warnings]},units:{}});
 return Object.freeze(fragments.map(Object.freeze));
}
