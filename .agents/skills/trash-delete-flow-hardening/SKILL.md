---
name: trash-delete-flow-hardening
description: Harden destructive delete flows in trash/recycle UIs to ensure confirmation dialogs gate deletion and prevent race conditions. Use when delete confirmation appears after deletion has already occurred or when trash UX feels inconsistent.
---

# Trash Delete Flow Hardening

## Workflow
1. Reproduce with instrumentation around click, confirmation open, and delete API execution.
2. Ensure deletion only executes from explicit confirmation callback.
3. Debounce or lock duplicate triggers while dialog is active.
4. Keep list state and modal state synchronized through async transitions.
5. Add regression coverage using focused component/repository tests plus manual rapid-click smoke checks in Tauri runtime.

## Checks
- No side effects in pre-confirm click handler.
- Dialog lifecycle strictly precedes destructive mutation.
- UI optimistic updates can roll back on failure.

## Project Lessons Encoded
- User reported deletion occurring before confirmation was accepted (prompt history issue report).

## Anti-Misdirection Guardrails
- Verify assumptions against the current codebase and runtime behavior before proposing or applying fixes.
- Prefer integrated validation (real backend/runtime flows) for behavior-critical or release-critical claims; do not rely on mock-only confidence.
- Do not claim completion without concrete evidence (commands run, tests executed, or reproducible manual checks).
- Preserve user data and local changes; avoid destructive git/file operations unless explicitly requested.
- If repository policy blocks direct action (for example protected `main`), follow the required PR flow instead of bypassing safeguards.
- State remaining uncertainty or residual risk explicitly instead of implying absolute certainty.
