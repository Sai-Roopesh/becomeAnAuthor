---
name: ui-responsiveness-validation
description: Validate and harden responsive behavior across desktop and narrow breakpoints for app shells, chat, dashboard, and settings views. Use when asked to verify responsiveness, eliminate overflow, or close mobile/desktop layout regressions.
---

# UI Responsiveness Validation

## Workflow
1. Test key routes at representative widths: 320, 375, 768, 1024, 1280+.
2. Validate overflow and scroll containers, then interaction affordances.
3. Confirm fixed/sticky regions do not clip content or block controls.
4. Verify typography scaling and wrapping for long labels/content.
5. Add focused regression tests for previously broken layouts.

## Checklist
- Sidebar behavior at narrow widths.
- Chat input and message list overlap/scroll behavior.
- Settings forms and dialog layouts on small screens.
- Touch targets and spacing remain usable.

## Project Lessons Encoded
- Dedicated responsiveness validation and fixes were recurring tasks (`thread: Validate responsiveness across UI`).
- Recent merged work targeted chat/dashboard/settings responsiveness (`PR #43`, `PR #44`).

## Anti-Misdirection Guardrails
- Verify assumptions against the current codebase and runtime behavior before proposing or applying fixes.
- Prefer integrated validation (real backend/runtime flows) for behavior-critical or release-critical claims; do not rely on mock-only confidence.
- Do not claim completion without concrete evidence (commands run, tests executed, or reproducible manual checks).
- Preserve user data and local changes; avoid destructive git/file operations unless explicitly requested.
- If repository policy blocks direct action (for example protected `main`), follow the required PR flow instead of bypassing safeguards.
- State remaining uncertainty or residual risk explicitly instead of implying absolute certainty.
