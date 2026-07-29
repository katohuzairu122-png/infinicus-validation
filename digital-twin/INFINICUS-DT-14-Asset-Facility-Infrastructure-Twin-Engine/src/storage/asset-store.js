(function (global) {
  "use strict";

  const runtime =
    global.INFINICUS.DT.runtime;

  const DB_NAME =
    "INFINICUS_DT_ASSET_INFRASTRUCTURE";

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
            ["assets", "assetId"],
            ["facilities", "facilityId"],
            ["states", "assetStateId"],
            ["dependencies", "assetDependencyId"],
            ["snapshots", "assetSnapshotId"],
            ["market_handoffs", "marketHandoffId"]
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
                  "assets",
                  "facilities",
                  "states",
                  "dependencies"
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
        "ASSET_STORAGE_ERROR",
        error?.message ||
          "Asset storage failed."
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
            "ASSET_RECORD_NOT_FOUND",
            "Asset record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "ASSET_STORAGE_ERROR",
        error?.message ||
          "Asset retrieval failed."
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
        "ASSET_STORAGE_ERROR",
        error?.message ||
          "Asset listing failed."
      );
    }
  }

  global.INFINICUS.DT.assetStore =
    Object.freeze({
      open,
      put,
      get,
      listByTwin
    });
})(window);
