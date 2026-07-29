import{createAccessControlEngine}from"../src/index.js";
const identity={authenticated:true,subjectId:"user_demo",subjectType:"user",tenantId:"tenant_demo",businessIds:["business_demo"]};
const engine=createAccessControlEngine({resolveIdentity:async()=>identity});
engine.store.assignRole({tenantId:"tenant_demo",businessId:"business_demo",subjectId:"user_demo",roleId:"decision_manager"});
document.querySelector("#run").onclick=async()=>{
 const decisionCase={decisionId:"decision_demo",tenantId:"tenant_demo",businessId:"business_demo",traceId:"trace_demo",status:"received"};
 document.querySelector("#output").textContent=JSON.stringify(await engine.secureDecisionCase(decisionCase,{}),null,2);
};
