(function(global){
  "use strict";
  const runtime=global.INFINICUS.ABA.runtime;
  const DB_NAME="INFINICUS_ABA_EXECUTION_SCHEDULE";
  let dbPromise;
  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{
        const db=req.result;
        for(const [name,keyPath] of [
          ["policies","executionSchedulePolicyId"],
          ["schedules","executionScheduleId"],
          ["queue","actionQueueItemId"],
          ["events","scheduleEventId"],
          ["adapter_handoffs","executionAdapterHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});
            if(name==="queue"){
              store.createIndex("executionScheduleId","executionScheduleId",{unique:false});
              store.createIndex("state","state",{unique:false});
            }
          }
        }
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
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
      return runtime.failure(
        "ABA_SCHEDULE_STORAGE_ERROR",
        error?.message || "Schedule storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(tx.objectStore(storeName).get(id));
      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "ABA_SCHEDULE_RECORD_NOT_FOUND",
            "Schedule record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "ABA_SCHEDULE_STORAGE_ERROR",
        error?.message || "Schedule retrieval failed."
      );
    }
  }

  async function listByIndex(storeName,indexName,value){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(
        tx.objectStore(storeName).index(indexName).getAll(value)
      );
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "ABA_SCHEDULE_STORAGE_ERROR",
        error?.message || "Schedule listing failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "ABA_SCHEDULE_STORAGE_ERROR",
        error?.message || "Schedule listing failed."
      );
    }
  }

  global.INFINICUS.ABA.executionScheduleStore=
    Object.freeze({open,put,get,listByIndex,list});
})(window);
