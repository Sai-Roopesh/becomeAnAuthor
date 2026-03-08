---
name: sidebar-scroll-fix
description: Diagnose and fix sidebar scrolling, clipping, and control visibility issues in chat/document navigation layouts. Use when sidebars fail to scroll, actions disappear, or sticky regions break list usability.
---

# Sidebar Scroll Fix

## Workflow
1. Reproduce with realistic list length and varied viewport heights.
2. Inspect flex and overflow chain from page root to sidebar list.
3. Ensure one scroll owner and explicit height constraints.
4. Verify action buttons remain visible and reachable during scroll.
5. Add regression coverage for restored/imported data states.

## Checks
- `overflow` and `min-height` interactions in nested flex containers.
- Sticky headers/footers not consuming scroll region unexpectedly.
- Sidebar item action visibility in both new and restored entities.

## Project Lessons Encoded
- Sidebar scrolling and action visibility were recurring regressions (`thread: Fix sidebar scrolling`, `PR #29`).

## Anti-Misdirection Guardrails
- Verify assumptions against the current codebase and runtime behavior before proposing or applying fixes.
- Prefer integrated validation (real backend/runtime flows) for behavior-critical or release-critical claims; do not rely on mock-only confidence.
- Do not claim completion without concrete evidence (commands run, tests executed, or reproducible manual checks).
- Preserve user data and local changes; avoid destructive git/file operations unless explicitly requested.
- If repository policy blocks direct action (for example protected `main`), follow the required PR flow instead of bypassing safeguards.
- State remaining uncertainty or residual risk explicitly instead of implying absolute certainty.
