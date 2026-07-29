import test from"node:test";import assert from"node:assert/strict";
import{createAccessControlEngine}from"../src/index.js";
const identity={authenticated:true,subjectId:"user_001",subjectType:"user",tenantId:"tenant_001",businessIds:["business_001"]};
const resource={decisionId:"decision_001",tenantId:"tenant_001",businessId:"business_001",traceId:"trace_001"};

test("fails closed without trusted identity resolver",async()=>{
 const result=await createAccessControlEngine().authorize({resource,permission:"decision.view"});
 assert.equal(result.data.allowed,false);assert.equal(result.data.reason,"identity_unresolved");
});
test("allows permissions assigned through a scoped role",async()=>{
 const engine=createAccessControlEngine({resolveIdentity:async()=>identity});
 engine.store.assignRole({...resource,subjectId:identity.subjectId,roleId:"decision_manager"});
 const result=await engine.authorize({resource,permission:"decision.analyse"});
 assert.equal(result.data.allowed,true);assert.equal(result.data.reason,"allowed_by_role");
});
test("denies cross-tenant access",async()=>{
 const engine=createAccessControlEngine({resolveIdentity:async()=>identity});
 const result=await engine.authorize({resource:{...resource,tenantId:"tenant_002"},permission:"decision.view"});
 assert.equal(result.data.allowed,false);assert.equal(result.data.reason,"tenant_mismatch");
});
test("explicit deny overrides role permission",async()=>{
 const engine=createAccessControlEngine({resolveIdentity:async()=>identity});
 const scope={tenantId:"tenant_001",businessId:"business_001",subjectId:"user_001"};
 engine.store.assignRole({...scope,roleId:"decision_manager"});engine.store.deny({...scope,permission:"decision.update"});
 const result=await engine.authorize({resource,permission:"decision.update"});
 assert.equal(result.data.allowed,false);assert.equal(result.data.reason,"explicitly_denied");
});
test("secures a DecisionCase and records ownership",async()=>{
 const engine=createAccessControlEngine({resolveIdentity:async()=>identity});
 engine.store.assignRole({tenantId:"tenant_001",businessId:"business_001",subjectId:"user_001",roleId:"decision_manager"});
 const result=await engine.secureDecisionCase({...resource,status:"received"});
 assert.equal(result.ok,true);assert.equal(result.data.security.ownerId,"user_001");assert.equal(result.data.security.accessProof.allowed,true);
});
