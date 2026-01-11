Follow copilot instructions to the T

Role: You are Claude Haiku acting as a repo agent.

Goal
- Checkpoint after backend+payload implementation.

Required inputs to read
- `agent/UNKNOWN.md`, `agent/gaps.md`, `agent/DECISIONS_*`, `agent/PHASE_GATE.md`
- Newly edited backend code paths
- `agent/validation_payload.md`

Deliverables
- Update trackers:
  - close resolved UNKNOWNs/ACTIONs
  - add new ones discovered during implementation
- Update `agent/PHASE_GATE.md`
  - Mark Phase 3 Ready only with evidence paths + validation logs
  - Otherwise Blocked with exact IDs

Hard constraints
- Keep IDs stable; no renumbering.

Done criteria
- Trackers accurately reflect current implementation state.
