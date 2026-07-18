(function (global) {
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;
  const DB_NAME = "INFINICUS_ABA_DECISION_INTAKE";
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
          ["policies", "intakePolicyId"],
          ["packages", "decisionPackageId"],
          ["quarantine", "quarantineRecordId"],
          ["handoffs", "actionDefinitionHandoffId"],
          ["receipts", "intakeReceiptId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath });

            if (name === "packages") {
              store.createIndex("decisionId", "decisionId", { unique: true });
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
        "ABA_INTAKE_STORAGE_ERROR",
        error?.message || "Decision intake storage failed."
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
            "ABA_INTAKE_RECORD_NOT_FOUND",
            "Decision intake record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "ABA_INTAKE_STORAGE_ERROR",
        error?.message || "Decision intake retrieval failed."
      );
    }
  }

  async function getByDecisionId(decisionId) {
    try {
      const db = await open();
      const tx = db.transaction("packages", "readonly");
      const value = await request(
        tx.objectStore("packages").index("decisionId").get(decisionId)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "ABA_DECISION_PACKAGE_NOT_FOUND",
            "Decision package was not found.",
            { decisionId }
          );
    } catch (error) {
      return runtime.failure(
        "ABA_INTAKE_STORAGE_ERROR",
        error?.message || "Decision package retrieval failed."
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
        "ABA_INTAKE_STORAGE_ERROR",
        error?.message || "Decision intake listing failed."
      );
    }
  }

  global.INFINICUS.ABA.intakeStore =
    Object.freeze({ open, put, get, getByDecisionId, list });
})(window);
