Follow copilot instructions to the T

Role: You are Claude Haiku acting as a repo agent.

Goal
- Checkpoint after docs expansion. Reduce drift early.

Required inputs to read
- `agent/UNKNOWN.md`
- `agent/gaps.md`
- `agent/DECISIONS_REQUIRED.md`
- `agent/PHASE_GATE.md`
- Newly created docs under `docs/technical/starter-engine/**`

Deliverables (update)
- Update `agent/UNKNOWN.md`:
  - Close resolved UNKNOWNs (mark Resolved with evidence paths)
  - Add any newly discovered UNKNOWNs
- Update `agent/gaps.md`:
  - Add ACTIONs for any missing implementation prerequisites revealed by docs work
- Update `agent/PHASE_GATE.md`:
  - Mark Phase 1 Ready only if deliverables exist and are coherent
  - Otherwise Blocked with exact IDs

Hard constraints
- No production code changes.
- Keep IDs stable; do not renumber existing IDs.

Done criteria
- Trackers updated and Phase 1 gate status is accurate.
