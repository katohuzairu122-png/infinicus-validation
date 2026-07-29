# INFINICUS ADI-05

Business Digital Twin Context Adapter, version 1.0.0.

ADI-05 is a read-only boundary between the existing Business Digital Twin layer and AI Decision Intelligence. It retrieves an authoritative twin snapshot, validates tenant/business ownership and converts the snapshot into provenance-preserving ADI-04 context fragments.

The adapter never creates, edits or publishes a Digital Twin.

## Validate

```bash
npm test
```
