(function(global){
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;
  const DB_NAME = "INFINICUS_ABA_REVALIDATION";
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
          ["constraints","constraintRuleId"],
          ["dependencies","dependencyId"],
          ["results","revalidationResultId"],
          ["issues","revalidationIssueId"],
          ["conflict_handoffs","conflictAnalysisHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
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
        "ABA_REVALIDATION_STORAGE_ERROR",
        error?.message || "Revalidation storage failed."
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
            "ABA_REVALIDATION_RECORD_NOT_FOUND",
            "Revalidation record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "ABA_REVALIDATION_STORAGE_ERROR",
        error?.message || "Revalidation retrieval failed."
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
        "ABA_REVALIDATION_STORAGE_ERROR",
        error?.message || "Revalidation listing failed."
      );
    }
  }

  global.INFINICUS.ABA.revalidationStore =
    Object.freeze({open,put,get,list});
})(window);
