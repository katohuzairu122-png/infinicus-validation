(function(global){
  "use strict";

  const runtime=global.INFINICUS.ABA.runtime;
  const DB_NAME="INFINICUS_ABA_OUTCOME_PUBLICATION";
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
          ["policies","outcomePublicationPolicyId"],
          ["destinations","monitoringDestinationId"],
          ["publications","outcomePublicationId"],
          ["receipts","outcomePublicationReceiptId"],
          ["dead_letters","outcomePublicationDeadLetterId"],
          ["monitoring_handoffs","outcomeMonitoringLayerHandoffId"],
          ["learning_handoffs","continuousLearningHandoffId"],
          ["manifests","approvedBusinessActionManifestId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});

            if(name==="publications"){
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
        "ABA_PUBLICATION_STORAGE_ERROR",
        error?.message || "Outcome-publication storage failed."
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
            "ABA_PUBLICATION_RECORD_NOT_FOUND",
            "Outcome-publication record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "ABA_PUBLICATION_STORAGE_ERROR",
        error?.message || "Outcome-publication retrieval failed."
      );
    }
  }

  async function getByIdempotencyKey(idempotencyKey){
    try{
      const db=await open();
      const tx=db.transaction("publications","readonly");
      const value=await reqp(
        tx.objectStore("publications")
          .index("idempotencyKey")
          .get(idempotencyKey)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "ABA_PUBLICATION_NOT_FOUND",
            "Publication was not found.",
            {idempotencyKey}
          );
    }catch(error){
      return runtime.failure(
        "ABA_PUBLICATION_STORAGE_ERROR",
        error?.message || "Outcome-publication retrieval failed."
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
        "ABA_PUBLICATION_STORAGE_ERROR",
        error?.message || "Outcome-publication listing failed."
      );
    }
  }

  global.INFINICUS.ABA.outcomePublicationStore=
    Object.freeze({
      open,
      put,
      get,
      getByIdempotencyKey,
      list
    });
})(window);
