(function (global) {
  "use strict";

  const runtime =
    global.INFINICUS.DT.runtime;

  const DB_NAME =
    "INFINICUS_DT_SYNCHRONIZATION";

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

          if (
            !db.objectStoreNames
              .contains("policies")
          ) {
            db.createObjectStore(
              "policies",
              {
                keyPath:
                  "synchronizationPolicyId"
              }
            );
          }

          if (
            !db.objectStoreNames
              .contains("states")
          ) {
            const store =
              db.createObjectStore(
                "states",
                {
                  keyPath:
                    "businessStateRecordId"
                }
              );

            store.createIndex(
              "twinId",
              "twinId",
              { unique: false }
            );

            store.createIndex(
              "twinStateKey",
              "twinStateKey",
              { unique: true }
            );
          }

          for (const [name, keyPath] of [
            ["sync_runs", "synchronizationRunId"],
            ["conflicts", "stateConflictId"],
            ["transition_handoffs", "transitionHandoffId"]
          ]) {
            if (
              !db.objectStoreNames
                .contains(name)
            ) {
              db.createObjectStore(
                name,
                { keyPath }
              );
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
        "SYNC_STORAGE_ERROR",
        error?.message ||
          "Synchronization storage failed."
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
            "SYNC_RECORD_NOT_FOUND",
            "Synchronization record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "SYNC_STORAGE_ERROR",
        error?.message ||
          "Synchronization retrieval failed."
      );
    }
  }

  async function getState(
    twinId,
    stateKey
  ) {
    try {
      const db = await open();
      const tx =
        db.transaction(
          "states",
          "readonly"
        );

      const value =
        await request(
          tx.objectStore("states")
            .index("twinStateKey")
            .get(
              `${twinId}|${stateKey}`
            )
        );

      return value
        ? runtime.success(
            structuredClone(value)
          )
        : runtime.failure(
            "SYNC_STATE_NOT_FOUND",
            "Synchronized state was not found.",
            {
              twinId,
              stateKey
            }
          );
    } catch (error) {
      return runtime.failure(
        "SYNC_STORAGE_ERROR",
        error?.message ||
          "Synchronized state retrieval failed."
      );
    }
  }

  async function listByTwin(
    twinId
  ) {
    try {
      const db = await open();
      const tx =
        db.transaction(
          "states",
          "readonly"
        );

      const values =
        await request(
          tx.objectStore("states")
            .index("twinId")
            .getAll(twinId)
        );

      return runtime.success(
        values.map(structuredClone)
      );
    } catch (error) {
      return runtime.failure(
        "SYNC_STORAGE_ERROR",
        error?.message ||
          "Synchronized state listing failed."
      );
    }
  }

  global.INFINICUS.DT
    .synchronizationStore =
      Object.freeze({
        open,
        put,
        get,
        getState,
        listByTwin
      });
})(window);
