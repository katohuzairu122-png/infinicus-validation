(function(global){
  "use strict";
  const runtime=global.INFINICUS.CL.runtime;
  const DB_NAME="INFINICUS_CL_10";
  const schema=[["policies", "businessRuleLearningEnginePolicyId"], ["records", "businessRuleLearningEngineRecordId"], ["handoffs", "decisionPolicyLearningHandoffId"], ["events", "eventId"]];
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);
      request.onupgradeneeded=()=>{
        const db=request.result;
        for(const [name,keyPath] of schema){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
          }
        }
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure("CL_STORAGE_ERROR",error?.message||"Storage failed.");
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(tx.objectStore(storeName).get(id));
      return value ? runtime.success(structuredClone(value))
        : runtime.failure("CL_RECORD_NOT_FOUND","Record was not found.",{storeName,id});
    }catch(error){
      return runtime.failure("CL_STORAGE_ERROR",error?.message||"Retrieval failed.");
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure("CL_STORAGE_ERROR",error?.message||"Listing failed.");
    }
  }

  global.INFINICUS.CL.businessRuleLearningEngineStore=Object.freeze({open,put,get,list});
})(window);
