(function (global) {
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;
  const DB_NAME = "INFINICUS_ABA_AUTHORITY_RIGHTS";
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
          ["roles", "roleId"],
          ["scopes", "authorityScopeId"],
          ["rights", "decisionRightId"],
          ["delegations", "delegationId"],
          ["evaluations", "authorityEvaluationId"],
          ["policy_handoffs", "approvalPolicyHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath });

            if (name === "evaluations") {
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
        "ABA_AUTHORITY_STORAGE_ERROR",
        error?.message || "Authority storage failed."
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
            "ABA_AUTHORITY_RECORD_NOT_FOUND",
            "Authority record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "ABA_AUTHORITY_STORAGE_ERROR",
        error?.message || "Authority retrieval failed."
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
        "ABA_AUTHORITY_STORAGE_ERROR",
        error?.message || "Authority listing failed."
      );
    }
  }

  global.INFINICUS.ABA.authorityStore =
    Object.freeze({ open, put, get, list });
})(window);
