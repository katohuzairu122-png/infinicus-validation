(function(global){
  "use strict";

  const runtime=global.INFINICUS.ABA.runtime;
  const DB_NAME="INFINICUS_ABA_CONTROLLED_EXECUTION";
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
          ["policies","controlledExecutionPolicyId"],
          ["attempts","executionAttemptId"],
          ["results","controlledExecutionResultId"],
          ["idempotency","idempotencyRecordId"],
          ["failure_handoffs","executionFailureHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});

            if(name==="idempotency"){
              store.createIndex(
                "idempotencyKey",
                "idempotencyKey",
                {unique:true}
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
      await reqp(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "ABA_EXECUTION_STORAGE_ERROR",
        error?.message || "Controlled-execution storage failed."
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
            "ABA_EXECUTION_RECORD_NOT_FOUND",
            "Controlled-execution record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "ABA_EXECUTION_STORAGE_ERROR",
        error?.message || "Controlled-execution retrieval failed."
      );
    }
  }

  async function getByIdempotencyKey(idempotencyKey){
    try{
      const db=await open();
      const tx=db.transaction("idempotency","readonly");
      const value=await reqp(
        tx.objectStore("idempotency")
          .index("idempotencyKey")
          .get(idempotencyKey)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "ABA_IDEMPOTENCY_RECORD_NOT_FOUND",
            "Idempotency record was not found.",
            {idempotencyKey}
          );
    }catch(error){
      return runtime.failure(
        "ABA_EXECUTION_STORAGE_ERROR",
        error?.message || "Idempotency retrieval failed."
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
        "ABA_EXECUTION_STORAGE_ERROR",
        error?.message || "Controlled-execution listing failed."
      );
    }
  }

  global.INFINICUS.ABA.controlledExecutionStore=
    Object.freeze({
      open,
      put,
      get,
      getByIdempotencyKey,
      list
    });
})(window);
