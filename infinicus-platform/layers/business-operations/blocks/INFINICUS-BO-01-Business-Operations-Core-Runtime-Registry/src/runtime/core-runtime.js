(function(g){
"use strict";
g.INFINICUS=g.INFINICUS||{}; g.INFINICUS.BO=g.INFINICUS.BO||{};
const services=new Map(),routes=new Map(),entities=new Map(),states=new Map(),events=[];
const clone=v=>v===undefined?undefined:structuredClone(v);
const id=(p="bo")=>`${p}_${g.crypto?.randomUUID?.()||Date.now()+"_"+Math.random().toString(16).slice(2)}`;
const success=(data,meta={})=>({ok:true,data:clone(data),meta:{timestamp:new Date().toISOString(),...clone(meta)}});
const failure=(code,message,details={})=>({ok:false,error:{code,message,details:clone(details)},meta:{timestamp:new Date().toISOString()}});
async function emit(name,payload={}){const e={eventId:id("bo_event"),name,payload:clone(payload),emittedAt:new Date().toISOString()};events.push(e);return success(e);}
function registerService(name,service,metadata={}){if(!name||!service)return failure("BO_SERVICE_INVALID","Service name and implementation are required.");if(services.has(name))return failure("BO_SERVICE_DUPLICATE",`Service already registered: ${name}`);services.set(name,{name,service,metadata:clone(metadata)});emit("bo.runtime.service_registered",{name});return success({name});}
function registerRoute(name,handler){if(!name||typeof handler!=="function")return failure("BO_ROUTE_INVALID","Route name and handler are required.");if(routes.has(name))return failure("BO_ROUTE_DUPLICATE",`Route already registered: ${name}`);routes.set(name,handler);return success({name});}
async function invoke(name,input={}){const fn=routes.get(name);if(!fn)return failure("BO_ROUTE_NOT_FOUND",`Route not found: ${name}`);try{return await fn(clone(input));}catch(e){return failure("BO_ROUTE_EXECUTION_FAILED",e?.message||"Route failed.");}}
function registerEntity(x={}){if(!x.entityType)return failure("BO_ENTITY_TYPE_REQUIRED","Entity type is required.");const entityId=x.entityId||id(`bo_${x.entityType}`);const r={entityId,entityType:x.entityType,businessId:x.businessId||null,status:x.status||"active",version:Number(x.version||1),correlationId:x.correlationId||null,lineage:clone(x.lineage||[]),createdAt:new Date().toISOString()};entities.set(`${r.entityType}:${entityId}`,r);return success(r);}
function setOperationalState(x={}){const allowed=["planned","authorized","executed","completed","failed","reversed"];if(!allowed.includes(x.state))return failure("BO_OPERATIONAL_STATE_UNSUPPORTED","Unsupported state.");const r={operationalStateId:id("bo_state"),entityType:x.entityType,entityId:x.entityId,state:x.state,evidenceReference:x.evidenceReference||null,changedAt:new Date().toISOString()};states.set(`${x.entityType}:${x.entityId}`,r);return success(r);}
function diagnose(){return success({layer:"Business Operations",version:"1.0.0",serviceCount:services.size,routeCount:routes.size,entityCount:entities.size,stateCount:states.size,eventCount:events.length,status:"healthy"});}
const runtime=Object.freeze({id,createId:id,clone,success,failure,emit,registerService,getService:n=>services.get(n)?.service||null,registerRoute,getRoute:n=>routes.get(n)||null,invoke,registerEntity,getEntity:(t,i)=>success(entities.get(`${t}:${i}`)||null),setOperationalState,getOperationalState:(t,i)=>success(states.get(`${t}:${i}`)||null),diagnose,services,routes,entities,states});
g.INFINICUS.BO.runtime=runtime;
runtime.registerService("bo.runtime",runtime,{block:"BO-01"});
runtime.registerRoute("bo.runtime.diagnose",diagnose);
})(window);
