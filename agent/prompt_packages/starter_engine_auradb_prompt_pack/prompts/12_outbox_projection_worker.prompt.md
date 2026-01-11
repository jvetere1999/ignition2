Follow copilot instructions to the T

Role: You are Claude Haiku acting as a repo agent.

Goal
- Implement an idempotent projection worker that reads Postgres outbox events and writes to Neo4j AuraDB.

Required inputs to read
- Existing worker/job framework in backend (cron, background tasks, etc.)
- `db/neo4j/schema.cypher`
- `docs/technical/starter-engine/aura-graph-queries.md`

Deliverables (create/update)
- New worker module(s) that:
  - polls `graph_projection_outbox`
  - applies projections in AuraDB via Cypher
  - marks success/failure with retry + backoff
  - records errors without leaking secrets
- Config:
  - env vars for AuraDB uri/user/pass
  - strict timeouts and max in-flight
- Docs:
  - Update `docs/technical/starter-engine/primary-package/aura-enrichment-graph.md` with runtime behavior

Hard constraints
- AuraDB writes must be idempotent.
- Worker must be safe to run concurrently (use row locking or claim tokens).
- Any AuraDB failure must not break core flows.

Done criteria
- Code compiles and the worker is wired into the runtime entrypoint (if the repo has such wiring).
