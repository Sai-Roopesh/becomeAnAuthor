---
name: restored-chat-actions-regression-fix
description: Restore missing chat actions (archive/delete and related controls) for imported or restored projects where UI state differs from newly created projects. Use when restored data paths show missing controls or inconsistent sidebar behavior.
---

# Restored Chat Actions Regression Fix

## Workflow
1. Compare freshly created project behavior vs restored/imported project behavior.
2. Trace conditional rendering for action controls to identify data-shape assumptions.
3. Normalize restored data mapping so permission/state flags match live-created entities.
4. Verify parity in sidebar and chat surfaces.
5. Add regression tests for restore path fixtures.

## Checks
- Presence of required ids/flags on restored chat entries.
- Action handlers wired for restored entities, not just new entries.
- No hidden UI fallback that masks broken restored metadata.

## Project Lessons Encoded
- User-reported missing archive/delete buttons in restored projects drove fix iterations (`thread prompt history`, `PR #29`).

## Anti-Misdirection Guardrails
- Verify assumptions against the current codebase and runtime behavior before proposing or applying fixes.
- Prefer integrated validation (real backend/runtime flows) for behavior-critical or release-critical claims; do not rely on mock-only confidence.
- Do not claim completion without concrete evidence (commands run, tests executed, or reproducible manual checks).
- Preserve user data and local changes; avoid destructive git/file operations unless explicitly requested.
- If repository policy blocks direct action (for example protected `main`), follow the required PR flow instead of bypassing safeguards.
- State remaining uncertainty or residual risk explicitly instead of implying absolute certainty.
