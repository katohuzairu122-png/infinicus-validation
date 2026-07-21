# Integration Contract

1. Attach ADI-01 through ADI-07 first.
2. ADI-08 registers provider `adi08.goal_registry` with ADI-04.
3. Goals use the same business fields as the existing Goal Registry plus tenant, direction, version and governance metadata.
4. Importing legacy goals requires an explicit tenant ID.
5. Goal updates append versions; they do not overwrite history.
6. Active goals become decision context. Explicit `goalIds` restrict acquisition to those goals.
7. The existing consolidated Goal Registry remains untouched.
