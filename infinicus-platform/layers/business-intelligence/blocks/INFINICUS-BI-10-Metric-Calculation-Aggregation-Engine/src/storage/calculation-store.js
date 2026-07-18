(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;
  const DB_NAME = "INFINICUS_BI_METRIC_CALCULATIONS";
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
          ["calculation_runs", "calculationRunId"],
          ["metric_results", "metricResultId"],
          ["intelligence_handoffs", "intelligenceHandoffId"]
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

      return runtime.success(structuredClone(record));
    } catch (error) {
      return runtime.failure(
        "CALCULATION_STORAGE_ERROR",
        error?.message || "Calculation storage failed."
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
            "CALCULATION_RECORD_NOT_FOUND",
            "Calculation record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "CALCULATION_STORAGE_ERROR",
        error?.message || "Calculation retrieval failed."
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

      return runtime.success(values.map(structuredClone));
    } catch (error) {
      return runtime.failure(
        "CALCULATION_STORAGE_ERROR",
        error?.message || "Calculation listing failed."
      );
    }
  }

  global.INFINICUS.BI.calculationStore =
    Object.freeze({
      open,
      put,
      get,
      list
    });
})(window);
