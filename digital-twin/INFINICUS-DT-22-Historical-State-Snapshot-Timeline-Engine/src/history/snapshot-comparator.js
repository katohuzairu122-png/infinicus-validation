(function (global) {
  "use strict";

  function stateMap(snapshot) {
    return new Map(
      (snapshot?.state || []).map(item => [
        item.stateKey,
        item
      ])
    );
  }

  function compare(previous, current) {
    const before = stateMap(previous);
    const after = stateMap(current);

    const keys = new Set([
      ...before.keys(),
      ...after.keys()
    ]);

    const added = [];
    const removed = [];
    const changed = [];
    const unchanged = [];

    for (const key of keys) {
      const left = before.get(key);
      const right = after.get(key);

      if (!left && right) {
        added.push(structuredClone(right));
      } else if (left && !right) {
        removed.push(structuredClone(left));
      } else if (
        JSON.stringify(left?.value) !==
        JSON.stringify(right?.value)
      ) {
        changed.push({
          stateKey: key,
          before: structuredClone(left),
          after: structuredClone(right)
        });
      } else {
        unchanged.push(key);
      }
    }

    return {
      added,
      removed,
      changed,
      unchanged,
      addedCount: added.length,
      removedCount: removed.length,
      changedCount: changed.length,
      unchangedCount: unchanged.length
    };
  }

  global.INFINICUS.DT.snapshotComparator =
    Object.freeze({ compare });
})(window);
