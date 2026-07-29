(function(global){
  "use strict";

  const runtime=global.INFINICUS.BI.runtime;
  const DB_NAME="INFINICUS_BI_TWIN_PUBLICATION";
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
          ["policies","twinPublicationPolicyId"],
          ["destinations","twinDestinationId"],
          ["state_packages","businessStatePackageId"],
          ["publications","twinPublicationId"],
          ["receipts","twinPublicationReceiptId"],
          ["dead_letters","twinPublicationDeadLetterId"],
          ["integration_handoffs","biIntegrationHandoffId"]
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
        "BI_TWIN_PUBLICATION_STORAGE_ERROR",
        error?.message || "Twin-publication storage failed."
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
            "BI_TWIN_PUBLICATION_RECORD_NOT_FOUND",
            "Twin-publication record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "BI_TWIN_PUBLICATION_STORAGE_ERROR",
        error?.message || "Twin-publication retrieval failed."
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
            "BI_TWIN_PUBLICATION_NOT_FOUND",
            "Twin publication was not found.",
            {idempotencyKey}
          );
    }catch(error){
      return runtime.failure(
        "BI_TWIN_PUBLICATION_STORAGE_ERROR",
        error?.message || "Twin-publication retrieval failed."
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
        "BI_TWIN_PUBLICATION_STORAGE_ERROR",
        error?.message || "Twin-publication listing failed."
      );
    }
  }

  global.INFINICUS.BI.twinPublicationStore=
    Object.freeze({open,put,get,getByIdempotencyKey,list});
})(window);
