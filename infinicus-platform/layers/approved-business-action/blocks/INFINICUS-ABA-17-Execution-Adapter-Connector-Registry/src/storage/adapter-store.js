(function(global){
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;
  const DB_NAME = "INFINICUS_ABA_EXECUTION_ADAPTERS";
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
          ["adapters","executionAdapterId"],
          ["connectors","connectorId"],
          ["health","adapterHealthRecordId"],
          ["selections","adapterSelectionId"],
          ["dry_run_handoffs","dryRunHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});

            if(name==="connectors"){
              store.createIndex(
                "executionAdapterId",
                "executionAdapterId",
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
        "ABA_ADAPTER_STORAGE_ERROR",
        error?.message || "Adapter storage failed."
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
            "ABA_ADAPTER_RECORD_NOT_FOUND",
            "Adapter record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "ABA_ADAPTER_STORAGE_ERROR",
        error?.message || "Adapter retrieval failed."
      );
    }
  }

  async function listByIndex(storeName,indexName,value){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(
        tx.objectStore(storeName)
          .index(indexName)
          .getAll(value)
      );

      return runtime.success(
        values.map(structuredClone)
      );
    }catch(error){
      return runtime.failure(
        "ABA_ADAPTER_STORAGE_ERROR",
        error?.message || "Adapter listing failed."
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
        "ABA_ADAPTER_STORAGE_ERROR",
        error?.message || "Adapter listing failed."
      );
    }
  }

  global.INFINICUS.ABA.executionAdapterStore =
    Object.freeze({
      open,
      put,
      get,
      listByIndex,
      list
    });
})(window);
