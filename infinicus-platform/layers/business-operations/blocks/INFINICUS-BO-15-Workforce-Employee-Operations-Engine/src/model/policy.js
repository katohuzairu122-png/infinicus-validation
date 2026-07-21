(function(g){"use strict";const r=g.INFINICUS.BO.runtime;
function create(x={}){
  if(!x.name||!x.code)return r.failure("BO_POLICY_INVALID","Policy name and code are required.");
  return r.success({
    workforceEmployeeOperationsEnginePolicyId:x.workforceEmployeeOperationsEnginePolicyId||r.createId("bo_policy"),
    name:String(x.name),
    code:String(x.code),
    requireAuthorization:x.requireAuthorization!==false,
    minimumEvidence:Number(x.minimumEvidence??1),
    allowedStatuses:r.clone(x.allowedStatuses||["draft","active","suspended","closed"]),
    status:String(x.status||"active"),
    createdAt:new Date().toISOString()
  });
}
g.INFINICUS.BO.workforceEmployeeOperationsEnginePolicyModel=Object.freeze({create});
})(window);
