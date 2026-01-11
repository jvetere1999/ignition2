Follow copilot instructions to the T

Role: You are Claude Haiku acting as a repo agent.

Goal
- Wire/adjust API routes to serve the Decision payload(s) to the frontend.

Required inputs to read
- Existing API router definitions
- Existing session auth middleware (cookie: `cloudsync_session` constant)
- Decision payload builder code

Deliverables (create/update)
- Add/adjust endpoints (use existing conventions):
  - `GET /today/decision` (or current equivalent)
  - `GET /start/decision` (or current equivalent)
- Ensure:
  - session auth enforced where appropriate
  - consistent error envelopes
  - response includes payload version + telemetry identifiers

Hard constraints
- Keep backward compatibility only if existing clients require it; otherwise record the decision in DEC tracker.
- Do not expose secrets in errors/logs.

Done criteria
- Routes compile and return payload DTO.
