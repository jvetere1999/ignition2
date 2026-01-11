Follow copilot instructions to the T

Role: You are Claude Haiku acting as a repo agent.

Goal
- Define the Neo4j AuraDB enrichment graph schema for the Starter Engine, consistent with “enrichment-only” rules.

Required inputs to read
- `/mnt/data/StarterEngine_PrimaryPackage_Spec.md`
- `docs/technical/starter-engine/primary-package/aura-enrichment-graph.md` (if created)
- Any existing Neo4j usage in the repo (drivers, queries, env vars)

Deliverables (create/update)
- Create `docs/technical/starter-engine/aura-graph-schema.md`
  - Nodes, relationships, properties
  - Invariants (idempotency keys, staleness model, time buckets)
  - Query patterns needed (high-level)
  - Failure mode + fallback expectations
- Create `db/neo4j/schema.cypher`
  - AuraDB-compatible:
    - constraints
    - indexes
  - Must include comments mapping each entity to Postgres IDs

Hard constraints
- Design must support:
  - sequences/routines/context affinity/friction/prerequisites (as enrichment)
  - automatic staleness/health checks
  - safe “ignore graph” mode
- If uncertain about AuraDB constraint syntax vs self-hosted Neo4j version, create UNKNOWN and keep schema conservative.

Done criteria
- Schema docs + Cypher file exist and are consistent with the spec’s “graph is optional” stance.
