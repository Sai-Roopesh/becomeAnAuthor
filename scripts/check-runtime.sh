#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

node <<'NODE'
const fs = require('fs');
const path = require('path');

const pkgPath = path.join(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const range = pkg.engines?.node;
const version = process.versions.node;

const match = /^>=([0-9]+)\.([0-9]+)\.([0-9]+)\s*<([0-9]+)$/.exec(range || '');
if (!match) {
  console.error(`[runtime] Unsupported engines.node format: ${range ?? 'missing'}`);
  process.exit(1);
}

const [major, minor, patch] = version.split('.').map(Number);
const min = { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
const maxMajor = Number(match[4]);

const atLeastMin =
  major > min.major ||
  (major === min.major && minor > min.minor) ||
  (major === min.major && minor === min.minor && patch >= min.patch);

const belowMax = major < maxMajor;

if (!atLeastMin || !belowMax) {
  console.error(`[runtime] Unsupported Node.js version: v${version}`);
  console.error(`[runtime] Required: ${range}`);
  console.error('[runtime] Recommended: Node 22 LTS');
  console.error('[runtime] Example: nvm install 22 && nvm use 22');
  process.exit(1);
}
NODE
