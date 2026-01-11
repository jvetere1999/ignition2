Follow copilot instructions to the T

Role: You are Claude Haiku acting as a repo agent.

Goal
- “Blow up” the Primary Package into full per-surface documentation files under `docs/technical/starter-engine/primary-package/`.

Required inputs to read
- `/mnt/data/StarterEngine_PrimaryPackage_Spec.md`
- Any existing Starter Engine docs
- Any existing API/DTO definitions for Today decisions

Deliverables (create/update)
- Create directory: `docs/technical/starter-engine/primary-package/`
- Create files (one per surface):
  - `today.md`
  - `start-runner.md`
  - `capture-inbox.md`
  - `return-ramp.md`
  - `rules.md`
  - `context-pack-setup.md`
  - `telemetry.md`
  - `aura-enrichment-graph.md`
- Each file must include (same headings):
  1) Purpose
  2) UX contract (what the UI must/ must not do)
  3) Decision payload fields used
  4) Backing data (Postgres baseline) + fallback behavior
  5) AuraDB enrichment (if applicable) with “fail open” contract
  6) Determinism rules (ordering/tie-breakers)
  7) Telemetry events (exposure → outcome)
  8) Edge cases (offline, missing data, stale graph)
  9) Open questions (link IDs)

Hard constraints
- Do not edit production code.
- If any required info is missing, add UNKNOWN/ACTION/DEC references.

Done criteria
- All files exist and cross-link to the spec and to each other.
