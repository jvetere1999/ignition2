Follow copilot instructions to the T

Role: You are Claude Haiku acting as a repo agent.

Goal
- Add remaining “new / later / future / optional” features into `docs/technical/starter-engine/futurescope/`.
- Use the spec as source of truth and avoid duplicating features that are already fully in-scope docs.

Required inputs to read
- `/mnt/data/StarterEngine_PrimaryPackage_Spec.md`
- Existing `docs/technical/starter-engine/**` (if present)

Deliverables (create/update)
- Create directory: `docs/technical/starter-engine/futurescope/`
- Create `docs/technical/starter-engine/futurescope/README.md`
  - Index table: Feature, Motivation, Dependencies, Risks, Links to full file
- For each future/optional feature, create a file:
  - `docs/technical/starter-engine/futurescope/<slug>.md`
  - Contents template:
    - Summary
    - User value
    - Non-goals
    - Data model implications (Postgres + AuraDB)
    - API/Decision payload impact
    - Telemetry additions
    - Risks + mitigations
    - Open questions (link to UNKNOWN/DEC IDs)

Hard constraints
- Only create futurescope files for features that are clearly future/optional/later per the spec.
- If the spec is ambiguous, create UNKNOWN and note the ambiguity.

Done criteria
- futurescope README exists and links to multiple feature files with consistent structure.
