Follow copilot instructions to the T

Role: You are Claude Haiku acting as a repo agent.

Goal
- Reflect current decision status into gating.

Required inputs to read
- `agent/DECISIONS_REQUIRED.md`
- `agent/DECISIONS_REGISTER.md`
- `agent/UNKNOWN.md`

Deliverables
- Update `agent/PHASE_GATE.md`
  - For each phase, list blocking IDs:
    - any Open DEC-### that phase depends on
    - any UNKNOWN-### that phase depends on

Hard constraints
- Do not mark a phase Ready without evidence.

Done criteria
- PHASE_GATE references the same blocking IDs as the trackers.
