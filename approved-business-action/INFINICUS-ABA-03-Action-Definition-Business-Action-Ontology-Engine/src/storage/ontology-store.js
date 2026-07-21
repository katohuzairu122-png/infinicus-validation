(function (global) {
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;
  const DB_NAME = "INFINICUS_ABA_ACTION_ONTOLOGY";
  let dbPromise;

  const request = req => new Promise((resolve, reject) => {
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
          ["categories", "actionCategoryId"],
          ["targets", "targetTypeId"],
          ["parameters", "parameterSchemaId"],
          ["action_types", "actionTypeId"],
          ["definitions", "actionDefinitionId"],
          ["quarantine", "actionDefinitionQuarantineId"],
          ["handoffs", "actionInstanceHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath });

            if (name === "action_types") {
              store.createIndex("code", "code", { unique: true });
            }
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
      await request(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    } catch (error) {
      return runtime.failure(
        "ABA_ONTOLOGY_STORAGE_ERROR",
        error?.message || "Action ontology storage failed."
      );
    }
  }

  async function get(storeName, id) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const value = await request(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "ABA_ONTOLOGY_RECORD_NOT_FOUND",
            "Action ontology record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "ABA_ONTOLOGY_STORAGE_ERROR",
        error?.message || "Action ontology retrieval failed."
      );
    }
  }

  async function list(storeName) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const values = await request(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    } catch (error) {
      return runtime.failure(
        "ABA_ONTOLOGY_STORAGE_ERROR",
        error?.message || "Action ontology listing failed."
      );
    }
  }

  global.INFINICUS.ABA.actionOntologyStore =
    Object.freeze({ open, put, get, list });
})(window);
