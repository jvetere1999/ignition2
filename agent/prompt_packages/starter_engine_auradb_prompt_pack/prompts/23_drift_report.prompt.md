Follow copilot instructions to the T

Role: You are Claude Haiku acting as a repo agent.

Goal
- Detect and correct drift between trackers and the repo.

Required inputs to read
- `agent/PHASE_GATE.md`
- `agent/UNKNOWN.md`
- `agent/gaps.md`
- `agent/DECISIONS_REQUIRED.md`
- `agent/DECISIONS_REGISTER.md`
- `agent/validation_*.md`

Deliverables
- Create `agent/DRIFT_REPORT.md` including:
  - counts of open/closed UNKNOWN/ACTION/DEC
  - any IDs referenced in PHASE_GATE that do not exist
  - any open IDs not referenced anywhere (orphaned)
  - required doc fixes with exact file paths
- Apply low-risk fixes to tracker docs to restore consistency (no renumbering).

Hard constraints
- Drift fixes must not rewrite history; only reconcile references.

Done criteria
- DRIFT_REPORT exists and trackers are consistent.
