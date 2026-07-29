(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_OBSERVATION_COLLECTION";
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
          ["policies","observationCollectionPolicyId"],
          ["runs","observationCollectionRunId"],
          ["observations","observationId"],
          ["dead_letters","observationCollectionDeadLetterId"],
          ["quality_handoffs","observationQualityHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});

            if(name==="observations"){
              store.createIndex(
                "idempotencyKey",
                "idempotencyKey",
                {unique:true}
              );
            }
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
        "OM_COLLECTION_STORAGE_ERROR",
        error?.message || "Observation collection storage failed."
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
            "OM_COLLECTION_RECORD_NOT_FOUND",
            "Observation collection record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_COLLECTION_STORAGE_ERROR",
        error?.message || "Observation collection retrieval failed."
      );
    }
  }

  async function getByIdempotencyKey(idempotencyKey){
    try{
      const db=await open();
      const tx=db.transaction("observations","readonly");
      const value=await reqp(
        tx.objectStore("observations")
          .index("idempotencyKey")
          .get(idempotencyKey)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_OBSERVATION_NOT_FOUND",
            "Observation was not previously collected."
          );
    }catch(error){
      return runtime.failure(
        "OM_COLLECTION_STORAGE_ERROR",
        error?.message || "Observation collection retrieval failed."
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
        "OM_COLLECTION_STORAGE_ERROR",
        error?.message || "Observation collection listing failed."
      );
    }
  }

  global.INFINICUS.OM.observationCollectionStore=
    Object.freeze({
      open,
      put,
      get,
      getByIdempotencyKey,
      list
    });
})(window);
