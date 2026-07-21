(function(global){
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;
  const DB_NAME = "INFINICUS_ABA_DRY_RUN";
  let dbPromise;

  const reqp = req => new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise = new Promise((resolve,reject)=>{
      const req = indexedDB.open(DB_NAME,1);

      req.onupgradeneeded=()=>{
        const db=req.result;

        for(const [name,keyPath] of [
          ["policies","dryRunPolicyId"],
          ["runs","dryRunId"],
          ["results","dryRunResultId"],
          ["failures","dryRunFailureId"],
          ["execution_handoffs","controlledExecutionHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});

            if(name==="results"){
              store.createIndex(
                "dryRunId",
                "dryRunId",
                {unique:false}
              );
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
      await reqp(
        tx.objectStore(storeName)
          .put(structuredClone(record))
      );

      return runtime.success(
        structuredClone(record)
      );
    }catch(error){
      return runtime.failure(
        "ABA_DRY_RUN_STORAGE_ERROR",
        error?.message || "Dry-run storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(
        tx.objectStore(storeName).get(id)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "ABA_DRY_RUN_RECORD_NOT_FOUND",
            "Dry-run record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "ABA_DRY_RUN_STORAGE_ERROR",
        error?.message || "Dry-run retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(
        tx.objectStore(storeName).getAll()
      );

      return runtime.success(
        values.map(structuredClone)
      );
    }catch(error){
      return runtime.failure(
        "ABA_DRY_RUN_STORAGE_ERROR",
        error?.message || "Dry-run listing failed."
      );
    }
  }

  global.INFINICUS.ABA.dryRunStore =
    Object.freeze({
      open,
      put,
      get,
      list
    });
})(window);
