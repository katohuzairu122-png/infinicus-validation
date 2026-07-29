# INFINICUS ABA-16 — Execution Scheduling and Action Queue Engine

Version: 1.0.0

ABA-16 converts an approved execution plan with accepted assignments and confirmed resources into a controlled execution schedule and queue.

Public API:

`window.INFINICUS.ABA.executionSchedulingQueueEngine`

Capabilities:
- schedule-policy registry
- task scheduling
- dependency-aware sequencing
- execution-window enforcement
- priority queues
- retry and backoff metadata
- pause, resume, cancel, and reschedule
- due and overdue detection
- queue leasing
- ABA-17 execution-adapter handoff
- IndexedDB persistence
