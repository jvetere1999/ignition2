# Starter Engine Documentation

This folder contains all documentation for the Today Starter Engine feature set.

## Contents

| Document | Description |
|----------|-------------|
| `Spec.md` | Consolidated specification |
| `Decision_Suppression.md` | State-driven visibility rules |
| `Next_Action_Resolver.md` | Deterministic CTA resolution |
| `Momentum_Feedback.md` | Non-gamified feedback banner |
| `Soft_Landing.md` | Post-action reduced mode |
| `Dynamic_UI.md` | Usage-based personalization |
| `Guardrails.md` | Abuse prevention and safety |
| `Validation_Runbook.md` | Testing procedures |

## Quick Links

- Code: `src/lib/today/`
- Flags: `src/lib/flags/`
- UI Components: `src/app/(app)/today/`
- Deployment: `docs/deploy/`
- Evidence: `docs/validation/`

## Feature Flags

All features are gated by flags (default OFF):

1. `TODAY_FEATURES_MASTER` - Kill switch
2. `TODAY_DECISION_SUPPRESSION_V1`
3. `TODAY_NEXT_ACTION_RESOLVER_V1`
4. `TODAY_MOMENTUM_FEEDBACK_V1`
5. `TODAY_SOFT_LANDING_V1`
6. `TODAY_REDUCED_MODE_V1`
7. `TODAY_DYNAMIC_UI_V1`

See `docs/deploy/Flags.md` for configuration details.

