(function(g){"use strict";const r=g.INFINICUS.BO.runtime;const schema=[["policies", "customerAccountOperationsEnginePolicyId"], ["records", "customerAccountOperationsEngineRecordId"], ["events", "operationalEventId"], ["handoffs", "salesPipelineHandoffId"]];let dbp;
const req=q=>new Promise((res,rej)=>{q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});
function open(){if(dbp)return dbp;dbp=new Promise((res,rej)=>{const q=indexedDB.open("INFINICUS_BO_05",1);q.onupgradeneeded=()=>{const d=q.result;for(const [n,k] of schema)if(!d.objectStoreNames.contains(n))d.createObjectStore(n,{keyPath:k});};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});return dbp;}
async function put(s,x){try{const d=await open(),t=d.transaction(s,"readwrite");await req(t.objectStore(s).put(structuredClone(x)));return r.success(x);}catch(e){return r.failure("BO_STORAGE_ERROR",e?.message||"Storage failed.");}}
async function get(s,i){try{const d=await open(),t=d.transaction(s,"readonly"),v=await req(t.objectStore(s).get(i));return v?r.success(v):r.failure("BO_RECORD_NOT_FOUND","Record not found.",{s,i});}catch(e){return r.failure("BO_STORAGE_ERROR",e?.message||"Retrieval failed.");}}
async function list(s){try{const d=await open(),t=d.transaction(s,"readonly"),v=await req(t.objectStore(s).getAll());return r.success(v);}catch(e){return r.failure("BO_STORAGE_ERROR",e?.message||"Listing failed.");}}
g.INFINICUS.BO.customerAccountOperationsEngineStore=Object.freeze({put,get,list});
})(window);
