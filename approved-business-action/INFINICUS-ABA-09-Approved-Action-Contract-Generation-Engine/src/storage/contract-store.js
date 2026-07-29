(function(global){
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;
  const DB_NAME = "INFINICUS_ABA_ACTION_CONTRACT";
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
          ["templates","actionContractTemplateId"],
          ["contracts","actionContractId"],
          ["versions","actionContractVersionId"],
          ["revocations","actionContractRevocationId"],
          ["boundary_handoffs","actionBoundaryHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});

            if(name==="contracts"){
              store.createIndex(
                "actionInstanceId",
                "actionInstanceId",
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
      await reqp(
        tx.objectStore(storeName)
          .put(structuredClone(record))
      );

      return runtime.success(
        structuredClone(record)
      );
    }catch(error){
      return runtime.failure(
        "ABA_CONTRACT_STORAGE_ERROR",
        error?.message || "Action-contract storage failed."
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
            "ABA_CONTRACT_RECORD_NOT_FOUND",
            "Action-contract record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "ABA_CONTRACT_STORAGE_ERROR",
        error?.message || "Action-contract retrieval failed."
      );
    }
  }

  async function getByActionInstanceId(actionInstanceId){
    try{
      const db=await open();
      const tx=db.transaction("contracts","readonly");
      const value=await reqp(
        tx.objectStore("contracts")
          .index("actionInstanceId")
          .get(actionInstanceId)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "ABA_ACTION_CONTRACT_NOT_FOUND",
            "Action contract was not found.",
            {actionInstanceId}
          );
    }catch(error){
      return runtime.failure(
        "ABA_CONTRACT_STORAGE_ERROR",
        error?.message || "Action-contract retrieval failed."
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
        "ABA_CONTRACT_STORAGE_ERROR",
        error?.message || "Action-contract listing failed."
      );
    }
  }

  global.INFINICUS.ABA.actionContractStore =
    Object.freeze({
      open,
      put,
      get,
      getByActionInstanceId,
      list
    });
})(window);
