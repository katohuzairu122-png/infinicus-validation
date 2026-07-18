(function (global) {
  "use strict";

  const runtime =
    global.INFINICUS.DT.runtime;

  const DB_NAME =
    "INFINICUS_DT_WORKFORCE_CAPABILITY";

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
            ["members", "workforceMemberId"],
            ["skills", "skillId"],
            ["capabilities", "capabilityId"],
            ["states", "workforceStateId"],
            ["snapshots", "workforceSnapshotId"],
            ["asset_handoffs", "assetHandoffId"]
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
                  "members",
                  "skills",
                  "capabilities",
                  "states"
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
        "WORKFORCE_STORAGE_ERROR",
        error?.message ||
          "Workforce storage failed."
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
            "WORKFORCE_RECORD_NOT_FOUND",
            "Workforce record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "WORKFORCE_STORAGE_ERROR",
        error?.message ||
          "Workforce retrieval failed."
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
        "WORKFORCE_STORAGE_ERROR",
        error?.message ||
          "Workforce listing failed."
      );
    }
  }

  global.INFINICUS.DT.workforceStore =
    Object.freeze({
      open,
      put,
      get,
      listByTwin
    });
})(window);
