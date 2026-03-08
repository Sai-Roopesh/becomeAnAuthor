---
name: stale-origin-lock-cleanup
description: Remove stale git lock files and recover blocked fetch/pull/push operations safely. Use when origin refs lock files or interrupted git operations prevent normal remote updates.
---

# Stale Origin Lock Cleanup

## Workflow
1. Verify no active git process is running.
2. Inspect `.git` for lock files and identify blocked operation.
3. Remove only stale lock files after confirming process inactivity.
4. Run integrity checks (`git fsck` if needed) and retry remote operation.
5. Document root cause and prevention steps.

## Safety Rules
- Never delete lock files while a git process is active.
- Prefer scoped cleanup; avoid broad `.git` deletions.
- Re-run `git status` and remote command after cleanup.

## Project Lessons Encoded
- Dedicated recurring task existed to remove stale origin main lock (`thread: Remove stale origin main lock`).

## Anti-Misdirection Guardrails
- Verify assumptions against the current codebase and runtime behavior before proposing or applying fixes.
- Prefer integrated validation (real backend/runtime flows) for behavior-critical or release-critical claims; do not rely on mock-only confidence.
- Do not claim completion without concrete evidence (commands run, tests executed, or reproducible manual checks).
- Preserve user data and local changes; avoid destructive git/file operations unless explicitly requested.
- If repository policy blocks direct action (for example protected `main`), follow the required PR flow instead of bypassing safeguards.
- State remaining uncertainty or residual risk explicitly instead of implying absolute certainty.
