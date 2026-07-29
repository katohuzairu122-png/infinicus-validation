(function (global) {
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;
  const DB_NAME = "INFINICUS_ABA_ACTION_LIFECYCLE";
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

        if (!db.objectStoreNames.contains("instances")) {
          const store = db.createObjectStore(
            "instances",
            { keyPath: "actionInstanceId" }
          );

          store.createIndex(
            "actionDefinitionId",
            "actionDefinitionId",
            { unique: true }
          );

          store.createIndex(
            "businessId",
            "businessId",
            { unique: false }
          );
        }

        for (const [name, keyPath] of [
          ["transitions", "actionTransitionId"],
          ["authority_handoffs", "authorityHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath });

            if (name === "transitions") {
              store.createIndex(
                "actionInstanceId",
                "actionInstanceId",
                { unique: false }
              );
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
        "ABA_LIFECYCLE_STORAGE_ERROR",
        error?.message || "Action lifecycle storage failed."
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
            "ABA_LIFECYCLE_RECORD_NOT_FOUND",
            "Action lifecycle record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "ABA_LIFECYCLE_STORAGE_ERROR",
        error?.message || "Action lifecycle retrieval failed."
      );
    }
  }

  async function getByDefinitionId(actionDefinitionId) {
    try {
      const db = await open();
      const tx = db.transaction("instances", "readonly");
      const value = await request(
        tx.objectStore("instances")
          .index("actionDefinitionId")
          .get(actionDefinitionId)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "ABA_ACTION_INSTANCE_NOT_FOUND",
            "Action instance was not found.",
            { actionDefinitionId }
          );
    } catch (error) {
      return runtime.failure(
        "ABA_LIFECYCLE_STORAGE_ERROR",
        error?.message || "Action instance retrieval failed."
      );
    }
  }

  async function listTransitions(actionInstanceId) {
    try {
      const db = await open();
      const tx = db.transaction("transitions", "readonly");
      const values = await request(
        tx.objectStore("transitions")
          .index("actionInstanceId")
          .getAll(actionInstanceId)
      );

      return runtime.success(
        values
          .map(structuredClone)
          .sort((a, b) =>
            new Date(a.occurredAt).getTime() -
            new Date(b.occurredAt).getTime()
          )
      );
    } catch (error) {
      return runtime.failure(
        "ABA_LIFECYCLE_STORAGE_ERROR",
        error?.message || "Action transition listing failed."
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
        "ABA_LIFECYCLE_STORAGE_ERROR",
        error?.message || "Action lifecycle listing failed."
      );
    }
  }

  global.INFINICUS.ABA.actionLifecycleStore =
    Object.freeze({
      open,
      put,
      get,
      getByDefinitionId,
      listTransitions,
      list
    });
})(window);
