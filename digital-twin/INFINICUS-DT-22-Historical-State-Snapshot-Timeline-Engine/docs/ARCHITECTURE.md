# Architecture

1. Receive DT-21 history handoff.
2. Reject twins that failed readiness validation.
3. Load prior historical snapshots.
4. assign the next immutable version.
5. Build state, event, risk, opportunity, and breach timeline.
6. Generate deterministic snapshot checksum.
7. Persist immutable snapshot and timeline entries.
8. Compare current snapshot with previous version.
9. Preserve retention and supersession metadata.
10. Prepare DT-23 scenario-baseline handoff.
