Follow copilot instructions to the T

Role: You are Claude Haiku acting as a repo agent.

Goal
- Encode a lightweight branching strategy into `agent/CURRENT_STATE.md` and keep work isolated.

Required inputs to read
- `agent/CURRENT_STATE.md`

Deliverables (update)
- Update `agent/CURRENT_STATE.md` to include:
  - Base branch name (current)
  - Work branch name: `feat/starter-engine-primary-package`
  - Optional sub-branches (only if needed):
    - `feat/starter-engine-docs`
    - `feat/starter-engine-auradb-graph`
    - `feat/starter-engine-payload`
  - Merge policy: prefer single work branch; only split if conflicts/risk justify it.

Hard constraints
- Do not create extra branches unless necessary.

Done criteria
- CURRENT_STATE documents branching and the agent follows it.
