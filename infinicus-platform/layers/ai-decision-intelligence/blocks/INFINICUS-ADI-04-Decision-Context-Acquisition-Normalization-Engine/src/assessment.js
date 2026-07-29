export function freshnessOf(observedAt,now,maxAgeHours){
 if(!observedAt)return"undated";const age=(now.getTime()-Date.parse(observedAt))/3600000;
 if(age<=maxAgeHours)return"current";if(age<=maxAgeHours*2)return"aging";return"stale";
}

function scalarEntries(fragment){return Object.entries(fragment.data).filter(([,value])=>["string","number","boolean"].includes(typeof value));}

export function detectConflicts(fragments){
 const seen=new Map(),conflicts=[];
 for(const fragment of fragments){for(const [key,value]of scalarEntries(fragment)){
  const compound=`${fragment.scope}.${key}`;const prior=seen.get(compound);
  if(prior&&prior.value!==value)conflicts.push(Object.freeze({field:compound,left:Object.freeze({fragmentId:prior.fragmentId,value:prior.value}),right:Object.freeze({fragmentId:fragment.fragmentId,value})}));
  else if(!prior)seen.set(compound,{fragmentId:fragment.fragmentId,value});
 }}return Object.freeze(conflicts);
}

export function qualitySummary(fragments,failures){
 const weights={verified:1,high:.85,medium:.65,low:.35,unknown:.15};
 const score=fragments.length?Math.round(fragments.reduce((sum,item)=>sum+weights[item.quality],0)/fragments.length*100):0;
 return Object.freeze({score,fragmentCount:fragments.length,providerFailureCount:failures.length,usable:fragments.length>0&&score>=35});
}
