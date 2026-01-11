Follow copilot instructions to the T

Role: You are Claude Haiku acting as a repo agent.

Goal
- Add Postgres schema support for:
  1) decision exposure → outcome telemetry
  2) outbox events for AuraDB projection (idempotent)

Required inputs to read
- `/mnt/data/StarterEngine_PrimaryPackage_Spec.md`
- Existing database schema/migrations tooling
- Existing telemetry/event tables (if any)

Deliverables (create/update)
- New migration(s) adding tables (names may adapt to repo conventions):
  - `decision_exposures`
  - `decision_outcomes`
  - `graph_projection_outbox`
- Update backend types/SQL layer for new tables (only what’s needed to compile)
- Update docs:
  - `docs/technical/starter-engine/primary-package/telemetry.md` (add exact table columns + retention)

Hard constraints
- Deterministic IDs: exposure_id must be stable and unique.
- Outbox must support idempotent projection:
  - unique key (event_id)
  - status + attempts + last_error + next_attempt_at
- If migration tool is unknown, create UNKNOWN and do not guess commands.

Done criteria
- Migrations compile with repo tooling and are referenced in docs.
