(function (global) {
  "use strict";

  const runtime = global.INFINICUS.DT.runtime;
  const DB_NAME = "INFINICUS_DT_HISTORY_TIMELINE";
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

        if (!db.objectStoreNames.contains("snapshots")) {
          const store = db.createObjectStore(
            "snapshots",
            { keyPath: "historicalSnapshotId" }
          );

          store.createIndex(
            "twinId",
            "twinId",
            { unique: false }
          );

          store.createIndex(
            "twinVersionKey",
            "twinVersionKey",
            { unique: true }
          );
        }

        for (const [name, keyPath] of [
          ["timeline_entries", "timelineEntryId"],
          ["scenario_handoffs", "scenarioHandoffId"]
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
        "HISTORY_STORAGE_ERROR",
        error?.message || "History storage failed."
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
            "HISTORY_RECORD_NOT_FOUND",
            "History record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "HISTORY_STORAGE_ERROR",
        error?.message || "History retrieval failed."
      );
    }
  }

  async function listTwinSnapshots(twinId) {
    try {
      const db = await open();
      const tx = db.transaction("snapshots", "readonly");

      const values = await request(
        tx.objectStore("snapshots")
          .index("twinId")
          .getAll(twinId)
      );

      return runtime.success(
        values
          .map(structuredClone)
          .sort((a, b) => a.version - b.version)
      );
    } catch (error) {
      return runtime.failure(
        "HISTORY_STORAGE_ERROR",
        error?.message || "Snapshot listing failed."
      );
    }
  }

  global.INFINICUS.DT.historyStore =
    Object.freeze({
      open,
      put,
      get,
      listTwinSnapshots
    });
})(window);
