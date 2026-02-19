# Release Runbook

This project now releases from **tags only** and does not push commits to `main` from GitHub Actions.

## 1. Prerequisites

Set these repository secrets:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- `JULES_API_KEY` (for docs workflow only)

Generate updater signing keys locally:

```bash
python scripts/generate-keys.py ~/.tauri/becomeAnAuthor.key
```

Then set `plugins.updater.pubkey` in `backend/tauri.conf.json` to the public key content, or provide `TAURI_UPDATER_PUBLIC_KEY` during build.

## 2. Prepare a release

1. Update app version in:
   - `package.json`
   - `backend/tauri.conf.json`
   - `backend/Cargo.toml`
2. Merge to `main` via PR.
3. Create and push a tag that matches the version, for example:

```bash
git tag v1.2.3
git push origin v1.2.3
```

This triggers `.github/workflows/release.yml`.

## 3. Artifacts

The release workflow builds platform bundles and updater artifacts:

- macOS: `.dmg`
- Windows: installer package(s)
- Linux: platform package(s)
- updater metadata/signatures (from `createUpdaterArtifacts: true`)

## 4. In-app updates

The app checks for updates on startup and periodically while running.

- If an update is available, users get a toast with an **Update now** action.
- After installation, users can restart from the toast action.

Implementation entry point:

- `frontend/features/updater/components/UpdateNotifier.tsx`

## 5. Google Drive in production

Desktop Google OAuth uses system browser + localhost callback and stores tokens in OS keychain.

Backend commands:

- `google_oauth_connect`
- `google_oauth_get_access_token`
- `google_oauth_get_user`
- `google_oauth_sign_out`

Use a **Google OAuth Desktop App client ID** for `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
