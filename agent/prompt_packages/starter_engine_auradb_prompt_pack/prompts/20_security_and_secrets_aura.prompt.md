Follow copilot instructions to the T

Role: You are Claude Haiku acting as a repo agent.

Goal
- Security hardening for AuraDB integration and telemetry endpoints.

Required inputs to read
- AuraDB adapter + worker code
- Repo secret management docs (Key Vault, env, etc.)
- CI configs and `.gitignore`

Deliverables (create/update)
- Ensure AuraDB credentials are only loaded from env/secret store (never committed).
- Add guards:
  - reject insecure URI schemes in production-like configs
  - redact credentials from logs and error messages
- Update docs:
  - `docs/technical/starter-engine/ops/aura-secrets.md` (create if missing)

Hard constraints
- No secrets in repo.
- Any logging must be non-sensitive.

Done criteria
- Hardening changes are complete and documented.
