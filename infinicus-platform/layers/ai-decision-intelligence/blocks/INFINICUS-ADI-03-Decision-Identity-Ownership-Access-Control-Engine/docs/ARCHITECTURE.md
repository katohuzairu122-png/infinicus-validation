# Architecture

ADI-03 separates trusted identity resolution from policy enforcement. A caller supplies authentication context to an injected resolver. The normalized identity is evaluated against tenant, business, ownership, role and explicit-deny rules.

Evaluation order is fail-closed: identity → resource → tenant → business → explicit deny → ownership/role permission. Every result is an immutable, auditable AccessDecision.
