Follow copilot instructions to the T

Role: You are Claude Haiku acting as a repo agent.

Goal
- Run full validations at the end (less frequent, but complete).

Required inputs to read
- `agent/inventory/runtime.md`
- CI workflow files for canonical commands

Actions
- Run the repo’s canonical validations:
  - typecheck
  - lint
  - unit tests
  - e2e tests if UI changed
  - build if present
- Redirect outputs:
  - `.tmp/validation_final_typecheck.log`
  - `.tmp/validation_final_lint.log`
  - `.tmp/validation_final_tests.log`
  - `.tmp/validation_final_e2e.log` (if applicable)
  - `.tmp/validation_final_build.log` (if applicable)

Deliverables
- Create `agent/validation_final.md` summarizing:
  - commands run
  - log paths
  - errors/warnings counts
  - warnings delta vs baseline

Hard constraints
- Zero errors.
- Warnings must not increase.

Done criteria
- All validations pass and evidence is recorded.
