(function(global){
  "use strict";
  const runtime = global.INFINICUS.ABA.runtime;
  const DB_NAME = "INFINICUS_ABA_APPROVAL_WORKFLOW";
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
          ["workflows","approvalWorkflowId"],
          ["stages","approvalStageId"],
          ["tasks","approvalTaskId"],
          ["events","approvalWorkflowEventId"],
          ["evidence_handoffs","approvalEvidenceHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});
            if(name==="tasks"){
              store.createIndex("workflowId","approvalWorkflowId",{unique:false});
              store.createIndex("stageId","approvalStageId",{unique:false});
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
      await reqp(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure("ABA_WORKFLOW_STORAGE_ERROR",error?.message||"Workflow storage failed.");
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(tx.objectStore(storeName).get(id));
      return value ? runtime.success(structuredClone(value))
        : runtime.failure("ABA_WORKFLOW_RECORD_NOT_FOUND","Workflow record not found.",{storeName,id});
    }catch(error){
      return runtime.failure("ABA_WORKFLOW_STORAGE_ERROR",error?.message||"Workflow retrieval failed.");
    }
  }

  async function listByIndex(storeName,indexName,value){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).index(indexName).getAll(value));
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure("ABA_WORKFLOW_STORAGE_ERROR",error?.message||"Workflow listing failed.");
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure("ABA_WORKFLOW_STORAGE_ERROR",error?.message||"Workflow listing failed.");
    }
  }

  global.INFINICUS.ABA.approvalWorkflowStore =
    Object.freeze({open,put,get,listByIndex,list});
})(window);
