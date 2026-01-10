# Neo4j Behavioral Context Graph Integration - Prompt Bundle

> **Duration:** ~40-80 hours engineering  
> **Complexity:** High (graph consistency + deterministic behavior)  
> **Team:** 1-2 engineers + 1 PM for decision gate reviews  

---

## What This Pack Does

Scaffolds the complete implementation of a **Neo4j-backed behavioral context graph** for the Passion OS Daily Today page (Dynamic UI quick picks).

**Scope:**
- Extract/define behavioral logic from existing codebase
- Design Neo4j schema for user activity patterns + sequence learning
- Implement PostgreSQL outbox + projection worker (idempotent)
- Build Rust Behavior Engine integrating Postgres + Neo4j
- Update Today frontend to consume deterministic Decision payloads
- Add Decision telemetry tracking (outcome measurement)

**Outcomes:**
- 95%+ uptime for Dynamic UI (Postgres-only fallback)
- Deterministic, explainable command suggestions
- Measurable engagement via decision telemetry
- Clear handoff to Phase 2 (cloud Neo4j + optimization)

---

## Run Order (MANDATORY)

1. **Discovery Phase** → 2-3 hours
   - Run: `00_repo_discovery_inventory.prompt`
   - Run: `01_unknowns_and_gaps_init.prompt`
   - Deliverable: `agent/UNKNOWN.md`, `agent/gaps.md`

2. **Decision Phase** → 1-2 hours
   - Review: `docs/DATA_AND_BEHAVIORAL_MODELS_REFERENCE.md` (canonical)
   - Run: `02_decisions_required.prompt`
   - **DECISION GATE:** Review decisions, update `agent/DECISIONS_REQUIRED.md`
   - Run: `03_phase_gate_baseline.prompt`
   - Deliverable: `agent/PHASE_GATE.md` (Ready → Blocked)

3. **Phase A: Extraction** → 8-12 hours
   - Run: `10_extract_behavioral_logic.prompt`
   - Run: `11_define_behavior_engine_contract.prompt`
   - Run: `12_decision_payload_schema.prompt`
   - Validate: typecheck, unit tests
   - Run: `20_phase_a_checkpoint.prompt`

4. **Phase B: Design** → 6-10 hours
   - Run: `13_neo4j_schema_design.prompt`
   - Run: `14_projection_strategy.prompt`
   - Run: `15_deterministic_sequence_model.prompt`
   - Validate: schema review, constraint design
   - Run: `20_phase_b_checkpoint.prompt`

5. **Phase C: Postgres Infra** → 4-8 hours
   - Run: `16_activity_outbox_migration.prompt`
   - Run: `17_projection_worker_skeleton.prompt`
   - Run: `18_idempotency_contract.prompt`
   - Validate: migration, cargo build, cargo test
   - Run: `20_phase_c_checkpoint.prompt`

6. **Phase D: Rust Behavior Engine** → 12-20 hours
   - Run: `30_behavior_engine_core.prompt`
   - Run: `31_neo4j_integration_optional.prompt`
   - Run: `32_fallback_logic.prompt`
   - Run: `33_determinism_tests.prompt`
   - Validate: cargo test, determinism proofs
   - Run: `20_phase_d_checkpoint.prompt`

7. **Phase E: Frontend + Telemetry** → 8-12 hours
   - Run: `40_today_decision_consumer.prompt`
   - Run: `41_quick_picks_rendering.prompt`
   - Run: `42_decision_telemetry.prompt`
   - Run: `43_accessibility_audit.prompt`
   - Validate: typecheck, unit tests, a11y tests
   - Run: `20_phase_e_checkpoint.prompt`

8. **Drift & Cleanup** → 2-4 hours
   - Run: `50_drift_detection.prompt` (auto-compare state files)
   - Run: `51_code_cleanup.prompt`
   - Run: `52_docs_rebuild.prompt`
   - Run: `53_readiness_report.prompt`

---

## Decision Gates (CRITICAL - DO NOT SKIP)

### DEC-001: Behavioral Models Scope
**Question:** Which behavioral models do we optimize first?  
**Options:**
- A: Soft Landing only (MVP)
- B: Soft Landing + Momentum Feedback (recommended)
- C: All 6 models (ambitious, 2x scope)

**Default:** B (Soft Landing + Momentum Feedback)  
**Blocks:** Phase A onwards

### DEC-002: Neo4j Availability Requirement
**Question:** What happens if Neo4j is unavailable?  
**Options:**
- A: Fall back to Postgres-only baseline (safe)
- B: Show error message (user impact)
- C: Skip Dynamic UI entirely (worst UX)

**Default:** A (Postgres-only fallback)  
**Blocks:** Phase D

### DEC-003: Decision Telemetry Schema
**Question:** What telemetry signals do we measure?  
**Options:**
- A: Minimal (started_action, completed, bounced)
- B: Standard (+ section_expanded, dismissed)
- C: Comprehensive (+ hover, scroll, context_switch)

**Default:** B (Standard)  
**Blocks:** Phase E

---

## State Tracking (agent/ - MANDATORY)

All state files are auto-generated and updated by prompts. **DO NOT EDIT MANUALLY.**

- `agent/CURRENT_STATE.md` — What's done, in progress, blocked
- `agent/PROGRESS.md` — Detailed phase-by-phase log
- `agent/PHASE_GATE.md` — Gate status + blocking issues
- `agent/DECISIONS_REQUIRED.md` — Open decisions awaiting PM
- `agent/DECISIONS.md` — Approved decisions + rationale
- `agent/DECISIONS_REGISTER.md` — Index of all DEC-###
- `agent/UNKNOWN.md` — Facts to verify + references
- `agent/gaps.md` — Action items (ACTION-###)
- `agent/DRIFT_REPORT.md` — Auto-generated consistency check

---

## Critical: Do NOT Skip

- ✅ **Gap checkpoints** after each phase (validation prompts)
- ✅ **Drift detection** before final cleanup
- ✅ **Decision gates** at phase transitions
- ✅ **Validation runs** (typecheck, cargo build, cargo test)
- ✅ **Code review** of Phase D determinism tests

---

## Project Context (Updated)

**Repo:** `passion-os-next/` (main branch)

**Stack:**
- Frontend: Next.js 15 + React 19 + TypeScript
- Backend: Rust Axum + PostgreSQL + optional Neo4j
- Admin: Next.js 15
- Deployment: Cloudflare Workers (frontend), Fly.io (backend)

**Existing Patterns:**
- Repository pattern (models + repos) for DB operations
- SQLx runtime binding (never compile-time macros)
- Middleware-based auth + Extension<User> injection
- API response wrappers for consistency

**Behavioral Reference:** `docs/DATA_AND_BEHAVIORAL_MODELS_REFERENCE.md`  
**Copilot Rules:** `.github/copilot-instructions.md`

---

## Success Criteria

✅ Phase A: Behavioral logic extracted into Behavior Engine trait  
✅ Phase B: Neo4j schema designed + constraints documented  
✅ Phase C: Activity outbox + projection worker deployed  
✅ Phase D: Rust engine passes all determinism tests  
✅ Phase E: Frontend Today consumes Decision payloads + telemetry  
✅ Integration: End-to-end test (user action → telemetry → optimization signal)

---

## Notes for Agent

- **Haiku constraint:** Prompts are ~200-600 tokens each. Single-responsibility.
- **State files:** Assume they exist and update them. Never create duplicates.
- **Branch:** Always work on `feat/neo4j-behavior-engine` (create if missing).
- **Validation:** Redirect terminal output to `.tmp/<name>.log 2>&1`. Read via file viewer only.
- **No deletions:** Move deprecated code to `deprecated/` instead.
