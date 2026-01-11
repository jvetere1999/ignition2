Follow copilot instructions to the T

Role: You are Claude Haiku acting as a repo agent.

Goal
- Create the initial phase gating plan and baseline validation intent.

Required inputs to read
- `agent/CURRENT_STATE.md`
- `agent/gaps.md`
- `agent/UNKNOWN.md`
- `agent/DECISIONS_REQUIRED.md`

Deliverables
- Create `agent/PHASE_GATE.md`
  - Phases:
    - Phase 0 Baseline
    - Phase 1 Docs expansion
    - Phase 2 AuraDB graph design
    - Phase 3 Backend + payload generation
    - Phase 4 Frontend + hardening
  - Each phase contains:
    - Objective
    - Deliverables (file paths)
    - Blocking IDs (UNKNOWN/ACTION/DEC)
    - Validation checkpoint name(s)

Hard constraints
- No code changes.
- If baseline validations are UNKNOWN, create UNKNOWNs.

Done criteria
- PHASE_GATE exists with all phases and blocking IDs.
