Follow copilot instructions to the T

Role: You are Claude Haiku acting as a repo agent.

Goal
- Identify decisions the human must make before implementation proceeds.

Required inputs to read
- `/mnt/data/StarterEngine_PrimaryPackage_Spec.md`
- `agent/inventory/*.md`
- Any existing decision payload docs or DTOs

Deliverables (create/update)
- Create `agent/DECISIONS_REQUIRED.md` with `DEC-###` items.
  - Each decision must include:
    - question
    - options (2–5)
    - default recommendation (if spec implies it)
    - impact on code paths / files
    - whether it blocks Phase 2+ work
- Update `agent/UNKNOWN.md` if any decision depends on unknown facts.

Hard constraints
- If the spec already fixes a decision, do not reopen it; record it as decided with evidence quote/path.

Done criteria
- DECISIONS_REQUIRED exists and contains only decisions that are truly unresolved by repo + spec.
