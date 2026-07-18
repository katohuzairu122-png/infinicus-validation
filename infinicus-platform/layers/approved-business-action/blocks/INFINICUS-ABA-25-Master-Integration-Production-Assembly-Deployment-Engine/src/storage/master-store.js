(function(global){
  "use strict";

  const DB_NAME = "INFINICUS_ABA_MASTER_INTEGRATION";
  let dbPromise;

  function requestPromise(request){
    return new Promise((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
  }

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise = new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;

        for(const [name,keyPath] of [
          ["diagnostics","diagnosticId"],
          ["readiness_reports","readinessReportId"],
          ["pipeline_runs","pipelineRunId"],
          ["deployment_manifests","deploymentManifestId"]
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
    const db=await open();
    const transaction=db.transaction(storeName,"readwrite");
    await requestPromise(
      transaction.objectStore(storeName).put(structuredClone(record))
    );
    return structuredClone(record);
  }

  async function get(storeName,id){
    const db=await open();
    const transaction=db.transaction(storeName,"readonly");
    return requestPromise(
      transaction.objectStore(storeName).get(id)
    );
  }

  async function list(storeName){
    const db=await open();
    const transaction=db.transaction(storeName,"readonly");
    return requestPromise(
      transaction.objectStore(storeName).getAll()
    );
  }

  global.INFINICUS.ABA.masterIntegrationStore =
    Object.freeze({open,put,get,list});
})(window);
