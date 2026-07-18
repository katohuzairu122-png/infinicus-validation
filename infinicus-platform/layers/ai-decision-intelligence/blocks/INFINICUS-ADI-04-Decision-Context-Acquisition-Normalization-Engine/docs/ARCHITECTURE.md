# Architecture

ADI-04 is an adapter-driven acquisition pipeline. Registered providers retrieve source-native fragments. The engine validates layer boundaries, normalizes fragment structure, preserves values and provenance, evaluates freshness and quality, detects conflicts and publishes a canonical DecisionContextEnvelope.

Provider failures are isolated and reported as partial context. ADI-04 never silently converts or guesses data.
