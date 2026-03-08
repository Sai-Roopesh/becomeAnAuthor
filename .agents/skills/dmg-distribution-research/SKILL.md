---
name: dmg-distribution-research
description: Research and validate macOS DMG distribution and signing/notarization paths, including scenarios without Apple ID credentials during development. Use when shipping desktop installers or troubleshooting DMG acceptance failures.
---

# DMG Distribution Research

## Workflow
1. Define target release scenario: local testing vs public distribution.
2. Map required Apple tooling steps for each scenario (signing, notarization, stapling).
3. Identify what can be tested without Apple ID and what cannot.
4. Produce a decision matrix with compliance, user trust prompts, and effort.
5. Recommend a staged rollout path with verification commands.

## Checks
- Distinguish ad-hoc signing from Developer ID signing.
- Validate Gatekeeper behavior for unsigned/not notarized artifacts.
- Align CI/release workflow with chosen signing strategy.

## Project Lessons Encoded
- A recurring task focused on DMG fix research without Apple ID (`thread: Research DMG fix without Apple ID`).

## Anti-Misdirection Guardrails
- Verify assumptions against the current codebase and runtime behavior before proposing or applying fixes.
- Prefer integrated validation (real backend/runtime flows) for behavior-critical or release-critical claims; do not rely on mock-only confidence.
- Do not claim completion without concrete evidence (commands run, tests executed, or reproducible manual checks).
- Preserve user data and local changes; avoid destructive git/file operations unless explicitly requested.
- If repository policy blocks direct action (for example protected `main`), follow the required PR flow instead of bypassing safeguards.
- State remaining uncertainty or residual risk explicitly instead of implying absolute certainty.
