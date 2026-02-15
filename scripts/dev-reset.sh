#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${CARGO_TARGET_DIR:-$ROOT_DIR/backend/target}"

bash "$ROOT_DIR/scripts/dev-doctor.sh"

rm -rf "$ROOT_DIR/.next"
rm -rf "$TARGET_DIR/debug/incremental"
rm -rf "$TARGET_DIR/debug/.fingerprint"

echo "[dev:reset] cleared .next and Rust incremental build caches"
