---
name: export-customization-implementation
description: Implement robust DOCX/PDF customization controls without destabilizing export correctness. Use when adding user-facing export options, advanced mode controls, or template/config handling for document export.
---

# Export Customization Implementation

## Workflow
1. Freeze baseline reliability for DOCX/PDF before adding new knobs.
2. Define an explicit export config schema with validation and sane bounds.
3. Normalize UI options into renderer-safe values at a single boundary.
4. Keep preview and final export code paths aligned to avoid divergence.
5. Add compatibility tests across common option combinations.

## Guardrails
- Reject or clamp invalid values early with explicit user feedback.
- Avoid hidden fallbacks that mask broken configuration.
- Keep advanced-mode defaults conservative and reproducible.
- Version configuration shape when introducing breaking option changes.

## Project Lessons Encoded
- Customization was added then required multiple stabilization passes (`PR #33`, `PR #34`, `PR #38`).
- Errors from advanced options caused export hangs and invalid renderer input (`PR #35`, `PR #41`).
- User explicitly requested correctness-first over weak fallbacks.

## Anti-Misdirection Guardrails
- Verify assumptions against the current codebase and runtime behavior before proposing or applying fixes.
- Prefer integrated validation (real backend/runtime flows) for behavior-critical or release-critical claims; do not rely on mock-only confidence.
- Do not claim completion without concrete evidence (commands run, tests executed, or reproducible manual checks).
- Preserve user data and local changes; avoid destructive git/file operations unless explicitly requested.
- If repository policy blocks direct action (for example protected `main`), follow the required PR flow instead of bypassing safeguards.
- State remaining uncertainty or residual risk explicitly instead of implying absolute certainty.
