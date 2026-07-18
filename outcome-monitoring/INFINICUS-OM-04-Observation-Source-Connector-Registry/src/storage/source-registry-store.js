(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_SOURCE_CONNECTOR_REGISTRY";
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
          ["sources","observationSourceId"],
          ["connectors","observationConnectorId"],
          ["bindings","observationSourceBindingId"],
          ["collection_handoffs","observationCollectionHandoffId"]
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
        "OM_SOURCE_REGISTRY_STORAGE_ERROR",
        error?.message || "Source registry storage failed."
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
            "OM_SOURCE_REGISTRY_RECORD_NOT_FOUND",
            "Source registry record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_SOURCE_REGISTRY_STORAGE_ERROR",
        error?.message || "Source registry retrieval failed."
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
        "OM_SOURCE_REGISTRY_STORAGE_ERROR",
        error?.message || "Source registry listing failed."
      );
    }
  }

  global.INFINICUS.OM.observationSourceRegistryStore=
    Object.freeze({open,put,get,list});
})(window);
