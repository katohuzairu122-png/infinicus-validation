export function createGoalRepository(){const histories=new Map(),idempotency=new Map();const boundary=(tenantId,businessId)=>`${tenantId}::${businessId}`;return Object.freeze({
 create(goal){if(histories.has(goal.goalId))return false;histories.set(goal.goalId,[goal]);return true},
 append(goal){const history=histories.get(goal.goalId);if(!history||goal.version!==history.at(-1).version+1)return false;history.push(goal);return true},
 get({goalId,tenantId,businessId,version}){const history=histories.get(goalId);if(!history)return null;const record=version?history.find(item=>item.version===version):history.at(-1);return record?.tenantId===tenantId&&record?.businessId===businessId?record:null},
 history({goalId,tenantId,businessId}){return(histories.get(goalId)??[]).filter(item=>item.tenantId===tenantId&&item.businessId===businessId)},
 list({tenantId,businessId,status}){return[...histories.values()].map(history=>history.at(-1)).filter(item=>item.tenantId===tenantId&&item.businessId===businessId&&(!status||item.status===status))},
 idempotentGet({tenantId,businessId,key}){return idempotency.get(`${boundary(tenantId,businessId)}::${key}`)??null},
 idempotentSet({tenantId,businessId,key,goalId}){if(key)idempotency.set(`${boundary(tenantId,businessId)}::${key}`,goalId)}
});}
