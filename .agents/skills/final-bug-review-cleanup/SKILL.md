---
name: final-bug-review-cleanup
description: Run a final bug sweep before merge/release, prioritizing regressions, UX blockers, and unresolved reviewer findings. Use when preparing final merge, release readiness, or post-fix verification.
---

# Final Bug Review Cleanup

## Workflow
1. Aggregate unresolved issues from PR comments, bug reports, and recent commits.
2. Reproduce each issue and classify by severity and release impact.
3. Fix highest-impact defects first; keep patches narrow and test-backed.
4. Re-run smoke checks on key user flows.
5. Close with a concise risk report listing deferred items.

## Required Output
- Prioritized finding list with file paths.
- What was fixed vs deferred.
- Explicit test status and remaining risk.

## Project Lessons Encoded
- Final cleanup pass was a recurring step before merge (`thread: Conduct final bug review cleanup`, repeated `fix-review-findings` PRs).

## Anti-Misdirection Guardrails
- Verify assumptions against the current codebase and runtime behavior before proposing or applying fixes.
- Prefer integrated validation (real backend/runtime flows) for behavior-critical or release-critical claims; do not rely on mock-only confidence.
- Do not claim completion without concrete evidence (commands run, tests executed, or reproducible manual checks).
- Preserve user data and local changes; avoid destructive git/file operations unless explicitly requested.
- If repository policy blocks direct action (for example protected `main`), follow the required PR flow instead of bypassing safeguards.
- State remaining uncertainty or residual risk explicitly instead of implying absolute certainty.
