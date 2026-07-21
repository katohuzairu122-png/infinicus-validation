(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;
  const DB_NAME = "INFINICUS_BI_TREND_VARIANCE_BENCHMARK";
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
          ["analysis_runs", "analysisRunId"],
          ["trend_results", "trendResultId"],
          ["variance_results", "varianceResultId"],
          ["benchmark_results", "benchmarkResultId"],
          ["anomaly_handoffs", "anomalyHandoffId"]
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
      await request(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    } catch (error) {
      return runtime.failure(
        "ANALYSIS_STORAGE_ERROR",
        error?.message || "Trend and variance storage failed."
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
            "ANALYSIS_RECORD_NOT_FOUND",
            "Analysis record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "ANALYSIS_STORAGE_ERROR",
        error?.message || "Analysis retrieval failed."
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
        "ANALYSIS_STORAGE_ERROR",
        error?.message || "Analysis listing failed."
      );
    }
  }

  global.INFINICUS.BI.trendAnalysisStore =
    Object.freeze({ open, put, get, list });
})(window);
