export function createEvidenceRepository(){const records=new Map(),byDecision=new Map(),lifecycle=[];return Object.freeze({
 append(record){if(records.has(record.evidenceId))return false;records.set(record.evidenceId,record);const key=`${record.tenantId}::${record.businessId}::${record.decisionId}`;const ids=byDecision.get(key)??[];ids.push(record.evidenceId);byDecision.set(key,ids);return true},
 get(evidenceId){return records.get(evidenceId)??null},
 list({tenantId,businessId,decisionId}){const ids=byDecision.get(`${tenantId}::${businessId}::${decisionId}`)??[];return ids.map(id=>records.get(id))},
 appendLifecycle(entry){lifecycle.push(entry)},
 lifecycleFor(evidenceId){return lifecycle.filter(item=>item.evidenceId===evidenceId)},
 findByHash({tenantId,businessId,decisionId,contentHash}){return this.list({tenantId,businessId,decisionId}).find(item=>item.contentHash===contentHash)??null}
});}
