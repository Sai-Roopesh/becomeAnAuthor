---
name: release-pr-flow-real-tauri
description: Execute release-critical fixes through codex branches, GitHub pull requests, and merge to main, using real Tauri and Rust validation gates instead of Playwright or mock-only test confidence. Use when user asks to prepare or fix release readiness with native runtime verification.
---

# Release PR Flow (Real Tauri)

## Workflow
1. Create a `codex/*` branch from `main`.
2. Implement release-critical fixes in narrow, reviewable commits.
3. Run real release gates:
   - `pnpm run release:gate`
   - Native manual smoke in Tauri runtime (`pnpm run tauri:dev`) for critical user flows.
4. Avoid Playwright and mock-only checks as release blockers.
5. Push branch to origin and open a PR.
6. Merge via the repository-approved PR flow to `main`, then verify local and remote `main` are up to date.

## Required Output
- Branch name and commit SHA.
- PR URL and merge method used.
- Real gate results (`release:gate` + manual smoke summary).
- Remaining release risks (if any).

## Guardrails
- Do not bypass build/type/Rust checks.
- Do not force-push `main`.
- Keep release fixes scoped; defer non-blockers with explicit notes.

## Anti-Misdirection Guardrails
- Verify assumptions against the current codebase and runtime behavior before proposing or applying fixes.
- Prefer integrated validation (real backend/runtime flows) for behavior-critical or release-critical claims; do not rely on mock-only confidence.
- Do not claim completion without concrete evidence (commands run, tests executed, or reproducible manual checks).
- Preserve user data and local changes; avoid destructive git/file operations unless explicitly requested.
- If repository policy blocks direct action (for example protected `main`), follow the required PR flow instead of bypassing safeguards.
- State remaining uncertainty or residual risk explicitly instead of implying absolute certainty.
