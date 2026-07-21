(function (global) {
  "use strict";

  const runtime =
    global.INFINICUS.DT.runtime;

  const DB_NAME =
    "INFINICUS_DT_MARKET_COMPETITIVE";

  let dbPromise;

  const request = req =>
    new Promise((resolve, reject) => {
      req.onsuccess = () =>
        resolve(req.result);
      req.onerror = () =>
        reject(req.error);
    });

  function open() {
    if (dbPromise) return dbPromise;

    dbPromise =
      new Promise((resolve, reject) => {
        const req =
          indexedDB.open(DB_NAME, 1);

        req.onupgradeneeded = () => {
          const db = req.result;

          for (const [name, keyPath] of [
            ["markets", "marketId"],
            ["segments", "marketSegmentId"],
            ["competitors", "competitorId"],
            ["states", "marketStateId"],
            ["external_forces", "externalForceId"],
            ["snapshots", "marketSnapshotId"],
            ["sync_handoffs", "syncHandoffId"]
          ]) {
            if (
              !db.objectStoreNames
                .contains(name)
            ) {
              const store =
                db.createObjectStore(
                  name,
                  { keyPath }
                );

              if (
                [
                  "markets",
                  "segments",
                  "competitors",
                  "states",
                  "external_forces"
                ].includes(name)
              ) {
                store.createIndex(
                  "twinId",
                  "twinId",
                  { unique: false }
                );
              }
            }
          }
        };

        req.onsuccess = () =>
          resolve(req.result);

        req.onerror = () =>
          reject(req.error);
      });

    return dbPromise;
  }

  async function put(storeName, record) {
    try {
      const db = await open();
      const tx =
        db.transaction(
          storeName,
          "readwrite"
        );

      await request(
        tx.objectStore(storeName)
          .put(structuredClone(record))
      );

      return runtime.success(
        structuredClone(record)
      );
    } catch (error) {
      return runtime.failure(
        "MARKET_STORAGE_ERROR",
        error?.message ||
          "Market storage failed."
      );
    }
  }

  async function get(storeName, id) {
    try {
      const db = await open();
      const tx =
        db.transaction(
          storeName,
          "readonly"
        );

      const value =
        await request(
          tx.objectStore(storeName)
            .get(id)
        );

      return value
        ? runtime.success(
            structuredClone(value)
          )
        : runtime.failure(
            "MARKET_RECORD_NOT_FOUND",
            "Market record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "MARKET_STORAGE_ERROR",
        error?.message ||
          "Market retrieval failed."
      );
    }
  }

  async function listByTwin(
    storeName,
    twinId
  ) {
    try {
      const db = await open();
      const tx =
        db.transaction(
          storeName,
          "readonly"
        );

      const values =
        await request(
          tx.objectStore(storeName)
            .index("twinId")
            .getAll(twinId)
        );

      return runtime.success(
        values.map(structuredClone)
      );
    } catch (error) {
      return runtime.failure(
        "MARKET_STORAGE_ERROR",
        error?.message ||
          "Market listing failed."
      );
    }
  }

  global.INFINICUS.DT.marketStore =
    Object.freeze({
      open,
      put,
      get,
      listByTwin
    });
})(window);
