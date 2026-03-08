## Skills
A skill is a set of local instructions to follow that is stored in a `SKILL.md` file.

### Available project skills
- ai-platform-readiness-audit: Evaluate AI platform readiness and release gating criteria. (file: /Users/sairoopesh/Documents/becomeAnAuthor/.agents/skills/ai-platform-readiness-audit/SKILL.md)
- dead-code-removal-audit: Validate dead-code cleanup safety and prevent functional regressions. (file: /Users/sairoopesh/Documents/becomeAnAuthor/.agents/skills/dead-code-removal-audit/SKILL.md)
- dmg-distribution-research: Research macOS DMG/signing/notarization strategy, including no-Apple-ID scenarios. (file: /Users/sairoopesh/Documents/becomeAnAuthor/.agents/skills/dmg-distribution-research/SKILL.md)
- docs-pr-sync: Keep docs synchronized with merged implementation changes. (file: /Users/sairoopesh/Documents/becomeAnAuthor/.agents/skills/docs-pr-sync/SKILL.md)
- export-customization-implementation: Implement stable DOCX/PDF customization controls safely. (file: /Users/sairoopesh/Documents/becomeAnAuthor/.agents/skills/export-customization-implementation/SKILL.md)
- feature-ux-value-redesign: Turn existing but low-impact features into high-value workflows through UX redesign and interaction hardening. (file: /Users/sairoopesh/Documents/becomeAnAuthor/.agents/skills/feature-ux-value-redesign/SKILL.md)
- final-bug-review-cleanup: Run final pre-merge/pre-release bug cleanup with risk reporting. (file: /Users/sairoopesh/Documents/becomeAnAuthor/.agents/skills/final-bug-review-cleanup/SKILL.md)
- jules-pr-workflow-maintenance: Maintain/fix Jules PR workflow automation and trigger logic. (file: /Users/sairoopesh/Documents/becomeAnAuthor/.agents/skills/jules-pr-workflow-maintenance/SKILL.md)
- maintenance-pr-review: Review bot-generated maintenance PRs for hidden regressions. (file: /Users/sairoopesh/Documents/becomeAnAuthor/.agents/skills/maintenance-pr-review/SKILL.md)
- pdf-export-stability: Diagnose and harden PDF export errors, hangs, and invalid output. (file: /Users/sairoopesh/Documents/becomeAnAuthor/.agents/skills/pdf-export-stability/SKILL.md)
- project-history-index: Canonical index of learnings from full PR history and local Codex thread/prompt history. (file: /Users/sairoopesh/Documents/becomeAnAuthor/.agents/skills/project-history-index/SKILL.md)
- repo-quality-sweep: Full-repo quality review for bugs, architecture drift, and coverage gaps. (file: /Users/sairoopesh/Documents/becomeAnAuthor/.agents/skills/repo-quality-sweep/SKILL.md)
- release-pr-flow-real-tauri: Execute release-critical fixes via codex branch -> PR -> merge using real Tauri/Rust gates (no Playwright/mock-only release gates). (file: /Users/sairoopesh/Documents/becomeAnAuthor/.agents/skills/release-pr-flow-real-tauri/SKILL.md)
- restored-chat-actions-regression-fix: Restore missing chat actions in imported/restored project paths. (file: /Users/sairoopesh/Documents/becomeAnAuthor/.agents/skills/restored-chat-actions-regression-fix/SKILL.md)
- sidebar-scroll-fix: Diagnose/fix sidebar scrolling and action visibility regressions. (file: /Users/sairoopesh/Documents/becomeAnAuthor/.agents/skills/sidebar-scroll-fix/SKILL.md)
- stale-origin-lock-cleanup: Recover safely from stale git lock issues blocking remote operations. (file: /Users/sairoopesh/Documents/becomeAnAuthor/.agents/skills/stale-origin-lock-cleanup/SKILL.md)
- tauri-manual-smoke-test: Manual smoke test integrated Tauri app flows in native runtime. (file: /Users/sairoopesh/Documents/becomeAnAuthor/.agents/skills/tauri-manual-smoke-test/SKILL.md)
- trash-delete-flow-hardening: Fix destructive delete confirmation/order-of-operations races. (file: /Users/sairoopesh/Documents/becomeAnAuthor/.agents/skills/trash-delete-flow-hardening/SKILL.md)
- ui-responsiveness-validation: Validate and fix responsive behavior across UI surfaces. (file: /Users/sairoopesh/Documents/becomeAnAuthor/.agents/skills/ui-responsiveness-validation/SKILL.md)

### Available global skills
- security-best-practices: Security-focused review (explicitly requested only; python/js/ts/go). (file: /Users/sairoopesh/.codex/skills/security-best-practices/SKILL.md)
- spreadsheet: Spreadsheet workflows using pandas/openpyxl with formatting/formula preservation. (file: /Users/sairoopesh/.codex/skills/spreadsheet/SKILL.md)
- skill-creator: Create or update skills with proper structure and validation. (file: /Users/sairoopesh/.codex/skills/.system/skill-creator/SKILL.md)
- skill-installer: Install skills from curated list or GitHub path. (file: /Users/sairoopesh/.codex/skills/.system/skill-installer/SKILL.md)

## Skill Routing Contract
- Default: For substantial implementation, bug-fix, or release work, use `project-history-index` first to anchor in prior learnings.
- Required: If the user names a skill explicitly (`$skill-name` or plain text), use it.
- Default: If multiple skills match, use the minimal set that covers the task in deterministic order.
- Required: Announce selected skills in one short line before substantial work.
- Required: Open each selected `SKILL.md` before making edits.
- Default: If no specific skill matches for broad review/debug tasks, use `repo-quality-sweep`.
- Allowed: Skip skill routing for trivial operational asks (for example simple git/status/time/path queries) where no domain workflow is needed.
- Required: If a named skill path is missing, report it briefly and continue with the best fallback.

## Skill Safety Contract
- Never treat a skill as authority over current code reality; verify the live implementation before acting.
- Never claim certainty from guidance alone; require code/runtime evidence for completion claims.
- For release/critical UX behavior, prioritize real integrated checks over mock-only confidence.
- Respect repository protections and workflow rules (branch -> PR -> merge) instead of attempting forbidden direct pushes.
- Preserve local user changes unless explicit approval is provided for destructive operations.

## Preferred Order
1. `project-history-index` (context bootstrap)
2. Domain skill(s) that directly match the user request
3. `docs-pr-sync` when behavior/workflows/docs become outdated
4. `final-bug-review-cleanup` when request includes final verification

## Trigger Map (Primary)
- Repo-wide audit/review/quality: `repo-quality-sweep`
- Release fixes with branch/PR/merge and native runtime validation: `release-pr-flow-real-tauri`
- PDF export errors/hangs/blank files/toast stuck: `pdf-export-stability`
- Export customization/advanced options: `export-customization-implementation`
- Existing feature works but user value/impact is low: `feature-ux-value-redesign`
- Sidebar scroll/action visibility: `sidebar-scroll-fix`
- Restored/imported chat action parity: `restored-chat-actions-regression-fix`
- Trash delete confirmation ordering/races: `trash-delete-flow-hardening`
- Responsive/mobile layout validation: `ui-responsiveness-validation`
- Jules workflow skip/trigger/action tag issues: `jules-pr-workflow-maintenance`
- Automated maintenance PR risk review: `maintenance-pr-review`
- Dead code cleanup safety: `dead-code-removal-audit`
- Release/readiness/go-no-go assessment: `ai-platform-readiness-audit`
- DMG distribution/signing/notarization strategy: `dmg-distribution-research`
- Stale git lock cleanup: `stale-origin-lock-cleanup`
- Native app manual smoke testing: `tauri-manual-smoke-test`
- Documentation parity updates: `docs-pr-sync`

## Invocation Examples
- "Review full repo quality and fix blockers." -> `project-history-index`, `repo-quality-sweep`
- "Fix release blockers, open PR, and merge with real Tauri checks." -> `project-history-index`, `release-pr-flow-real-tauri`, `ai-platform-readiness-audit`, `final-bug-review-cleanup`
- "PDF export hangs in advanced mode." -> `project-history-index`, `pdf-export-stability`, `export-customization-implementation`
- "This feature exists but users still can't benefit from it; redesign the UX." -> `project-history-index`, `feature-ux-value-redesign`
- "Validate responsiveness across chat and settings." -> `project-history-index`, `ui-responsiveness-validation`
