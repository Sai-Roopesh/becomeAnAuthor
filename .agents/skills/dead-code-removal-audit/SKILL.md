---
name: dead-code-removal-audit
description: Evaluate dead code removal quality to ensure cleanup does not break active paths, tests, or build workflows. Use when removing unused files/features, simplifying architecture, or validating cleanup PRs.
---

# Dead Code Removal Audit

## Workflow
1. Produce candidate list with static analysis and import graph checks.
2. Classify candidates: truly unused, environment-specific, dynamically loaded, or uncertain.
3. Remove only high-confidence unused code first.
4. Run targeted tests/build after each cleanup slice.
5. Flag uncertain candidates for follow-up instead of hard deletion.

## Checks
- Dynamic imports and reflection paths are preserved.
- CLI/scripts still reference required modules.
- Docs/config mention removed features are updated.

## Project Lessons Encoded
- Dead code removal was a repeated theme and required validation (`PR #3`, `PR #10`, `thread: Evaluate dead code removal quality`).

## Anti-Misdirection Guardrails
- Verify assumptions against the current codebase and runtime behavior before proposing or applying fixes.
- Prefer integrated validation (real backend/runtime flows) for behavior-critical or release-critical claims; do not rely on mock-only confidence.
- Do not claim completion without concrete evidence (commands run, tests executed, or reproducible manual checks).
- Preserve user data and local changes; avoid destructive git/file operations unless explicitly requested.
- If repository policy blocks direct action (for example protected `main`), follow the required PR flow instead of bypassing safeguards.
- State remaining uncertainty or residual risk explicitly instead of implying absolute certainty.
