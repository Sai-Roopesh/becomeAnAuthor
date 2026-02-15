#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

bash "$ROOT_DIR/scripts/check-runtime.sh"

# Keep Rust build artifacts out of the project tree to avoid watcher/lock churn.
export CARGO_TARGET_DIR="${CARGO_TARGET_DIR:-$HOME/Library/Caches/become-an-author/target}"
mkdir -p "$CARGO_TARGET_DIR"

bash "$ROOT_DIR/scripts/dev-doctor.sh"

echo "[tauri:dev] launching clean dev session"
if [[ ! -x "$ROOT_DIR/node_modules/.bin/tauri" ]]; then
  echo "[tauri:dev] Missing local tauri CLI. Run: pnpm install"
  exit 1
fi

exec "$ROOT_DIR/node_modules/.bin/tauri" dev --no-dev-server-wait
