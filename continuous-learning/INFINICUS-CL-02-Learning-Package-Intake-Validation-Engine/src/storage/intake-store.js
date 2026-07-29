(function(global){
  "use strict";

  const runtime=global.INFINICUS.CL.runtime;
  const DB_NAME="INFINICUS_CL_LEARNING_INTAKE";
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
          ["policies","learningIntakePolicyId"],
          ["accepted","learningPackageIntakeId"],
          ["quarantine","learningPackageQuarantineId"],
          ["handoffs","learningEvidenceHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});

            if(name==="accepted"){
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
        "CL_INTAKE_STORAGE_ERROR",
        error?.message || "Learning intake storage failed."
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
            "CL_INTAKE_RECORD_NOT_FOUND",
            "Learning intake record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "CL_INTAKE_STORAGE_ERROR",
        error?.message || "Learning intake retrieval failed."
      );
    }
  }

  async function getAcceptedByIdempotencyKey(key){
    try{
      const db=await open();
      const tx=db.transaction("accepted","readonly");
      const value=await reqp(
        tx.objectStore("accepted")
          .index("idempotencyKey")
          .get(key)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "CL_ACCEPTED_PACKAGE_NOT_FOUND",
            "Accepted package was not previously found."
          );
    }catch(error){
      return runtime.failure(
        "CL_INTAKE_STORAGE_ERROR",
        error?.message || "Learning intake lookup failed."
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
        "CL_INTAKE_STORAGE_ERROR",
        error?.message || "Learning intake listing failed."
      );
    }
  }

  global.INFINICUS.CL.learningIntakeStore=
    Object.freeze({
      open,
      put,
      get,
      getAcceptedByIdempotencyKey,
      list
    });
})(window);
