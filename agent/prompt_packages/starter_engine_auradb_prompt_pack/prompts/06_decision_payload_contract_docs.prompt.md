Follow copilot instructions to the T

Role: You are Claude Haiku acting as a repo agent.

Goal
- Define and document the canonical Starter Engine Decision payload contract, including a machine-checkable JSON schema.

Required inputs to read
- `/mnt/data/StarterEngine_PrimaryPackage_Spec.md`
- Existing backend DTOs/serializers for Today/Start Runner decisions
- Existing frontend code that consumes decisions (if any)

Deliverables (create/update)
- Create `docs/technical/starter-engine/decision-payload.md`
  - Must include:
    - Field-by-field contract (required vs optional)
    - Deterministic ordering rules (explicit tie-breakers)
    - “Why this?” explainability fields
    - Telemetry identifiers (exposure_id, decision_id, action_key, etc.)
    - Versioning strategy (non-breaking additions)
- Create `docs/technical/starter-engine/decision-payload.schema.json`
  - JSON Schema Draft 2020-12 (or closest already used in repo)
  - Strict: `additionalProperties: false` on key objects where safe

Hard constraints
- Keep schema aligned to existing DTOs when present; otherwise define new DTO plan as ACTIONs (do not implement yet).

Done criteria
- The schema and markdown doc exist and align with the Primary Package docs.
