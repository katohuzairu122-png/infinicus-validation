# Claude Instructions — ADI-01

- Treat this package as the sole foundational runtime for modular ADI blocks.
- Extend through public registry, route and event APIs; do not bypass them.
- Do not place recommendation generation, approval, execution or outcome monitoring logic here.
- Never modify the Simulation Engine or the legacy consolidated Decision Intelligence HTML from this package.
- Preserve result envelopes, lifecycle rules, auditability and business/tenant isolation.
- Keep the package dependency-free and browser-compatible.
- Add tests whenever lifecycle states, public routes or registry contracts change.
