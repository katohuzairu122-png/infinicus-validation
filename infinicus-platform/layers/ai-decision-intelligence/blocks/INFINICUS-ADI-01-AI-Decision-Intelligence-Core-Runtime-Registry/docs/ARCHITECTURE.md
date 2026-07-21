# Architecture

ADI-01 is the foundation of the modular AI Decision Intelligence layer. Feature blocks register services and routes against one runtime. The runtime owns lifecycle rules, capability discovery, event publication and standardized results.

The block has no database dependency. Persistence adapters may subscribe to runtime events or register a storage service. The runtime never approves recommendations, performs business actions or evaluates real-world outcomes.
