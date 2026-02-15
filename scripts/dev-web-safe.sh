#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

bash "$ROOT_DIR/scripts/check-runtime.sh"

cd "$ROOT_DIR"
exec node ./node_modules/next/dist/bin/next dev
