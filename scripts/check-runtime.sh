#!/usr/bin/env bash
set -euo pipefail

NODE_VERSION="$(node -p "process.versions.node")"
NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
NODE_MINOR="$(node -p "process.versions.node.split('.')[1]")"

if (( NODE_MAJOR < 20 )) || (( NODE_MAJOR >= 25 )) || { (( NODE_MAJOR == 20 )) && (( NODE_MINOR < 9 )); }; then
  echo "[runtime] Unsupported Node.js version: v$NODE_VERSION"
  echo "[runtime] Required: >=20.9.0 and <25"
  echo "[runtime] Recommended: Node 22 LTS"
  echo "[runtime] Example: nvm install 22 && nvm use 22"
  exit 1
fi
