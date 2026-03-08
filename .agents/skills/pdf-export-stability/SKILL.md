---
name: pdf-export-stability
description: Diagnose and harden PDF export pipelines in React/Next/Tauri apps, especially parser incompatibilities, numeric serialization failures, blank output, and stuck progress states. Use when PDF export throws runtime errors, hangs, or renders invalid files.
---

# PDF Export Stability

## Workflow
1. Reproduce using the same export mode and options (basic vs advanced).
2. Capture exact error class and source file from logs before patching.
3. Isolate failures by stage: content prep, style normalization, renderer generation, file write, UI completion state.
4. Implement deterministic sanitization and bounded transformations instead of silent fallbacks.
5. Add regression tests for failing inputs and verify completion toast/state transitions.

## Failure Patterns To Check
- Unsupported CSS color functions (for example `lab(...)`) reaching the renderer.
- Unsupported/scientific-notation numbers from layout or style transforms.
- Huge blank PDFs from pagination/content tree bugs.
- Export completion not resetting UI state (stuck `generating` / `exporting`).

## Project Lessons Encoded
- Color parser failure in export stack (`PR #30`).
- Unsupported numeric serialization failure (`PR #35`).
- Stuck export toast/progress (`PR #37`).
- Advanced-mode hang regression (`PR #41`).
- User reports also included blank 160-page output and long-running advanced export.

## Anti-Misdirection Guardrails
- Verify assumptions against the current codebase and runtime behavior before proposing or applying fixes.
- Prefer integrated validation (real backend/runtime flows) for behavior-critical or release-critical claims; do not rely on mock-only confidence.
- Do not claim completion without concrete evidence (commands run, tests executed, or reproducible manual checks).
- Preserve user data and local changes; avoid destructive git/file operations unless explicitly requested.
- If repository policy blocks direct action (for example protected `main`), follow the required PR flow instead of bypassing safeguards.
- State remaining uncertainty or residual risk explicitly instead of implying absolute certainty.
