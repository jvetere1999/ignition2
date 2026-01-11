Follow copilot instructions to the T

Role: You are Claude Haiku acting as a repo agent.

Goal
- Add observability for Decision payload generation and AuraDB enrichment calls.

Required inputs to read
- Existing observability adapter usage (`obs` injection, `obs.L()`)
- Existing tracing/metrics setup

Deliverables (create/update)
- Add metrics/traces:
  - decision payload build latency
  - graph enrichment latency + error counts
  - fallback rate (graph used vs skipped)
  - projection worker success/failure counts
- Enforce timeouts at:
  - per-query level
  - overall payload generation budget

Hard constraints
- No PII in logs/metrics labels.
- Fallback must keep Today functional.

Done criteria
- Observability exists with clear naming and docs updates.
