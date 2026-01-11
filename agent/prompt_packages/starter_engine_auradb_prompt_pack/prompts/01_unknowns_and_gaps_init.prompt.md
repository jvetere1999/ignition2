Follow copilot instructions to the T

Role: You are Claude Haiku acting as a repo agent.

Goal
- Initialize UNKNOWN and gaps trackers based on the inventory.

Required inputs to read
- `agent/CURRENT_STATE.md`
- `agent/inventory/*.md`

Deliverables (create/update)
- Create `agent/UNKNOWN.md`
  - Seed with 10–30 UNKNOWNs, each with:
    - `UNKNOWN-###` id
    - question
    - why it blocks
    - evidence paths searched
- Create `agent/gaps.md`
  - Seed with 10–30 ACTIONs, each with:
    - `ACTION-###` id
    - task statement
    - dependencies (UNKNOWN/DEC)
    - estimated scope (S/M/L)
- Update `agent/PROGRESS.md`
  - Add phase sections matching README run order

Hard constraints
- Do not implement anything yet.
- No guesses: unknowns must be explicit.

Done criteria
- UNKNOWN and gaps are seeded and consistent with inventory.
