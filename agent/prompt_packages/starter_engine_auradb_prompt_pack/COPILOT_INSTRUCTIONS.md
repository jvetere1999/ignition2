# Copilot Instructions (Agent Operating System)

Follow these rules exactly.

## Absolute rules

- Treat the current working directory as the **repo root**.
- Work only on the branch specified in `agent/CURRENT_STATE.md`.
  - If it does not exist, create it from the current branch.
- **No deletions.**
  - If anything must be replaced, move the old file to `deprecated/<original-relative-path>` (mirror structure).
- Discovery / planning prompts must not add production code.
- Do not assume facts. If unknown, record it in `agent/UNKNOWN.md` with an `UNKNOWN-###` ID and evidence links (file paths).

## Terminal + logs (if you must run commands)

- Prefer finishing code edits before running any commands.
- Redirect every command output to a log file under `.tmp/`:
  - Example: `pnpm -w test > .tmp/tests.log 2>&1`
- Never read terminal output directly.
- Read logs by opening the `.tmp/*.log` files via the file viewer.
- Never use `cat`, `tail`, `head`, `less`, `more`, or `type`.

## Validation standards

- Zero errors.
- Warnings must **not increase** vs baseline.
- Any newly created or materially edited file must be warning-free.
- At validation checkpoints, run:
  - typecheck
  - lint
  - unit tests
  - e2e tests **only if** UI was materially touched
  - builds if shipping artifacts exist
- Save evidence:
  - `.tmp/<name>.log`
  - `agent/validation_<phase>.md` (include commands + log paths + results)

## State tracking mandate (required)

Maintain these files as the only trackers:

- `agent/CURRENT_STATE.md`
- `agent/PROGRESS.md`
- `agent/PHASE_GATE.md`
- `agent/DECISIONS_REQUIRED.md`
- `agent/DECISIONS.md`
- `agent/DECISIONS_REGISTER.md`
- `agent/UNKNOWN.md`
- `agent/gaps.md`
- `agent/DRIFT_REPORT.md`
- `agent/validation_*.md`

Rules:
- Unknown facts only in `agent/UNKNOWN.md` (IDs: `UNKNOWN-###`).
- Action items only in `agent/gaps.md` (IDs: `ACTION-###`).
- Decisions only in `agent/DECISIONS.md` + `agent/DECISIONS_REGISTER.md` (IDs: `DEC-###`).
- Phase gating only in `agent/PHASE_GATE.md`.

## Neo4j AuraDB requirements

- Treat Neo4j as **enrichment-only**. Postgres baseline must be correct with AuraDB disabled.
- AuraDB connectivity must use secure schemes (`neo4j+s` / `bolt+s`) and strict timeouts.
- Graph calls must fail open (return no enrichment) and increment observability counters.

## Starter Engine Decision payload contract requirements

- Deterministic ordering everywhere (stable sorting with explicit tie-breakers).
- The payload must be schema-validated (JSON schema and/or strongly typed DTO + tests).
- Include “Why this?” support as tap-to-reveal (data present but UI can hide/collapse).
