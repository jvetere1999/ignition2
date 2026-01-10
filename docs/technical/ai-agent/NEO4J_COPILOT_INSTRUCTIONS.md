# COPILOT_INSTRUCTIONS - Neo4j Behavioral Context Bundle

## Absolute Rules (NON-NEGOTIABLE)

### Repository Discipline
- **Root:** `/Users/Shared/passion-os-next` is canonical repo root
- **Branch:** `feat/neo4j-behavior-engine` (create if missing, never main)
- **No deletions:** EVER. Move old code to `deprecated/<original-relative-path>` instead
- **No production code in discovery:** Phase A-B are design only; no runtime changes until Phase C

### Unknown Facts
- Record in `agent/UNKNOWN.md` with ID `UNKNOWN-###` and evidence file paths
- NEVER assume facts. Research via code review first.
- Query examples: file structure, table schemas, existing behavioral patterns, API contracts

### Action Items
- Record in `agent/gaps.md` with ID `ACTION-###`
- Include blocking issue (which UNKNOWN or DEC), priority, time estimate
- Mark RESOLVED only when evidence shows completion

### Decisions
- Record EVERY decision in `agent/DECISIONS.md` (description + rationale + impact)
- Create entry in `agent/DECISIONS_REGISTER.md` (index of DEC-### with status)
- Decision status: OPEN → APPROVED (by PM) → APPLIED (in code)
- Do NOT proceed past gate without APPROVED decision

---

## Terminal Rules

### Output Redirection
```bash
# GOOD: Redirect to log file
command > .tmp/name.log 2>&1

# BAD: Terminal-only output (pipe to cat/less/head/tail)
command | head -20  # ❌ FORBIDDEN
cat output.txt      # ❌ FORBIDDEN
```

### Log Reading
- Use file viewer only: `read_file` tool with `.tmp/<name>.log`
- Never `cat`, `tail`, `less`, `more`, `type` — these are unreliable in automation
- Capture exit codes: `echo $?` immediately after critical commands

---

## Validation Rules (MANDATORY CHECKPOINTS)

### Zero Errors Policy
- ✅ Code changes: must pass typecheck + lint + tests
- ❌ Warnings DO count if new vs baseline
- ❌ Build failures = instant rollback

### Checkpoint Validations

**After Phase A (Extraction):**
```bash
cd /Users/Shared/passion-os-next/app/frontend
npm run typecheck 2>&1 | tee .tmp/phase_a_typecheck.log
npm run lint 2>&1 | tee .tmp/phase_a_lint.log
npm run test:unit 2>&1 | tee .tmp/phase_a_unit.log
```

**After Phase D (Rust Engine):**
```bash
cd /Users/Shared/passion-os-next/app/backend
cargo test 2>&1 | tee .tmp/phase_d_tests.log
cargo clippy 2>&1 | tee .tmp/phase_d_clippy.log
cargo build --release 2>&1 | tee .tmp/phase_d_build.log
```

**After Phase E (Frontend E2E):**
```bash
cd /Users/Shared/passion-os-next/app/frontend
npm run test:e2e 2>&1 | tee .tmp/phase_e_e2e.log
npm run build 2>&1 | tee .tmp/phase_e_build.log
```

Capture baseline before starting:
```bash
npm run typecheck 2>&1 > .tmp/baseline_typecheck.log
wc -l .tmp/baseline_typecheck.log  # Count baseline errors
```

---

## State File Management (REQUIRED)

### Structure
```
agent/
  CURRENT_STATE.md          # Status summary (auto-updated)
  PROGRESS.md               # Phase log (append-only)
  PHASE_GATE.md             # Gate status + blockers
  DECISIONS_REQUIRED.md     # Open decisions waiting PM
  DECISIONS.md              # All approved + rationale
  DECISIONS_REGISTER.md     # DEC-### index
  UNKNOWN.md                # Facts to verify
  gaps.md                   # ACTION-### items
  DRIFT_REPORT.md           # Consistency check (auto)
  validation_<phase>.md     # Checkpoint results (auto)
```

### Update Protocol
1. **At phase start:** Update `CURRENT_STATE.md` with new phase + blockers
2. **During work:** Log discoveries to `PROGRESS.md` (timestamp + summary)
3. **Unknown facts:** Add to `UNKNOWN.md` with file paths + why unclear
4. **New action:** Add to `gaps.md` with priority + blocker
5. **After validation:** Create `validation_<phase>.md` with results
6. **Decision gate:** Review `DECISIONS_REQUIRED.md`, get PM approval, move to `DECISIONS.md`

### Example: Adding a Decision

**DECISIONS_REQUIRED.md:**
```markdown
## DEC-004: Time-of-Day Signal Implementation

**Question:** How granular should time-of-day bucketing be?

**Options:**
- A: Hourly (24 buckets)
- B: 6-hourly (4 buckets: morning/afternoon/evening/night)
- C: 3-hourly (8 buckets)

**Context:** Affects projection complexity + storage

**Blocker:** None (can proceed with option B as default, refine later)
```

After PM approval, move to **DECISIONS.md:**
```markdown
## DEC-004: Time-of-Day Signal (APPROVED)

**Decision:** 6-hourly bucketing (morning/afternoon/evening/night)

**Rationale:** 
- Balances granularity (captures major behavioral shifts) vs complexity
- 4 buckets = minimal storage + projection simplicity
- Can refine to hourly in Phase 2 if A/B tests justify

**Impact:** Projection worker queries group by EXTRACT(HOUR FROM ts)/6

**Applied in:** Phase B schema, Phase C projection implementation
```

Update **DECISIONS_REGISTER.md:**
```markdown
| ID | Decision | Status | Phase | Owner |
|----|----------|--------|-------|-------|
| DEC-004 | Time-of-day bucketing | APPLIED | B | Agent |
```

---

## Postgres Constraints (STRICT)

### SQLx Binding Rule
**ALWAYS runtime binding. NEVER compile-time macros.**

```rust
// ✅ CORRECT
let result = sqlx::query_as::<_, MyStruct>(
    "SELECT * FROM table WHERE id = $1"
)
.bind(id)
.fetch_one(&pool)
.await?;

// ❌ WRONG - FORBIDDEN
let result = sqlx::query_as!(MyStruct, "SELECT * FROM table WHERE id = $1", id)
    .fetch_one(&pool)
    .await?;
```

**Reason:** Compile-time macros need live DATABASE_URL at build time. Runtime binding works in CI/CD without DB connection.

### Idempotency Contract
- Every database operation must be safe to replay
- Projection worker: idempotent UPSERTs via ON CONFLICT
- Migrations: always reversible (`.down.sql`)
- No SERIAL IDs for external identifiers (use UUID + gen_random_uuid())

---

## Behavioral Guardrails (ENFORCED)

### No Dark Patterns
- ❌ Streak guilt, scarcity/loss aversion, shame/blame
- ❌ Arbitrary gamification (no arbitrary XP multipliers)
- ❌ Manipulative notifications or decision forcing
- ✅ Neutral, measurable signals only (frequency/recency/success rate)
- ✅ Explainable "Why this?" microlines (optional, educational)

### Determinism Requirement
- ❌ NO randomness EVER
- ✅ Tie-breaker: deterministic ordering (e.g., count DESC, key ASC)
- ✅ Add `_determinism` test for every behavior decision
- ✅ Expect values in tests, not fuzzy ranges

### Neo4j Failure Gracefully
- Postgres is ALWAYS authoritative (XP, coins, auth, streaks)
- Neo4j is OPTIONAL for Dynamic UI tie-breaking
- If Neo4j unavailable: fall back to Postgres-only baseline (no error shown to user)
- Eventual consistency OK (5–60 min lag acceptable for behavioral context)

---

## Branch + Commit Discipline

### Branch Policy
- Work on: `feat/neo4j-behavior-engine`
- **NEVER commit to main during implementation**
- Only PR to main after all phases complete + reviewed

### Commit Messages
```
<type>(<scope>): <description>

<body>

Fixes: <ref to UNKNOWN-###, ACTION-###, or DEC-###>
```

Example:
```
feat(behavior-engine): extract decision logic from today.rs

Extract existing decision heuristics into Behavior Engine trait.
Defines contract for scoring + tie-breaking. No runtime change.

Fixes: UNKNOWN-001, ACTION-005
```

---

## Code Quality Standards

### Rust
- `cargo fmt` (auto-format)
- `cargo clippy -- -D warnings` (zero warnings)
- Unit tests for all logic (especially determinism)
- Doc comments for public APIs

### TypeScript
- `npm run lint` (ESLint pass)
- `npm run typecheck` (strict TypeScript)
- Unit tests for scoring algorithms
- Accessibility tests for UI changes

### Both
- No dead code
- No commented-out code (use git history)
- Meaningful variable names (not `x`, `y`, `tmp`)
- Max 100-char lines (readability)

---

## Decision Making at Gates

### Gate Decision Workflow
1. **Phase completion:** State "Gate: <phase>" ready for decision
2. **List blockers:** Show DECISIONS_REQUIRED.md entries
3. **Get approval:** PM or team lead reviews + approves
4. **Update state:** Move approved decisions to DECISIONS.md
5. **Proceed:** Next phase can begin

### If Blocked
- List exact UNKNOWN-### or ACTION-### blocking you
- Do NOT proceed without resolution
- Suggest options: research, simplify scope, escalate

---

## Critical: Drift Detection

**Before final cleanup, run:**
```bash
# Compare state files for consistency
agent/CURRENT_STATE.md mentions phases A-E → all PHASE_GATE entries must exist
agent/DECISIONS_REQUIRED.md empty? → all moved to DECISIONS.md?
agent/gaps.md only RESOLVED items? → all ACTION-### closed?
agent/UNKNOWN.md only resolved? → all UNKNOWN-### verified?
```

If any inconsistency: **STOP and fix before proceeding.**

---

## Success = Readiness

Final checklist before handoff:
- ✅ All phase gates passed
- ✅ All decisions recorded in DECISIONS_REGISTER.md
- ✅ No UNKNOWN-### or ACTION-### left open
- ✅ Validation logs pass zero-error policy
- ✅ Code reviewed for determinism + guardrails
- ✅ Docs updated (README, schemas, architecture)
- ✅ Readiness report generated + signed off
