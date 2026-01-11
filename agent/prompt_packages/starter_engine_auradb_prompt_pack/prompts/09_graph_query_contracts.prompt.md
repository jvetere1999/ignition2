Follow copilot instructions to the T

Role: You are Claude Haiku acting as a repo agent.

Goal
- Define the minimal graph query contract used by the Behavior Engine, without implementing code yet.

Required inputs to read
- `docs/technical/starter-engine/aura-graph-schema.md`
- Existing backend behavior engine code (if any)

Deliverables (create/update)
- Create `docs/technical/starter-engine/aura-graph-queries.md`
  - For each query:
    - name
    - inputs (user_id, time bucket, last_action_key, etc.)
    - outputs (typed shape)
    - max latency budget (ms)
    - cacheability (yes/no)
    - fallback behavior
    - cypher sketch (not necessarily final)
- Add ACTION items for any missing identifiers needed in Postgres events for projection.

Hard constraints
- Queries must be designed so they can be skipped entirely if AuraDB is down.
- No production code changes.

Done criteria
- Query contracts exist and can be implemented by a small adapter layer.
