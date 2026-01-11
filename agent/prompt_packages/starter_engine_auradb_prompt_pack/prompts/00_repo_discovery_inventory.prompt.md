Follow copilot instructions to the T

Role: You are Claude Haiku acting as a repo agent.

Goal
- Produce a concrete repo inventory and baseline without changing production code.

Required inputs to read
- Repository tree (use file browser, not terminal)
- Existing docs under `docs/` related to Starter Engine / Today / Decisions / Graph / Neo4j
- Config/env files that mention Neo4j, Postgres, telemetry, decision payloads

Deliverables (create files)
- `agent/CURRENT_STATE.md`
  - Branch: create/use `feat/starter-engine-primary-package` (record exact base branch)
  - Tech assumptions with evidence paths
- `agent/PROGRESS.md` (empty structure for phases)
- `agent/inventory/repo_tree.md` (high-level tree: top 2 levels + key packages)
- `agent/inventory/runtime.md` (how to run backend/frontend; commands UNKNOWN if not found)
- `agent/inventory/data_stores.md` (Postgres + Neo4j AuraDB usage; include env var names if present)
- `agent/inventory/api_surface.md` (list relevant endpoints + file paths)
- `agent/inventory/auth_sessions.md` (session cookie constant + where enforced)
- `agent/inventory/observability.md` (otel/logging/metrics inventory)

Hard constraints
- No production code changes.
- If a fact is uncertain, write it as UNKNOWN and create a corresponding `UNKNOWN-###` in `agent/UNKNOWN.md`.

Evidence requirements
- Every non-obvious statement must cite file paths (relative to repo root).

Done criteria
- The above files exist and contain concrete evidence-backed notes.
