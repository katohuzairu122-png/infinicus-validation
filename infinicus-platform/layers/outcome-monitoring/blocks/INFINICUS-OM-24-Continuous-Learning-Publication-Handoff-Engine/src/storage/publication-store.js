(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_LEARNING_PUBLICATION";
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
          ["policies","learningPublicationPolicyId"],
          ["targets","learningPublicationTargetId"],
          ["publications","learningPublicationId"],
          ["receipts","learningPublicationReceiptId"],
          ["failures","learningPublicationFailureId"],
          ["assembly_handoffs","outcomeMonitoringAssemblyHandoffId"]
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
        "OM_PUBLICATION_STORAGE_ERROR",
        error?.message || "Publication storage failed."
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
            "OM_PUBLICATION_RECORD_NOT_FOUND",
            "Publication record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_PUBLICATION_STORAGE_ERROR",
        error?.message || "Publication retrieval failed."
      );
    }
  }

  async function getByIdempotencyKey(key){
    try{
      const db=await open();
      const tx=db.transaction("publications","readonly");
      const value=await reqp(
        tx.objectStore("publications")
          .index("idempotencyKey")
          .get(key)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_PUBLICATION_NOT_FOUND",
            "Publication was not previously completed."
          );
    }catch(error){
      return runtime.failure(
        "OM_PUBLICATION_STORAGE_ERROR",
        error?.message || "Publication lookup failed."
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
        "OM_PUBLICATION_STORAGE_ERROR",
        error?.message || "Publication listing failed."
      );
    }
  }

  global.INFINICUS.OM.learningPublicationStore=
    Object.freeze({
      open,
      put,
      get,
      getByIdempotencyKey,
      list
    });
})(window);
