(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;
  const DB_NAME = "INFINICUS_BI_METRICS";
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
          ["metrics", "metricId"],
          ["lineage", "metricLineageId"],
          ["calculation_handoffs", "calculationHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            const store =
              db.createObjectStore(name, { keyPath });

            if (name === "metrics") {
              store.createIndex(
                "code",
                "code",
                { unique: true }
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

      await request(
        tx.objectStore(storeName)
          .put(structuredClone(record))
      );

      return runtime.success(structuredClone(record));
    } catch (error) {
      return runtime.failure(
        "METRIC_STORAGE_ERROR",
        error?.message || "Metric storage failed."
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
            "METRIC_RECORD_NOT_FOUND",
            "Metric record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "METRIC_STORAGE_ERROR",
        error?.message || "Metric retrieval failed."
      );
    }
  }

  async function getByCode(code) {
    try {
      const db = await open();
      const tx = db.transaction("metrics", "readonly");
      const value = await request(
        tx.objectStore("metrics")
          .index("code")
          .get(code)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "METRIC_NOT_FOUND",
            `Metric was not found: ${code}`
          );
    } catch (error) {
      return runtime.failure(
        "METRIC_STORAGE_ERROR",
        error?.message || "Metric lookup failed."
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
        "METRIC_STORAGE_ERROR",
        error?.message || "Metric listing failed."
      );
    }
  }

  global.INFINICUS.BI.metricStore =
    Object.freeze({
      open,
      put,
      get,
      getByCode,
      list
    });
})(window);
