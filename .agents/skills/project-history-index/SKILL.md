---
name: project-history-index
description: Canonical index of project learnings from complete GitHub PR history and internal Codex chat/thread history. Use when deriving new skills, onboarding context, or validating whether proposed workflows are grounded in past issues and fixes.
---

# Project History Index

## Purpose
Use this skill as the source-of-truth index before creating or updating project-specific skills. It links full PR history and local Codex thread/prompt history captured from this machine.

## Workflow
1. Read `references/prs.md` for complete PR lifecycle history (open, closed, merged).
2. Read `references/codex-history.md` for internal Codex thread titles and recurring prompts.
3. Extract recurring failure patterns and map them to reusable workflow skills.
4. Prefer narrowly scoped skills over one broad generic skill.
5. When history reveals regressions, add explicit regression checks to the derived skill.

## Derived Themes From This Project
- Export reliability needed repeated stabilization.
- UI/UX regressions recurred in sidebar/restore/trash flows.
- CI and maintenance automation needed frequent guardrail updates.
- Docs synchronization after merges is mandatory to avoid drift.

## Anti-Misdirection Guardrails
- Verify assumptions against the current codebase and runtime behavior before proposing or applying fixes.
- Prefer integrated validation (real backend/runtime flows) for behavior-critical or release-critical claims; do not rely on mock-only confidence.
- Do not claim completion without concrete evidence (commands run, tests executed, or reproducible manual checks).
- Preserve user data and local changes; avoid destructive git/file operations unless explicitly requested.
- If repository policy blocks direct action (for example protected `main`), follow the required PR flow instead of bypassing safeguards.
- State remaining uncertainty or residual risk explicitly instead of implying absolute certainty.
