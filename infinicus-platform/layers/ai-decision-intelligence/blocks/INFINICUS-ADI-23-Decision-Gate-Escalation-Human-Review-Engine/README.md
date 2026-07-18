# ADI-23 — Decision Gate, Escalation and Human Review Engine

Creates a governed human-review record for a challenged recommendation and decides whether it may be handed to ABA. Endorsement authorizes handoff for downstream approval processing—not the business action itself.

Service: `adi.decision_gate`; routes: `adi.gate.submit`, `adi.gate.review`, `adi.gate.get`.
