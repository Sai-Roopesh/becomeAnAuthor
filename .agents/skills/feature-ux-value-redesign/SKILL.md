---
name: feature-ux-value-redesign
description: Transform technically working but low-impact features into high-value user workflows. Use when a feature exists yet users struggle to discover it, understand it, trust it, or get practical benefit from it; includes UX redesign, guided usage, interaction hardening, and regression-proof validation.
---

# Feature UX Value Redesign

## Workflow
1. Audit the real user journey from first discovery to repeated use.
2. Trace implementation end-to-end from UI trigger to persistence and read models.
3. Identify value blockers: discoverability gaps, prerequisite dead-ends, weak feedback, and stale/incorrect state behavior.
4. Redesign around a value path: entry point, guidance, primary action, fast feedback, and clear next step.
5. Add leverage patterns where relevant: keyboard shortcuts, context-based suggestions, and one-click batch actions.
6. Harden async behavior with pending, success, and failure states plus race-safe guards.
7. Enforce data integrity at multiple layers (UI guard + repository/backend constraints where needed).
8. Add focused component and repository tests for the redesigned flow.
9. Sync docs for changed behavior/workflow expectations.

## UX Checklist
- Make the action visible without relying only on hover/hidden menus.
- Explain why the feature matters and how to use it in 2-3 steps.
- Provide a direct path when prerequisites are missing (for example, jump to setup surface).
- Ensure the fastest useful outcome is reachable in one obvious action.
- Keep desktop and touch behavior equally usable.
- Include shortcut support for repeated users when it improves speed.

## Engineering Checklist
- Invalidate relevant live queries after mutations.
- Prevent duplicates and invalid state transitions in the repository layer.
- Add server-side or persistence-level safeguards when duplication/races can still occur.
- Disable or debounce conflicting controls while requests are in flight.
- Surface actionable error feedback instead of silent failure.

## Validation Expectations
- Component tests for onboarding text, critical CTAs, and shortcut behavior.
- Mutation tests for create/update/delete refresh behavior and dedupe guarantees.
- Quick lint/test pass on touched files before finalizing.
- Explicit note of any unrun checks and why.

## Project Lessons Encoded
- This project repeatedly surfaced UI regressions where functionality existed but user value was low until interaction design was fixed.
- Sidebar/actions and restored/trash UX regressions showed that discoverability and operation ordering are first-class quality concerns.
- Docs parity is required after workflow changes to prevent future drift.

## Anti-Misdirection Guardrails
- Verify assumptions against the current codebase and runtime behavior before proposing or applying fixes.
- Prefer integrated validation (real backend/runtime flows) for behavior-critical or release-critical claims; do not rely on mock-only confidence.
- Do not claim completion without concrete evidence (commands run, tests executed, or reproducible manual checks).
- Preserve user data and local changes; avoid destructive git/file operations unless explicitly requested.
- If repository policy blocks direct action (for example protected `main`), follow the required PR flow instead of bypassing safeguards.
- State remaining uncertainty or residual risk explicitly instead of implying absolute certainty.
