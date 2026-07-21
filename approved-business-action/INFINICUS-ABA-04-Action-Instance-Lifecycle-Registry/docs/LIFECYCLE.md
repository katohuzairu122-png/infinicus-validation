# Main Lifecycle

draft
→ pending_validation
→ pending_approval
→ approved
→ scheduled
→ executing
→ completed
→ verified

# Exception and Terminal States

- rejected
- revoked
- expired
- blocked
- failed
- partially_completed
- rolled_back
- cancelled

Every transition stores actor, reason, metadata, version, correlation ID, and timestamp.
