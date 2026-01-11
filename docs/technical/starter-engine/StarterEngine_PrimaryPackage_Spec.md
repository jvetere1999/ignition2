# Starter Engine — Primary Package Spec (Designed Future State)

Date: 2026-01-10  
Status: Draft (intended as a living spec to be incrementally edited)

## 0) Purpose

Deliver an ADHD-first “starter engine” that reliably helps a user begin, continue, and re-enter work without coercion. The system is:

- **Deterministic**: no randomness; stable ordering everywhere.
- **Autonomy-respecting**: reduced choice via collapse, never lock-in; “Show full Today” is always available.
- **Measured**: decision exposure → outcome telemetry drives tuning (opportunity/ability), not guesswork.
- **Correctness-safe**: Postgres baseline always works; Neo4j is enrichment-only and can be ignored automatically.

---

## 1) Non-negotiable invariants

### 1.1 Determinism
- No randomness (ever).
- All ordered lists must use a global tie-break rule:
  1) Eligibility filter (guardrails)
  2) Category priority (baseline skeleton)
  3) Score desc (if present)
  4) Baseline rank asc
  5) Stable key asc (`action_key` or stable id)

### 1.2 Autonomy
- Reduced Mode and Soft Landing **collapse** sections, do not hide them.
- Always provide:
  - **Show full Today**
  - **Skip** / **Stop** on any guided flow
- Personalization remains scoped and explainable; no dark patterns.

### 1.3 Correctness vs enrichment
- Neo4j **never required** for correctness.
- If Neo4j is down/stale/slow, system behavior MUST match the Postgres baseline output.

### 1.4 Privacy and data minimization
- Neo4j stores **user_id** and stable **action keys** only (no PII, no journals, no tokens).
- Telemetry avoids sensitive content (IDs, enums, timestamps; never raw capture text).

---

## 2) Core loop

### 2.1 Primary loop
**Today → Start → Complete/Stop → Soft Landing → Next Start**

- Today renders a single dominant “Starter Block” action.
- Starting routes into a minimal “Start Runner” experience to reduce friction.
- Completion returns to Today and may trigger Soft Landing (session-scoped) to reduce decision load.
- The user can always expand or exit to full Today at any time.

### 2.2 Side paths (ancillary) that never hijack the loop
- **Capture Inbox**: record thoughts quickly; convert later by choice.
- **Return Ramp**: minimal re-entry surface when returning after a gap.
- **Rules**: user-authored If–Then preferences.
- **Context Setup**: attach prerequisites/resources to actions.
- **Review / Triage**: optional, short, user-initiated cleanup loop.

---

## 3) Information architecture: pages and why they exist

### 3.1 Today (`/today`)
**Why**: the “home surface” for decisioning and re-entry.  
**Responsibilities**:
- Render server-produced Decision payload.
- Offer Starter Block + Quick Picks + collapsed sections.
- Provide autonomy controls (Show full Today, Expand sections).

### 3.2 Start Runner (`/start`)
**Why**: starting is where friction spikes; a dedicated surface reduces context switching and UI noise.  
**Responsibilities**:
- Micro-start timer (2 minutes default).
- Optional time chips (5/10/25) at the moment of starting.
- Optional context pack (resources/prereqs).
- Optional coping prompt *after* start click (not before).
- Outcomes emitted for telemetry.
- A deterministic “Next suggestion” at end (Continue / Stop & Save / Switch micro-start).

### 3.3 Capture Inbox (`/capture`)
**Why**: externalize working memory and prevent loss.  
**Responsibilities**:
- Quick capture (from Today or Start Runner).
- Triage view (convert to plan/habit/quest) only when user opts in.
- Never forced from core loop.

### 3.4 Return Ramp (`/today/ramp` or embedded Ramp panel)
**Why**: re-entry after gaps is a distinct state with high overwhelm risk.  
**Responsibilities**:
- Present only 3 choices: Micro-Start, Capture, Resume Last.
- Always show “Full Today”.

### 3.5 Rules (`/rules`)
**Why**: turn “system if–then” into user-authored intent (higher mechanism fidelity, more autonomy).  
**Responsibilities**:
- Create/edit/disable If–Then rules.
- Rules only influence ordering/suggestions; they never hide features.

### 3.6 Context Setup (`/actions/:action_key/setup`)
**Why**: missing prerequisites cause abandonment; allow user to pre-wire setup.  
**Responsibilities**:
- Manage “context pack” resources (links/files/notes pointers).
- Stored in Postgres; Neo4j may reference stable resource IDs only.

### 3.7 Review (`/review`)
**Why**: optional stabilization loop (keep system trustworthy) without turning the product into a planner-first app.  
**Responsibilities**:
- Convert captures
- Close stale items
- Light planning (optional, user-initiated)

---

## 4) Dataflow overview (high-level)

1) **Request**: user hits `/today`
2) **Server**:
   - Compute user state (gap, focus, plan, etc.)
   - Generate Decision payload (Starter Block, Quick Picks, visibility hints)
   - Emit `decision_exposed` (async, non-blocking)
3) **Client**:
   - Render payload
   - Emit outcome events on interaction (start/complete/expand/dismiss/bounce)
4) **Storage**:
   - Postgres is system of record
   - Neo4j receives projections for enrichment only
5) **Next**: user starts action → `/start` → completion → `/today` (Soft Landing hint)

---

## 5) Decision payload contract (additive; do not remove existing fields)

### 5.1 Identifiers
- `exposure_id`: UUID, new per server render of a Decision payload.
- `decision_version`: semantic version of payload logic.

### 5.2 Core fields
- `entry_mode`: `standard | reduced | ramp`
- `starter_block`:
  - `primary_cta`: `{ action_key, route, label, kind }`
  - `secondary_cta`: `{ action_key, route, label, kind }` (often Capture)
  - `why?`: optional enum + params (neutral)
- `quick_picks[]`: ordered list:
  - `action_key`, `route`, `category`
  - `why?` optional microline data
- `visibility`:
  - section states: `visible | collapsed | force_collapsed` (avoid `hidden`)
- `autonomy_controls`:
  - `show_full_today: true`
  - `personalization_scope: today_quick_picks_only`
- `soft_landing_hint`:
  - derived from session/url parameters (not authoritative; UI may interpret)

---

## 6) Telemetry: exposure → outcome (primary package, always on)

### 6.1 Events (minimal, non-sensitive)
Server:
- `decision_exposed(exposure_id, user_id, entry_mode, ordered_action_keys[], reduced_mode, soft_landing_hint, timestamp)`

Client:
- `next_action_started(exposure_id, action_key, timestamp)`
- `completed_action(exposure_id, action_key, timestamp)`
- `expanded_section(exposure_id, section_id, timestamp)`
- `dismissed_banner(exposure_id, banner_id, timestamp)`
- `bounced(exposure_id, timestamp)` — defined as no action within 2 minutes

### 6.2 Attribution windows
- Primary success: `next_action_started` within 5 minutes of exposure.
- Secondary success: `completed_action` within 60 minutes of exposure.
- Bounce: no action within 2 minutes.

---

## 7) Baseline selection: Postgres skeleton (must remain correct)

### 7.1 Candidate generation (baseline)
- Build candidate sets from Postgres sources exactly as today:
  - Habits candidates
  - Quests candidates
  - Inbox/capture candidates
  - Resume last candidate
- Apply eligibility and visibility guardrails (reduced mode, soft landing, focus states).
- Produce baseline ordering and baseline rank for each candidate.

### 7.2 Enrichment bounds
Neo4j enrichment may:
- re-order **within** a category
- or bump among the top N candidates (bounded)
But it must NOT:
- add candidates the baseline disallowed
- violate visibility/entry_mode constraints

---

## 8) Neo4j enrichment (deep package)

All Neo4j queries must be:
- bounded in time (timeout)
- optional (score=0 on failure)
- staleness-checked (ignore if stale)

### 8.1 Transition enrichment (NEXT edges)
**Use**: “what usually comes next after last action?”  
**Effect**: tie-breaker within category and/or bounded bump.

- Inputs: last action_key (and optionally last 2–3)
- Output: transition_score per candidate
- Determinism: score desc → baseline_rank asc → action_key asc

### 8.2 Routine chains (k-step sequences)
**Use**: “continue a known sequence”  
**Effect**: prefer the next step if a routine is in-progress.

Two modes:
- Inferred routine: strong multi-hop NEXT path
- Explicit routine: user-defined sequences (optional UI later)

### 8.3 Context affinity (time buckets)
**Use**: “this action often happens in the morning”  
**Effect**: small additive score only; never overrides reduced mode.

Time buckets: coarse only (e.g., morning/afternoon/evening).

### 8.4 Friction enrichment (bounce + barriers)
**Use**: “reduce ability where the user frequently bounces”  
**Effect**:
- prefer micro-start variants for high-bounce actions
- decide whether to offer coping prompt after start click

Barrier nodes: `time | focus | materials | motivation` (enums only).

### 8.5 Prerequisite/resource enrichment (context pack)
**Use**: “make starting cheaper by surfacing needed setup”  
**Effect**:
- show context pack if resources exist
- prompt “Add link” only when user chooses (autonomy)

Neo4j stores resource IDs only; actual URLs/metadata remain in Postgres.

---

## 9) ADHD-first scaffolds (always available, never coercive)

### 9.1 Micro-Start (2 minutes)
- Starter Block default CTA.
- Deterministic micro-step selection:
  1) first incomplete plan item
  2) top pending habit
  3) capture

### 9.2 Capture (10 seconds)
- Always available (Starter Block secondary CTA or Quick Pick).
- No forced triage.

### 9.3 Coping prompt (after start)
- Optional one-tap barrier handling (time/focus/materials/motivation).
- Never shown before the user chooses to start.

### 9.4 Time budget chips (at start)
- 5 / 10 / 25 (and possibly 2 as default)
- Suggested next transition after completion (Break 3 / Continue 10)

### 9.5 Context pack
- Links/files/notes pointers that reduce setup cost.

---

## 10) Onboarding and re-onboarding (Primary Package)

Onboarding is not a separate wizard. It is a **deterministic entry policy** implemented through the same server Decision engine that powers Today. It exists to reduce overload while users learn the core loop.

### 10.1 Onboarding principles (must hold)
- **One action at a time**: initiation before organization.
- **Teach by doing**: the “lesson” is the action itself, not a tutorial.
- **Always skippable**: Show full Today + dismissible guidance.
- **No coercion**: no streak pressure, guilt, urgency, scarcity, or loss framing.
- **Deterministic gating**: based on stable Postgres state + telemetry outcomes; no randomness.

### 10.2 Onboarding state model (server-derived)

**State (conceptual, stored in Postgres)**
- `user_first_seen_at`
- `onboarding_step` (enum)
- `onboarding_completed_at` (nullable)
- `onboarding_cooldown_until` (suppress repeated prompts)
- `onboarding_preferences` (e.g., tips enabled/disabled)

**Decision payload**
- `entry_mode: standard | reduced | ramp | onboarding`
- `onboarding_step?: intro_start | intro_capture | intro_return | intro_rules | intro_review | completed`

### 10.3 Onboarding phases (ordered; minimal; autonomy-first)

#### Phase 0 — First session: Start small
**Trigger**
- New user OR onboarding not completed.

**Today behavior**
- Starter Block:
  - Primary: **Start 2 minutes** (Micro-Start)
  - Secondary: **Capture (10s)**
- Quick Picks: bounded (max 2 items).
- Guidance (once): “Start small. You can stop anytime.”
- Always show “Show full Today”.

**Exit criteria**
- Advance when the user produces `next_action_started` within 5 minutes at least once.

#### Phase 1 — Stabilize: Capture prevents loss
**Trigger**
- User has started at least once, but has not saved a capture.

**Behavior**
- Keep core CTAs unchanged.
- Guidance (once): “Capture is for anything you don’t want to hold in your head.”
- Link to `/capture` (triage) is present but never forced.

**Exit criteria**
- `capture_saved` occurs OR user dismisses guidance (cooldown applied).

#### Phase 2 — Re-entry: Return Ramp is normal
**Trigger**
- First `returningAfterGap` state after onboarding begins.

**Behavior**
- Entry surface becomes Ramp (panel or `/today/ramp`):
  1) Start 2 minutes
  2) Capture
  3) Resume last (if exists)
- Guidance (once): “Restart small. Full Today is always here.”

**Exit criteria**
- Any `next_action_started` on Ramp OR user chooses Full Today.

#### Phase 3 — Patterns: Make it yours (Rules/Routines)
**Trigger**
- A repeated pattern emerges (user repeatedly does X then Y) OR a high-confidence routine is inferred (D2 hybrid),
  and the user is not currently in a high-bounce state.

**Behavior**
- Suggestion (optional, cooldown): “Want this to be your default next step? Create a rule.”
- Link to `/rules` (and routines section).
- Decline applies cooldown; no nagging.

**Exit criteria**
- User creates a rule/routine OR dismisses.

#### Phase 4 — Trust maintenance: Review is optional
**Trigger**
- Inbox grows beyond a threshold OR user repeatedly captures without conversion.

**Behavior**
- Optional prompt: “Review is optional. It keeps your inbox light.”
- Link to `/review`.

**Exit criteria**
- User completes one review session OR dismisses (cooldown applied).

#### Completion
**Trigger**
- Phases 0–4 completed or explicitly dismissed; user exhibits a stable start pattern.

**Behavior**
- `entry_mode` reverts to `standard` (or `reduced/ramp` when state requires).
- Onboarding guidance remains off unless user re-enables tips.

### 10.4 Re-onboarding (state-based)
- If bounce rate rises across N sessions, elevate visibility of “Help me start” (user-pulled) on Start Runner.
- If repeated returns after gap, keep Ramp as the default entry for those sessions.

### 10.5 Onboarding measurement (uses existing telemetry)
- Primary: `next_action_started` within 5 minutes by onboarding_step.
- Secondary: `completed_action` within 60 minutes; bounce rate within 2 minutes.
- Behavioral: `expanded_section`, `dismissed_banner`, `capture_saved`, `/rules` visits, `/review` completion.

## 11) Safety, abuse-resistance, and UX ethics

- No shame, guilt, or scarcity framing.
- No dark patterns.
- Explainability is factual, neutral, optional (“Why this?”).
- Telemetry is for measured tuning, not compulsion loops.

---

## 12) Acceptance tests (non-exhaustive)

### 12.1 Determinism
- Same input state produces identical Decision payload ordering.
- Stable tie-break verified across all lists (Quick Picks, Resume Last, etc.)

### 12.2 Autonomy
- Reduced Mode collapses but does not hide.
- “Show full Today” always present and works.

### 12.3 Correctness
- Neo4j unavailable: output equals baseline skeleton.
- Neo4j stale/timeout: output equals baseline skeleton.

### 12.4 Measurement
- Every Today render emits `decision_exposed`.
- Outcomes correlate by `exposure_id` and satisfy attribution windows.

---

## 13) Open decisions (to resolve incrementally)

The following are intentionally undecided. Each decision is broken into micro-options for bite-by-bite selection.

### D1 — Sequence enrichment scope (RESOLVED)

We will implement a **deterministic, layered sequence model** that prefers the strongest signal first, and gracefully degrades without changing baseline correctness.

**Layering (highest to lowest):**
1) **C — Active routine chain**: detect an in-progress routine and prioritize the **next step**.
2) **B — Short history (last 3 actions)**: if no routine is active, score candidates using the last 3 actions as context.
3) **A — Last action only (1-step Markov)**: if history is insufficient, fall back to last action only.

**Deterministic rules**
- Candidate set is still generated by the **Postgres baseline skeleton** (unchanged).
- Sequence enrichment only re-orders within allowed bounds (within category and/or bounded bump among top N).
- Scoring and ordering:
  - compute `sequence_score` from Neo4j (or 0 if unavailable)
  - final ordering uses global tie-break rule:
    `eligible → category priority → total_score desc → baseline_rank asc → action_key asc`

**Routine chain detection (C)**
A routine is “active” when:
- the user completed a step in a known chain within a bounded window (e.g., last 2 hours), and
- there exists a next step that is currently eligible in the baseline candidate set.

If multiple routines match, pick deterministically:
- highest confidence routine score (desc), then routine id (asc).

**Short-history scoring (B)**
- Use last 3 action keys: `a₋3, a₋2, a₋1`.
- Score candidates by a deterministic combination of transitions:
  - `NEXT(a₋1 → cand)` weighted most
  - `NEXT(a₋2 → cand)` weighted less
  - `NEXT(a₋3 → cand)` weighted least
- If any transition edge is missing, treat as 0 (no smoothing that introduces randomness).

**Fallback behavior**
- If Neo4j is stale/down/timeout: `sequence_score = 0` and ordering equals Postgres baseline ordering.
- If history is missing: skip layers B/C and use A (or none, yielding baseline).

### D2 — Routine chains: inferred vs user-defined (RESOLVED: HYBRID)

We will implement a **hybrid routine system**:

1) **Inferred routines (always-on, enrichment-only)**  
   - Neo4j detects candidate routine chains from observed sequences (using the D1 layered model).
   - These inferred routines never change baseline correctness and are used only to **suggest** a “next step”.

2) **User-saved routines (explicit, user-owned)**  
   - When an inferred chain is repeatedly observed (or the user chooses), the system can offer:  
     **“Save this as a routine?”** (optional, skippable).
   - Saved routines are editable on a simple routines surface (part of `/rules` or a dedicated `/routines` page).

#### 2.1 Routine representation

**Stable identifiers**
- `routine_id`: stable UUID
- `routine_step`: `{ idx, action_key }`

**Storage**
- Postgres: authoritative storage for user-saved routines
  - `user_routines(routine_id, user_id, name, enabled, created_at)`
  - `user_routine_steps(routine_id, idx, action_key)`
- Neo4j: enrichment projection only
  - may store `(:User)-[:HAS_ROUTINE]->(:Routine {routine_id})-[:STEP {idx}]->(:Action {action_key})`

#### 2.2 Inference policy (non-invasive)

**When to infer**
- Only infer a chain if it appears with sufficient support (counts) and stability:
  - minimum observations threshold (e.g., ≥ 3 occurrences)
  - low variance in ordering (same step order repeatedly)

**Confidence score**
- `routine_confidence` computed deterministically from counts and consistency (no ML randomness).

**No auto-creation**
- Inferred routines are not “real objects” until the user explicitly saves.

#### 2.3 Suggestion policy (autonomy-first)

**When to suggest saving**
- Offer “Save routine” only if:
  - the user completed a recognizable chain at least N times in last M days, OR
  - the user explicitly taps “Why this?” and sees a routine rationale, then chooses “Save”.

**Never blocking**
- Declining a save suggestion does not change future suggestions except via a simple cooldown (deterministic).

#### 2.4 Determinism rules

- If multiple inferred routines are active:
  - choose highest `routine_confidence` desc
  - tie-break: `routine_id` asc
- If both inferred and user-saved routines apply:
  - prefer **user-saved** routine (user intent outranks inference)
  - tie-break: higher priority (if configured), then `routine_id` asc

#### 2.5 Onboarding / surfaces

**Minimal routine UI**
- Add a “Routines” section inside `/rules` (preferred) OR a dedicated `/routines`.
- Actions:
  - view enabled routines
  - rename
  - reorder steps
  - disable
  - delete

**Core loop integration**
- Routines influence only:
  - Starter Block next suggestion (D1 layer C)
  - Quick Picks ordering bounds (within category / bounded bump)
- Routines never hide sections; “Show full Today” remains.

### D3 — Time bucket granularity (RESOLVED: A)

Use **Morning / Afternoon / Evening** time buckets.

Rationale:
- Low “creepiness” risk and easy explainability.
- Sufficient signal for relevance without overfitting.
- Deterministic mapping from timestamp → bucket.


### D4 — “Why this?” rendering (RESOLVED: A)

Explainability is **hidden by default; tap to reveal**.

Rules:
- Only emit “why” lines derived from approved signals (frequency/recency, sequence/routine, time bucket).
- Always neutral and factual; never guilt/shame/scarcity.
- In Reduced Mode/Ramp, never show “why” inline unless the user taps to reveal (avoid cognitive load).


### D5 — Coping prompt frequency (RESOLVED: A)

Coping support is **user-pulled**, via a “Help me start” control in Start Runner.

Constraints:
- Coping prompt appears only **after** the user chooses to start.
- No forced prompts; no repeated interruptions.
- Deterministic suggestions only (time/focus/materials/motivation).


### D6 — Context pack resources (RESOLVED: A)

Context Pack v1 supports **links only**.

Constraints:
- Context Pack is shown only when it has at least one link; otherwise absent.
- Links are stored in Postgres; Neo4j references stable resource IDs only (if at all).
- Telemetry logs only IDs, never full URLs.


### D7 — Rules triggers/actions v1 (RESOLVED: minimal set)

**Triggers (v1)**
- On Today open
- After completion

**Actions (v1)**
- Start micro-start
- Launch capture

Constraints:
- Rules influence ordering/suggestion only; they do not hide features.
- Conflicts resolve deterministically: higher priority first → then stable id ordering.
- Rules are always skippable.


### D8 — Telemetry storage and retention (RESOLVED: A)

Store telemetry in **Postgres raw event tables** with **30-day retention**, plus daily aggregates for analysis.

Constraints:
- Telemetry write path is non-blocking; failures never block rendering.
- No sensitive content in events (IDs + enums + timestamps only).



### D9 — Onboarding surface placement (RESOLVED: A)

Onboarding will be implemented as **Today `entry_mode` + inline guidance**.

Implementation constraints:
- No dedicated onboarding-only page.
- Onboarding guidance is always dismissible and governed by cooldowns.
- “Show full Today” is always available and never blocked.
- Start Runner remains the initiation surface; onboarding only influences what Today recommends and how much is initially collapsed.


## 14) Incremental editing protocol (how we will iterate)

1) Pick one open decision (D1…D8).
2) Choose option(s), update this spec.
3) Repeat until all critical decisions are resolved.
4) Each iteration produces an updated markdown download.

