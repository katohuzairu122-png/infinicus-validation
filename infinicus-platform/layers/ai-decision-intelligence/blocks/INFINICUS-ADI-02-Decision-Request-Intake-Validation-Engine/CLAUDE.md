# Claude Instructions — ADI-02

- Preserve ADI-02 as the only canonical entry point for modular decision requests.
- Do not generate alternatives, recommendations, approvals or execution plans here.
- Never authorize by trusting request payload claims; use the injected authorization adapter.
- Preserve tenant and business isolation in every duplicate check and event.
- Keep validation deterministic and dependency-free.
- Do not modify the existing INFINICUS Simulation Engine or consolidated Decision Intelligence HTML.
- Register the service and route through ADI-01 instead of creating a second runtime.
- Add tests for every new request type, validation rule or status.
