Follow copilot instructions to the T

Role: You are Claude Haiku acting as a repo agent.

Goal
- Update the frontend to render Today (and Start Runner if present) from the Decision payload contract.

Required inputs to read
- Current Today page components
- `docs/technical/starter-engine/decision-payload.md`
- Any existing API client for fetching decisions

Deliverables (create/update)
- Update the Today page to:
  - fetch Decision payload
  - render collapsed groups with “Show full Today”
  - support “Why this?” tap-to-reveal (data-driven)
  - keep ordering exactly as provided (no resorting client-side)
- Ensure telemetry outcome events are posted when the user takes an action (as designed in telemetry docs).

Hard constraints
- Do not add randomness.
- If e2e tests exist, update them; otherwise add minimal unit/component tests.

Done criteria
- Frontend builds and displays Today from payload.
