Follow copilot instructions to the T

Role: You are Claude Haiku acting as a repo agent.

Goal
- Implement deterministic Decision payload generation for Today/Start Runner based on Postgres baseline, optionally enriched by AuraDB.

Required inputs to read
- `docs/technical/starter-engine/decision-payload.md`
- `docs/technical/starter-engine/primary-package/today.md`
- `docs/technical/starter-engine/primary-package/start-runner.md`
- Any existing Today decision logic code

Deliverables (create/update)
- Implement/extend a Decision builder that outputs the canonical payload DTO.
- Determinism:
  - explicit sorting steps + stable tie-breakers
  - stable keys (`action_key` or equivalent)
  - no randomness
- Entry modes:
  - `standard | reduced | ramp | onboarding`
- Fallback:
  - if enrichment missing, payload still complete and correct
- Telemetry:
  - create exposure rows when payload is served
  - include exposure_id in payload

Hard constraints
- Must compile and integrate with existing routing.
- Must not require AuraDB.

Done criteria
- Payload DTO matches schema and is served by an endpoint (or ready to be wired).
