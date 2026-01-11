# Starter Engine + Neo4j AuraDB Graph — Repo Agent Prompt Pack (Haiku)

This bundle contains a **small, hyper-specific prompt sequence** for a repo agent to implement the **Starter Engine Primary Package** and the **Neo4j AuraDB enrichment graph**, with deterministic **Decision payload** output and an explicit completeness validation.

## What this pack does

1. Inventory the repo and current state (no production code changes).
2. Seed state tracking (`agent/`): UNKNOWN, gaps, decisions, phase gates.
3. Expand documentation:
   - `docs/technical/starter-engine/futurescope/` gets **all remaining “new / later” features** extracted from the spec.
   - `docs/technical/starter-engine/primary-package/` gets **full per-surface files** (Today, Start Runner, Capture, Ramp, Rules, Context Pack/Setup, Telemetry).
   - Decision payload contract docs + JSON schema.
4. Define the **Neo4j AuraDB** schema (labels/rels/constraints) + minimal query contracts.
5. Implement backend pieces:
   - Postgres tables/migrations for decision telemetry + outbox for graph projection.
   - Projection worker to AuraDB (idempotent).
   - Behavior Engine adapter that treats AuraDB as **optional enrichment** with strict timeouts and fallback.
   - Deterministic Decision payload builder.
6. Wire frontend to consume the Decision payload.
7. Validate:
   - Payload schema compliance
   - Sorting/determinism invariants
   - No warnings increase vs baseline

## Run order (do not skip checkpoints)

Run prompts in this order:

### Phase 0 — Baseline state
- `00_repo_discovery_inventory.prompt.md`
- `01_unknowns_and_gaps_init.prompt.md`
- `02_decisions_required.prompt.md`
- `02-1_build_decisions_register.prompt.md`
- `02-2_apply_decisions_to_phase_gate.prompt.md`
- `03_phase_gate_baseline.prompt.md`

### Phase 1 — Docs expansion (includes futurescope)
- `04_futurescope_extract_from_spec.prompt.md`
- `05_primary_package_docs_skeleton.prompt.md`
- `06_decision_payload_contract_docs.prompt.md`
- `07G_gap_checkpoint_after_docs.prompt.md`

### Phase 2 — AuraDB graph design
- `08_graph_schema_design.prompt.md`
- `09_graph_query_contracts.prompt.md`
- `10V_validation_docs_graph.prompt.md`

### Phase 3 — Backend + payload generation
- `11_postgres_schema_for_telemetry.prompt.md`
- `12_outbox_projection_worker.prompt.md`
- `13_behavior_engine_graph_adapter.prompt.md`
- `14_today_decision_payload_builder.prompt.md`
- `15_api_contracts_and_routes.prompt.md`
- `17V_validation_end_payload_completeness.prompt.md`
- `18G_gap_checkpoint_after_backend.prompt.md`

### Phase 4 — Frontend integration + hardening
- `16_frontend_consume_payload.prompt.md`
- `20_security_and_secrets_aura.prompt.md`
- `21_observability_and_timeouts.prompt.md`
- `22V_validation_final.prompt.md`
- `23_drift_report.prompt.md`
- `24_final_readiness_report.prompt.md`

## When decisions are required

The agent must **stop** when `agent/DECISIONS_REQUIRED.md` contains blocking items and cannot be resolved from the repo. Decisions must be recorded into:
- `agent/DECISIONS.md`
- `agent/DECISIONS_REGISTER.md`

Then `02-2_apply_decisions_to_phase_gate.prompt.md` updates `agent/PHASE_GATE.md`.

## Where state lives

All state tracking files are under `agent/` and must remain the single source of truth.

## Inputs this pack expects

- The spec file is available at: `/mnt/data/StarterEngine_PrimaryPackage_Spec.md`
- The repo root is whatever folder the agent is executed in.

