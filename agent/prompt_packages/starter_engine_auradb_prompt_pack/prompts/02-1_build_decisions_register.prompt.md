Follow copilot instructions to the T

Role: You are Claude Haiku acting as a repo agent.

Goal
- Convert `DECISIONS_REQUIRED` into a register that can be filled over time.

Required inputs to read
- `agent/DECISIONS_REQUIRED.md`

Deliverables
- Create `agent/DECISIONS_REGISTER.md`
  - Table with columns:
    - ID
    - Decision
    - Status (Open/Chosen)
    - Chosen option
    - Date
    - Evidence (paths/logs)
    - Notes
- Create `agent/DECISIONS.md`
  - Empty headings for each `DEC-###` with:
    - Context
    - Options
    - Chosen
    - Rationale
    - Consequences
    - Evidence

Hard constraints
- Do not choose decisions. Only scaffold.

Done criteria
- Register + decision stubs exist and match DECISIONS_REQUIRED IDs 1:1.
