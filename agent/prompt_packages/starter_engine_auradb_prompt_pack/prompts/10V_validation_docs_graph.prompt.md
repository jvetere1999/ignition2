Follow copilot instructions to the T

Role: You are Claude Haiku acting as a repo agent.

Goal
- Run minimal validations after docs + graph design, without over-validating.

Required inputs to read
- `agent/inventory/runtime.md` (for how to run validations)

Actions
- If the repo has a docs lint/link check, run it.
- If not, run the smallest available validation that does not require full builds.
- Redirect outputs to `.tmp/validation_docs_graph.log 2>&1`.

Deliverables
- Create `agent/validation_docs_graph.md`
  - commands executed
  - log file path(s)
  - summary: errors/warnings counts
  - delta vs baseline (if baseline exists)

Hard constraints
- Do not introduce new warnings.

Done criteria
- validation doc exists with evidence log paths.
