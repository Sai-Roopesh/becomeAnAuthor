---
name: docs-pr-sync
description: Keep architecture/design/README documentation synchronized with merged implementation changes through dedicated docs PR updates. Use when code merges alter behavior, workflows, or system structure and docs must be brought into parity.
---

# Docs PR Sync

## Workflow
1. Compare merged code changes with existing docs claims.
2. Update architecture/design/release docs only where behavior actually changed.
3. Keep docs PR scoped and traceable to specific code PRs.
4. Validate commands, paths, and workflow steps in docs.
5. Link docs updates back to source PRs for auditability.

## Checks
- No stale or contradictory setup/release instructions.
- Feature docs match current UI and behavior.
- CI/workflow docs reflect latest automation wiring.

## Project Lessons Encoded
- Frequent docs-followup PRs indicate intentional docs-sync workflow (`PR #9`, `PR #11`, `PR #14`, `PR #20`, `PR #27`, `PR #32`, `PR #34`, `PR #38`, `PR #44`).

## Anti-Misdirection Guardrails
- Verify assumptions against the current codebase and runtime behavior before proposing or applying fixes.
- Prefer integrated validation (real backend/runtime flows) for behavior-critical or release-critical claims; do not rely on mock-only confidence.
- Do not claim completion without concrete evidence (commands run, tests executed, or reproducible manual checks).
- Preserve user data and local changes; avoid destructive git/file operations unless explicitly requested.
- If repository policy blocks direct action (for example protected `main`), follow the required PR flow instead of bypassing safeguards.
- State remaining uncertainty or residual risk explicitly instead of implying absolute certainty.
