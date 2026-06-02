---
name: tauri-manual-smoke-test
description: Run pragmatic manual smoke testing for Tauri desktop app flows using local runtime, with emphasis on real integrated behavior rather than mocked browser-only checks. Use when validating user-reported desktop bugs or pre-merge critical flows.
---

# Tauri Manual Smoke Test

## Workflow
1. Launch the desktop app using project-standard command.
2. Exercise critical flows end-to-end in native shell context.
3. Record observed vs expected behavior with exact reproduction steps.
4. Capture console/runtime logs for failing flows.
5. Convert validated failures into minimal reproducible bug notes.

## Core Scenarios
- Project creation/import/restore paths.
- Chat creation, archive, delete, and sidebar actions.
- Export flows (DOCX/PDF) including advanced options.
- Settings and persistence behavior across restarts.

## Project Lessons Encoded
- User explicitly requested real app manual testing over mocked browser checks (prompt history).

## Anti-Misdirection Guardrails
- Verify assumptions against the current codebase and runtime behavior before proposing or applying fixes.
- Prefer integrated validation (real backend/runtime flows) for behavior-critical or release-critical claims; do not rely on mock-only confidence.
- Do not claim completion without concrete evidence (commands run, tests executed, or reproducible manual checks).
- Preserve user data and local changes; avoid destructive git/file operations unless explicitly requested.
- If repository policy blocks direct action (for example protected `main`), follow the required PR flow instead of bypassing safeguards.
- State remaining uncertainty or residual risk explicitly instead of implying absolute certainty.
