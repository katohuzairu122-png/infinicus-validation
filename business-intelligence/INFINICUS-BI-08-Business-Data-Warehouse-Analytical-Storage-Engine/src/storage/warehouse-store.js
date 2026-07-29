(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;
  const DB_NAME = "INFINICUS_BI_WAREHOUSE";
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
          ["datasets", "warehouseDatasetId"],
          ["loads", "warehouseLoadId"],
          ["rows", "warehouseRowId"],
          ["snapshots", "warehouseSnapshotId"],
          ["metric_handoffs", "metricHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath });

            if (name === "rows") {
              store.createIndex(
                "warehouseDatasetId",
                "warehouseDatasetId",
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

      await request(
        tx.objectStore(storeName)
          .put(structuredClone(record))
      );

      return runtime.success(structuredClone(record));
    } catch (error) {
      return runtime.failure(
        "WAREHOUSE_STORAGE_ERROR",
        error?.message || "Warehouse storage failed."
      );
    }
  }

  async function clearRowsByDataset(warehouseDatasetId) {
    const db = await open();
    const tx = db.transaction("rows", "readwrite");
    const store = tx.objectStore("rows");
    const index = store.index("warehouseDatasetId");
    const keys = await request(
      index.getAllKeys(warehouseDatasetId)
    );

    for (const key of keys) {
      await request(store.delete(key));
    }

    return runtime.success({
      warehouseDatasetId,
      removed: keys.length
    });
  }

  async function rowsByDataset(warehouseDatasetId) {
    try {
      const db = await open();
      const tx = db.transaction("rows", "readonly");
      const rows = await request(
        tx.objectStore("rows")
          .index("warehouseDatasetId")
          .getAll(warehouseDatasetId)
      );

      return runtime.success(rows.map(structuredClone));
    } catch (error) {
      return runtime.failure(
        "WAREHOUSE_STORAGE_ERROR",
        error?.message || "Warehouse row query failed."
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
            "WAREHOUSE_RECORD_NOT_FOUND",
            "Warehouse record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "WAREHOUSE_STORAGE_ERROR",
        error?.message || "Warehouse retrieval failed."
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
        "WAREHOUSE_STORAGE_ERROR",
        error?.message || "Warehouse listing failed."
      );
    }
  }

  global.INFINICUS.BI.warehouseStore =
    Object.freeze({
      open,
      put,
      get,
      list,
      clearRowsByDataset,
      rowsByDataset
    });
})(window);
