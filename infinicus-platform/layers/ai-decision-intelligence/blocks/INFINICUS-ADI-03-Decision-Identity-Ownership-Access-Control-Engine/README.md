# INFINICUS ADI-03

Decision Identity, Ownership and Access Control Engine, version 1.0.0.

ADI-03 secures the canonical `DecisionCase` created by ADI-02. It resolves identities through an injected trusted adapter, enforces tenant and business boundaries, assigns ownership, evaluates role-based permissions and produces auditable access decisions.

The engine fails closed. It never trusts identity or permission claims inside a submitted decision payload.

## Validate

```bash
npm test
```

See `docs/INTEGRATION-CONTRACT.md` for attachment to ADI-01 and the ADI-02 handoff.
