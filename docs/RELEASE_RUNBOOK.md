# Release Runbook

This project now releases from **tags only** and does not push commits to `main` from GitHub Actions.

## 1. Prerequisites

Ensure local `pnpm` version matches `packageManager` in `package.json` (currently 10.29.2).

Set these repository secrets:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- `JULES_API_KEY` (for docs workflow only)
- Repository variable: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

Generate updater signing keys locally:

```bash
python scripts/generate-keys.py ~/.tauri/becomeAnAuthor.key
```

Then set `plugins.updater.pubkey` in `backend/tauri.conf.json` to the public key content, or provide `TAURI_UPDATER_PUBLIC_KEY` during build.

GitHub locations:

- Secrets: **Settings -> Secrets and variables -> Actions -> Secrets**
- Variables: **Settings -> Secrets and variables -> Actions -> Variables**

CLI equivalents:

```bash
gh secret set TAURI_SIGNING_PRIVATE_KEY --repo Sai-Roopesh/becomeAnAuthor < ~/.tauri/becomeAnAuthor.key
printf '%s' 'YOUR_KEY_PASSWORD' | gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD --repo Sai-Roopesh/becomeAnAuthor
gh variable set NEXT_PUBLIC_GOOGLE_CLIENT_ID --repo Sai-Roopesh/becomeAnAuthor --body "YOUR_CLIENT_ID.apps.googleusercontent.com"
```

## 2. Prepare a release

1. Update app version in:
   - `package.json`
   - `backend/tauri.conf.json`
   - `backend/Cargo.toml`
2. Merge to `main` via PR.
3. Create and push a tag that matches the version (with or without `v` prefix), for example:

```bash
git tag v0.0.1
# or
git tag 0.0.1
git push origin <tag>
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

Use a **Google OAuth Desktop App client ID** for `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (not the client secret).

## 6. App data location and clean first-run behavior

App data is stored in OS local app-data under the `BecomeAnAuthor` folder, separated by channel:

- dev: `dev`
- production release: `release-v1`

For local QA, if you want a fresh state each install, remove prior data folders before launching:

- macOS example: `~/Library/Application Support/BecomeAnAuthor/release-v1`

## 7. macOS "is damaged and can't be opened" troubleshooting

If macOS shows:

`"<App Name>" is damaged and can't be opened. You should move it to the Trash.`

check signature validity first:

```bash
codesign --verify --deep --strict --verbose=2 "/Applications/Become An Author.app"
```

If this fails on a user machine, use this temporary local workaround:

```bash
sudo codesign --force --deep --sign - "/Applications/Become An Author.app"
sudo xattr -dr com.apple.quarantine "/Applications/Become An Author.app"
open "/Applications/Become An Author.app"
```

Notes:

- This is a workaround for unsigned/not-notarized distribution and local signature issues.
- Proper production distribution still requires Developer ID signing and notarization.
