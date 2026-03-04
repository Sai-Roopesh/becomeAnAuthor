# Release Runbook

This project releases from **tags only** and does not push commits to `main` from GitHub Actions.

## 1. Prerequisites

Ensure local `pnpm` version matches `packageManager` in `package.json` (currently `10.29.2`).

Set these repository secrets/variables:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- `APPLE_SIGNING_IDENTITY` (required for signed macOS release builds)
- `JULES_API_KEY` (docs workflow only)
- Repository variable: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- Repository variable (only if required by your OAuth client): `NEXT_PUBLIC_GOOGLE_CLIENT_SECRET`

Generate updater signing keys locally:

```bash
python scripts/generate-keys.py ~/.tauri/becomeAnAuthor.key
```

Then set `plugins.updater.pubkey` in `backend/tauri.conf.json` to the public key content, or provide `TAURI_UPDATER_PUBLIC_KEY` during build.

GitHub locations:

- Secrets: **Settings -> Secrets and variables -> Actions -> Secrets**
- Variables: **Settings -> Secrets and variables -> Actions -> Variables**

## 2. Local Release Gates (Real Runtime Path)

Run these before tagging:

```bash
pnpm run release:gate
```

`release:gate` runs real release checks only:

- frontend lint + typecheck + production build
- rust `cargo check`, `cargo clippy`, and `cargo test`

It intentionally avoids Playwright/browser mocks as release gates.

## 3. Manual Tauri UAT (Required)

Run this in native runtime (`pnpm run tauri:dev`) against a clean release profile where possible.

1. Fresh launch from clean app data path.
2. Create series + novel, reopen app, confirm persistence.
3. Editor autosave survives restart.
4. Trash delete requires confirmation before deletion.
5. Restore/delete flows for deleted series records (verify deleted series are recreated when restoring a project).
6. Full snapshot backup/import (`full_snapshot` `.baa` SQL-native) restores valid data and triggers app relaunch.
7. Series package export/import (`series_package` `.baa` SQL-native) clones one series with all novels and codex graph.
8. Novel package export/import (`novel_package` `.baa` SQL-native) imports into selected existing/new target series.
9. Restored project chats still show archive/delete actions.
10. Chat lifecycle: archive -> restore -> move to deleted -> permanent delete.
11. DOCX export (basic + advanced options) produces valid file.
12. PDF export (advanced options) completes without hang/toast lock.
13. Primary codex link flow: select text in editor -> `Link to Codex` from selection bubble -> choose entry/role -> save/reload and verify link persists.
14. Context menu link flow: right-click selected text -> `Link to Codex` -> choose entry.
15. Slash flow: run `/link codex`, choose entry, and verify link + inline label insertion.
16. Export default prose integrity: DOCX/PDF/Markdown show clean linked text (for example `Kola`, not forced `@Kola`).
17. Export optional codex appendix: when enabled, output includes "Codex Link Appendix" section.
18. Section-aware export defaults: section headings appear as export headings (not raw editor markup).
19. Section TOC option: when enabled, TOC includes scene-section entries.
20. Section page-break option: page break rules apply per section type (`standard`, `chapter`, `part`, `appendix`).
21. Section filtering option: disabling "Include AI-excluded sections" removes `excludeFromAI` sections from export output.
22. Scene intelligence panel shows section warnings for untitled/empty/misordered sections.
23. Responsive checks across dashboard/project/chat/settings at narrow widths.
24. Google Drive connect, full snapshot backup, full snapshot restore, sign out.
25. In-app updater prompt/install/restart path from an older build.
26. Verify accessibility (aria-labels, keyboard nav) for key flows.
27. Verify editor click-to-focus and top rail alignment (main header aligned with sidebar and right panel headers).
28. Verify app starts cleanly and builds without missing dependency errors after recent dependency cleanups (March 4, 2026).

## 4. Prepare a Release

1. Update app version in:

- `package.json`
- `backend/tauri.conf.json`
- `backend/Cargo.toml`

2. Merge to `main` via PR.
3. Create and push a tag that matches the version (`vX.Y.Z` or `X.Y.Z`).

```bash
git tag v0.0.1
# or
git tag 0.0.1
git push origin <tag>
```

This triggers `.github/workflows/release.yml`.

## 5. Release Workflow Checks

The release workflow validates:

- tag/version alignment across version files
- updater signing secrets
- Google OAuth client ID format
- macOS signing identity for macOS matrix builds
- backend rust tests before asset publishing

## 6. Artifacts

The release workflow builds platform bundles and updater artifacts:

- macOS: `.dmg`
- Windows: installer package(s)
- Linux: platform package(s)
- updater metadata/signatures (`createUpdaterArtifacts: true`)

## 7. In-App Updates

The app checks for updates on startup and periodically while running.

- Users get an **Update now** action when a new version is available.
- After installation, users can restart via toast action.

Implementation entry point:

- `frontend/features/updater/components/UpdateNotifier.tsx`

## 8. Google Drive in Production

Desktop Google OAuth uses system browser + localhost callback and stores tokens in local app data (`.meta/google_oauth_store.json`).

Backend commands:

- `google_oauth_connect`
- `google_oauth_get_access_token`
- `google_oauth_get_user`
- `google_oauth_sign_out`

Use a **Google OAuth Desktop App client ID** for `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

Before any production release tag, verify Google Auth Platform state:

1. OAuth consent screen publishing status is **In production** (not Testing/Development).
2. App domain/privacy/support fields required by Google are completed for your app type.
3. Release account sign-in works without being manually added to test users.

If left in testing/development state, real-user sign-in is constrained and token behavior can differ from production.

## 9. App Data Location and Clean First-Run Behavior

App data is stored under `BecomeAnAuthor` with channel isolation:

- dev: `dev`
- production release: `release-v1`

For local QA fresh-state testing, remove previous release data before launch.

- macOS example: `~/Library/Application Support/BecomeAnAuthor/release-v1`

## 10. macOS Distribution Notes

Validate signature on shipped app:

```bash
codesign --verify --deep --strict --verbose=2 "/Applications/Become An Author.app"
```

Production macOS distribution still requires full Apple Developer signing/notarization setup.
