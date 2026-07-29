(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_VARIANCE_THRESHOLD";
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

        for(const [name,keyPath] of [
          ["policies","varianceThresholdPolicyId"],
          ["variance_records","varianceDetectionId"],
          ["breaches","thresholdBreachId"],
          ["suppressions","thresholdSuppressionId"],
          ["alert_handoffs","alertEscalationHandoffId"]
        ]){
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
      return runtime.failure(
        "OM_VARIANCE_STORAGE_ERROR",
        error?.message || "Variance storage failed."
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
            "OM_VARIANCE_RECORD_NOT_FOUND",
            "Variance record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_VARIANCE_STORAGE_ERROR",
        error?.message || "Variance retrieval failed."
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
        "OM_VARIANCE_STORAGE_ERROR",
        error?.message || "Variance listing failed."
      );
    }
  }

  global.INFINICUS.OM.varianceThresholdStore=
    Object.freeze({open,put,get,list});
})(window);
