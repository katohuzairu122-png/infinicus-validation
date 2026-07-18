(function (global) {
  "use strict";

  const runtime = global.INFINICUS.DT.runtime;
  const DB_NAME = "INFINICUS_DT_ENTITY_GRAPH";
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

        if (!db.objectStoreNames.contains("entities")) {
          const store =
            db.createObjectStore(
              "entities",
              { keyPath: "entityInstanceId" }
            );

          store.createIndex(
            "twinId",
            "twinId",
            { unique: false }
          );

          store.createIndex(
            "entityKey",
            "entityKey",
            { unique: false }
          );
        }

        if (!db.objectStoreNames.contains("relationships")) {
          const store =
            db.createObjectStore(
              "relationships",
              { keyPath: "relationshipInstanceId" }
            );

          store.createIndex(
            "twinId",
            "twinId",
            { unique: false }
          );
        }

        if (!db.objectStoreNames.contains("graph_builds")) {
          db.createObjectStore(
            "graph_builds",
            { keyPath: "graphBuildId" }
          );
        }

        if (!db.objectStoreNames.contains("organization_handoffs")) {
          db.createObjectStore(
            "organization_handoffs",
            { keyPath: "organizationHandoffId" }
          );
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
        tx.objectStore(storeName).put(structuredClone(record))
      );
      return runtime.success(structuredClone(record));
    } catch (error) {
      return runtime.failure(
        "GRAPH_STORAGE_ERROR",
        error?.message || "Graph storage failed."
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
            "GRAPH_RECORD_NOT_FOUND",
            "Graph record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "GRAPH_STORAGE_ERROR",
        error?.message || "Graph retrieval failed."
      );
    }
  }

  async function listByTwin(storeName, twinId) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const values = await request(
        tx.objectStore(storeName)
          .index("twinId")
          .getAll(twinId)
      );

      return runtime.success(values.map(structuredClone));
    } catch (error) {
      return runtime.failure(
        "GRAPH_STORAGE_ERROR",
        error?.message || "Graph listing failed."
      );
    }
  }

  global.INFINICUS.DT.graphStore =
    Object.freeze({
      open,
      put,
      get,
      listByTwin
    });
})(window);
