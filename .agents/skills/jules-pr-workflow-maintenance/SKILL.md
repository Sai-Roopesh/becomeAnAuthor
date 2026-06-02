---
name: jules-pr-workflow-maintenance
description: Maintain and repair Jules-driven PR automation workflows in GitHub Actions, including trigger conditions, tag resolution, and docs PR sequencing. Use when Jules jobs are skipped, mis-triggered, or failing after merge.
---

# Jules PR Workflow Maintenance

## Workflow
1. Audit workflow triggers (`on.push`, `on.pull_request`, path filters, conditions).
2. Verify action references are resolvable and pinned appropriately.
3. Confirm sequencing between code PRs and docs-update PR generation.
4. Simulate trigger matrix and check skip conditions explicitly.
5. Add guard comments in workflow files to prevent repeat misconfiguration.

## Checks
- Avoid conditions that unintentionally skip automation.
- Ensure maintenance branches and docs branches are permitted paths.
- Confirm workflow permissions for PR creation and updates.

## Project Lessons Encoded
- Multiple consecutive PRs fixed Jules workflow skip behavior (`PR #6`, `PR #7`, `PR #8`).
- Dedicated task existed to add Jules PR workflow (`thread: Add Jules PR workflow`).

## Anti-Misdirection Guardrails
- Verify assumptions against the current codebase and runtime behavior before proposing or applying fixes.
- Prefer integrated validation (real backend/runtime flows) for behavior-critical or release-critical claims; do not rely on mock-only confidence.
- Do not claim completion without concrete evidence (commands run, tests executed, or reproducible manual checks).
- Preserve user data and local changes; avoid destructive git/file operations unless explicitly requested.
- If repository policy blocks direct action (for example protected `main`), follow the required PR flow instead of bypassing safeguards.
- State remaining uncertainty or residual risk explicitly instead of implying absolute certainty.
