(function (global) {
  "use strict";

  const runtime = global.INFINICUS.DT.runtime;
  const DB_NAME = "INFINICUS_DT_TWIN_REGISTRY";
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

        if (!db.objectStoreNames.contains("businesses")) {
          const store =
            db.createObjectStore(
              "businesses",
              { keyPath: "businessId" }
            );

          store.createIndex(
            "businessKey",
            "businessKey",
            { unique: true }
          );
        }

        if (!db.objectStoreNames.contains("twins")) {
          const store =
            db.createObjectStore(
              "twins",
              { keyPath: "twinId" }
            );

          store.createIndex(
            "twinKey",
            "twinKey",
            { unique: true }
          );

          store.createIndex(
            "businessId",
            "businessId",
            { unique: false }
          );

          store.createIndex(
            "parentTwinId",
            "parentTwinId",
            { unique: false }
          );
        }

        if (!db.objectStoreNames.contains("schema_handoffs")) {
          db.createObjectStore(
            "schema_handoffs",
            { keyPath: "schemaHandoffId" }
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
        "TWIN_REGISTRY_STORAGE_ERROR",
        error?.message || "Twin registry storage failed."
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
            "TWIN_REGISTRY_RECORD_NOT_FOUND",
            "Twin registry record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "TWIN_REGISTRY_STORAGE_ERROR",
        error?.message || "Twin registry retrieval failed."
      );
    }
  }

  async function getByIndex(storeName, indexName, value) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");

      const record = await request(
        tx.objectStore(storeName)
          .index(indexName)
          .get(value)
      );

      return record
        ? runtime.success(structuredClone(record))
        : runtime.failure(
            "TWIN_REGISTRY_RECORD_NOT_FOUND",
            "Twin registry record was not found.",
            {
              storeName,
              indexName,
              value
            }
          );
    } catch (error) {
      return runtime.failure(
        "TWIN_REGISTRY_STORAGE_ERROR",
        error?.message || "Twin registry indexed retrieval failed."
      );
    }
  }

  async function listByIndex(storeName, indexName, value) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");

      const records = await request(
        tx.objectStore(storeName)
          .index(indexName)
          .getAll(value)
      );

      return runtime.success(
        records.map(structuredClone)
      );
    } catch (error) {
      return runtime.failure(
        "TWIN_REGISTRY_STORAGE_ERROR",
        error?.message || "Twin registry indexed listing failed."
      );
    }
  }

  async function list(storeName) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");

      const records = await request(
        tx.objectStore(storeName).getAll()
      );

      return runtime.success(
        records.map(structuredClone)
      );
    } catch (error) {
      return runtime.failure(
        "TWIN_REGISTRY_STORAGE_ERROR",
        error?.message || "Twin registry listing failed."
      );
    }
  }

  global.INFINICUS.DT.twinRegistryStore =
    Object.freeze({
      open,
      put,
      get,
      getByIndex,
      listByIndex,
      list
    });
})(window);
