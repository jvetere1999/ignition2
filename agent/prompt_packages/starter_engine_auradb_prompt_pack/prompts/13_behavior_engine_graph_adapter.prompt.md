Follow copilot instructions to the T

Role: You are Claude Haiku acting as a repo agent.

Goal
- Implement a small AuraDB adapter used by the Behavior Engine, with fail-open enrichment.

Required inputs to read
- `docs/technical/starter-engine/aura-graph-queries.md`
- Existing behavior engine or decision builder code
- Existing observability adapter conventions (logger via `obs.L()`)

Deliverables (create/update)
- Add a `GraphEnrichment` interface/trait (or equivalent) with methods matching query contracts.
- Implement `AuraGraphEnrichment`:
  - secure URI schemes (`neo4j+s` or `bolt+s`)
  - strict timeouts per query
  - returns `None`/empty enrichment on any error
  - increments metrics counters and logs concise failure reasons (no secrets)
- Ensure this adapter is injected (not global), consistent with repo patterns.

Hard constraints
- If AuraDB is disabled/unconfigured, adapter must be a no-op.
- Do not add new dependencies unless necessary; if needed, create DEC or ACTION with rationale.

Done criteria
- Backend builds with adapter included and graph calls are optional.
