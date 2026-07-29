# Architecture

The intake pipeline is deterministic:

`normalize → authorize → validate → detect duplicate → classify → create DecisionCase → publish event`

Authorization, time, ID generation, duplicate storage and event publication are injected ports. This keeps ADI-02 compatible with local-first INFINICUS deployments while permitting later cloud adapters.

The block does not call an AI model and cannot generate or approve a recommendation.
