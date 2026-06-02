---
name: repo-quality-sweep
description: End-to-end repository quality review for functionality gaps, regressions, architecture drift, duplicated logic, and weak test coverage. Use when asked to review full repo quality, validate implementation against scope, or produce prioritized findings before merge.
---

# Repo Quality Sweep

## Workflow
1. Capture current state: `git status --short --branch`, current branch, and target diff (`main...HEAD` or commit range).
2. Build an inventory with `rg --files` and map critical surfaces: `frontend/`, `backend/`, `app/`, `scripts/`, CI workflows.
3. Review behavior first, style second. Focus on user-visible and data-integrity risks.
4. Verify each changed area has matching tests or explain missing coverage as a risk.
5. Return findings sorted by severity with file paths and concrete remediation.

## Mandatory Checks
- Confirm expected feature behavior is actually wired end-to-end.
- Flag reinvention where existing SDK/library capabilities should be used.
- Check for stale/dead files after refactors.
- Check state-management races and async error handling.
- Check that docs and CI are updated when architecture or workflows change.

## Project Lessons Encoded
- Repeated quality sweeps were needed before merges (`thread: Review full repo quality`, `thread: Conduct final bug review cleanup`).
- Multiple review-fix PRs indicate regressions are easy to reintroduce (`PR #25`, `PR #26`, `PR #29`).
- Docs drift happened repeatedly, so documentation parity must be part of quality review (`PR #27`, `PR #32`, `PR #38`, `PR #44`).

## Anti-Misdirection Guardrails
- Verify assumptions against the current codebase and runtime behavior before proposing or applying fixes.
- Prefer integrated validation (real backend/runtime flows) for behavior-critical or release-critical claims; do not rely on mock-only confidence.
- Do not claim completion without concrete evidence (commands run, tests executed, or reproducible manual checks).
- Preserve user data and local changes; avoid destructive git/file operations unless explicitly requested.
- If repository policy blocks direct action (for example protected `main`), follow the required PR flow instead of bypassing safeguards.
- State remaining uncertainty or residual risk explicitly instead of implying absolute certainty.
