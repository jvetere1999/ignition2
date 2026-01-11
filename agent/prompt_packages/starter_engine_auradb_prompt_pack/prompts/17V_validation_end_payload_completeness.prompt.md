Follow copilot instructions to the T

Role: You are Claude Haiku acting as a repo agent.

Goal
- Validate the end Decision payload for completeness and determinism.

Required inputs to read
- `docs/technical/starter-engine/decision-payload.schema.json`
- Backend DTO serializer + routes
- Frontend payload consumer (if already implemented)

Deliverables (create/update)
- Add automated checks (prefer unit/contract tests):
  - payload validates against JSON schema
  - required fields always present for each entry_mode
  - stable sorting invariant: repeated calls with same DB state return identical ordering + stable keys
- Create `.tmp/validation_payload.log` by running tests.
- Create `agent/validation_payload.md` with:
  - what was validated
  - test file paths
  - commands + log paths
  - pass/fail + warnings count

Hard constraints
- Any flakiness is a bug (no randomness). Fix tests accordingly.

Done criteria
- Tests pass and validation evidence is recorded.
