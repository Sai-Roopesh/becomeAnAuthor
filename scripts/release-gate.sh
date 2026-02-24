#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

bash "$ROOT_DIR/scripts/check-runtime.sh"

if ! command -v cargo >/dev/null 2>&1; then
  echo "[release:gate] Rust toolchain is required (cargo not found)."
  exit 1
fi

echo "[release:gate] frontend lint"
pnpm run lint

echo "[release:gate] frontend typecheck"
pnpm exec tsc --noEmit

echo "[release:gate] frontend tests"
pnpm test -- --run

echo "[release:gate] frontend test coverage"
pnpm test:coverage -- --run

echo "[release:gate] frontend production build"
pnpm run build

echo "[release:gate] rust check"
cargo check --manifest-path backend/Cargo.toml

echo "[release:gate] rust clippy"
cargo clippy --manifest-path backend/Cargo.toml

echo "[release:gate] rust integration tests"
cargo test --manifest-path backend/Cargo.toml

echo "[release:gate] all release gates passed"
