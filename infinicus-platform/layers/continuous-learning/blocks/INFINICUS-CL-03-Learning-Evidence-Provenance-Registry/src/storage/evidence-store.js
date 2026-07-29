(function(global){
  "use strict";

  const runtime=global.INFINICUS.CL.runtime;
  const DB_NAME="INFINICUS_CL_LEARNING_EVIDENCE";
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
          ["policies","learningEvidencePolicyId"],
          ["evidence","learningEvidenceId"],
          ["provenance","learningProvenanceId"],
          ["bindings","learningEvidenceBindingId"],
          ["handoffs","lessonClassificationHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});

            if(name==="evidence"){
              store.createIndex(
                "fingerprint",
                "fingerprint",
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
        "CL_EVIDENCE_STORAGE_ERROR",
        error?.message || "Learning evidence storage failed."
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
            "CL_EVIDENCE_RECORD_NOT_FOUND",
            "Learning evidence record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "CL_EVIDENCE_STORAGE_ERROR",
        error?.message || "Learning evidence retrieval failed."
      );
    }
  }

  async function getByFingerprint(fingerprint){
    try{
      const db=await open();
      const tx=db.transaction("evidence","readonly");
      const value=await reqp(
        tx.objectStore("evidence")
          .index("fingerprint")
          .get(fingerprint)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "CL_EVIDENCE_FINGERPRINT_NOT_FOUND",
            "No evidence record matches the fingerprint."
          );
    }catch(error){
      return runtime.failure(
        "CL_EVIDENCE_STORAGE_ERROR",
        error?.message || "Learning evidence lookup failed."
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
        "CL_EVIDENCE_STORAGE_ERROR",
        error?.message || "Learning evidence listing failed."
      );
    }
  }

  global.INFINICUS.CL.learningEvidenceStore=
    Object.freeze({
      open,
      put,
      get,
      getByFingerprint,
      list
    });
})(window);
