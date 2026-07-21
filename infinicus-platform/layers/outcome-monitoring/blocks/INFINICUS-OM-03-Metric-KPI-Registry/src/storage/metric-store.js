(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const DB_NAME="INFINICUS_OM_METRIC_REGISTRY";
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

        if(!db.objectStoreNames.contains("metrics")){
          const store=db.createObjectStore(
            "metrics",
            {keyPath:"metricId"}
          );
          store.createIndex("code","code",{unique:true});
        }

        for(const [name,keyPath] of [
          ["versions","metricVersionId"],
          ["source_bindings","metricSourceBindingId"],
          ["source_handoffs","observationSourceHandoffId"]
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
        "OM_METRIC_STORAGE_ERROR",
        error?.message || "Metric registry storage failed."
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
            "OM_METRIC_RECORD_NOT_FOUND",
            "Metric registry record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "OM_METRIC_STORAGE_ERROR",
        error?.message || "Metric registry retrieval failed."
      );
    }
  }

  async function getByCode(code){
    try{
      const db=await open();
      const tx=db.transaction("metrics","readonly");
      const value=await reqp(
        tx.objectStore("metrics").index("code").get(code)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OM_METRIC_NOT_FOUND",
            "Metric code was not found.",
            {code}
          );
    }catch(error){
      return runtime.failure(
        "OM_METRIC_STORAGE_ERROR",
        error?.message || "Metric registry retrieval failed."
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
        "OM_METRIC_STORAGE_ERROR",
        error?.message || "Metric registry listing failed."
      );
    }
  }

  global.INFINICUS.OM.metricKPIStore=
    Object.freeze({open,put,get,getByCode,list});
})(window);
