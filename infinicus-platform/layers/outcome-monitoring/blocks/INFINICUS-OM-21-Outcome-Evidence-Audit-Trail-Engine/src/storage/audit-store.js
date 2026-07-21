(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_OUTCOME_AUDIT";
  let dbPromise;

  const requestPromise=request=>
    new Promise((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;

        for(const [name,keyPath] of [
          ["policies","outcomeAuditPolicyId"],
          ["packages","outcomeAuditPackageId"],
          ["events","outcomeAuditEventId"],
          ["exports","outcomeAuditExportId"],
          ["verdict_handoffs","outcomeVerdictHandoffId"]
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

      await requestPromise(
        tx.objectStore(storeName).put(
          structuredClone(record)
        )
      );

      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "OM_AUDIT_STORAGE_ERROR",
        error?.message || "Audit storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");

      const value=await requestPromise(
        tx.objectStore(storeName).get(id)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_AUDIT_RECORD_NOT_FOUND",
            "Audit record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_AUDIT_STORAGE_ERROR",
        error?.message || "Audit retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");

      const values=await requestPromise(
        tx.objectStore(storeName).getAll()
      );

      return runtime.success(
        values.map(structuredClone)
      );
    }catch(error){
      return runtime.failure(
        "OM_AUDIT_STORAGE_ERROR",
        error?.message || "Audit listing failed."
      );
    }
  }

  global.INFINICUS.OM.outcomeAuditStore=
    Object.freeze({open,put,get,list});
})(window);
