(function (global) {
  "use strict";

  const runtime =
    global.INFINICUS.DT.runtime;

  const DB_NAME =
    "INFINICUS_DT_OPPORTUNITY_STRATEGY";

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
            ["capabilities", "strategicCapabilityId"],
            ["opportunities", "strategicOpportunityId"],
            ["snapshots", "strategicPositionSnapshotId"],
            ["integrity_handoffs", "integrityHandoffId"]
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
                  "capabilities",
                  "opportunities"
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

  async function put(
    storeName,
    record
  ) {
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
        "OPPORTUNITY_STORAGE_ERROR",
        error?.message ||
          "Opportunity storage failed."
      );
    }
  }

  async function get(
    storeName,
    id
  ) {
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
            "OPPORTUNITY_RECORD_NOT_FOUND",
            "Opportunity record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "OPPORTUNITY_STORAGE_ERROR",
        error?.message ||
          "Opportunity retrieval failed."
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
        "OPPORTUNITY_STORAGE_ERROR",
        error?.message ||
          "Opportunity listing failed."
      );
    }
  }

  global.INFINICUS.DT.opportunityStore =
    Object.freeze({
      open,
      put,
      get,
      listByTwin
    });
})(window);
