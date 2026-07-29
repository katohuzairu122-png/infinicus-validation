(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_CONTRACT_INTAKE";
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
          ["policies","monitoringContractIntakePolicyId"],
          ["contracts","monitoringContractIntakeId"],
          ["quarantine","monitoringContractQuarantineId"],
          ["metric_handoffs","metricRegistryHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});

            if(name==="contracts"){
              store.createIndex(
                "sourceContractId",
                "sourceContractId",
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
        "OM_INTAKE_STORAGE_ERROR",
        error?.message || "Monitoring-contract intake storage failed."
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
            "OM_INTAKE_RECORD_NOT_FOUND",
            "Monitoring-contract intake record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_INTAKE_STORAGE_ERROR",
        error?.message || "Monitoring-contract intake retrieval failed."
      );
    }
  }

  async function getBySourceContractId(sourceContractId){
    try{
      const db=await open();
      const tx=db.transaction("contracts","readonly");
      const value=await reqp(
        tx.objectStore("contracts")
          .index("sourceContractId")
          .get(sourceContractId)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_INTAKE_RECORD_NOT_FOUND",
            "Monitoring contract was not previously ingested."
          );
    }catch(error){
      return runtime.failure(
        "OM_INTAKE_STORAGE_ERROR",
        error?.message || "Monitoring-contract intake retrieval failed."
      );
    }
  }

  global.INFINICUS.OM.monitoringContractIntakeStore=
    Object.freeze({open,put,get,getBySourceContractId});
})(window);
