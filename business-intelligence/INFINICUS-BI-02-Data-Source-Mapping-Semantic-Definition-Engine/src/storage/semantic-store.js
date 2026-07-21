(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;
  const DB_NAME = "INFINICUS_BI_SEMANTIC_MODEL";
  let dbPromise;

  const request = req =>
    new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

  function open() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);

      req.onupgradeneeded = () => {
        const db = req.result;

        for (const [name, keyPath] of [
          ["source_systems", "sourceSystemId"],
          ["semantic_entities", "semanticEntityId"],
          ["field_mappings", "fieldMappingId"],
          ["dataset_contracts", "datasetContractId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath });
          }
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return dbPromise;
  }

  async function put(storeName, record) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readwrite");

      await request(
        tx.objectStore(storeName)
          .put(structuredClone(record))
      );

      return runtime.success(
        structuredClone(record)
      );
    } catch (error) {
      return runtime.failure(
        "SEMANTIC_STORAGE_ERROR",
        error?.message ||
          "Semantic storage failed."
      );
    }
  }

  async function get(storeName, id) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");

      const value = await request(
        tx.objectStore(storeName).get(id)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "SEMANTIC_RECORD_NOT_FOUND",
            "Semantic record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "SEMANTIC_STORAGE_ERROR",
        error?.message ||
          "Semantic retrieval failed."
      );
    }
  }

  async function list(storeName) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");

      const values = await request(
        tx.objectStore(storeName).getAll()
      );

      return runtime.success(
        values.map(structuredClone)
      );
    } catch (error) {
      return runtime.failure(
        "SEMANTIC_STORAGE_ERROR",
        error?.message ||
          "Semantic listing failed."
      );
    }
  }

  global.INFINICUS.BI.semanticStore =
    Object.freeze({
      open,
      put,
      get,
      list
    });
})(window);
