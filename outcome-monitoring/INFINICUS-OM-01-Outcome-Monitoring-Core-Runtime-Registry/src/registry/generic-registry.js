(function(global){
  "use strict";

  function createRegistry({
    registryName,
    idField
  }){
    const records=new Map();

    function register(record={}){
      const id=record[idField];

      if(!id){
        return global.INFINICUS.OM.resultEnvelope.failure(
          "OM_REGISTRY_RECORD_INVALID",
          `${registryName} requires ${idField}.`
        );
      }

      if(records.has(id)){
        return global.INFINICUS.OM.resultEnvelope.failure(
          "OM_REGISTRY_RECORD_DUPLICATE",
          `${registryName} record already exists: ${id}`
        );
      }

      const stored=Object.freeze({
        ...structuredClone(record),
        registeredAt:
          record.registeredAt ||
          new Date().toISOString()
      });

      records.set(id,stored);

      return global.INFINICUS.OM.resultEnvelope.success(
        structuredClone(stored)
      );
    }

    function get(id){
      const record=records.get(id);

      return record
        ? global.INFINICUS.OM.resultEnvelope.success(
            structuredClone(record)
          )
        : global.INFINICUS.OM.resultEnvelope.failure(
            "OM_REGISTRY_RECORD_NOT_FOUND",
            `${registryName} record was not found.`,
            {id}
          );
    }

    function list(){
      return global.INFINICUS.OM.resultEnvelope.success(
        [...records.values()].map(structuredClone)
      );
    }

    return Object.freeze({register,get,list});
  }

  global.INFINICUS.OM.genericRegistryFactory=
    Object.freeze({createRegistry});
})(window);
