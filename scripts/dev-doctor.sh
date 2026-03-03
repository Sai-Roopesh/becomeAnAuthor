#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${CARGO_TARGET_DIR:-$ROOT_DIR/backend/target}"
LOCK_FILE="$TARGET_DIR/debug/.cargo-lock"
PORT=3000

QUIET="${1:-}"

log() {
  if [[ "$QUIET" != "--quiet" ]]; then
    echo "$1"
  fi
}

kill_pid() {
  local pid="$1"
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
  fi
}

is_project_cargo_pid() {
  local pid="$1"
  local cmd
  cmd="$(ps -p "$pid" -o command= 2>/dev/null || true)"
  [[ "$cmd" == *"$ROOT_DIR"* ]] && [[ "$cmd" == *"cargo"* ]]
}

log "[dev:doctor] scanning stale dev processes..."

while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  pid="${line%% *}"
  cmd="${line#* }"

  if [[ "$cmd" == *"next dev"* ]] || [[ "$cmd" == *"next-server (v"* ]]; then
    log "[dev:doctor] stopping Next PID $pid"
    kill_pid "$pid"
    continue
  fi

  if [[ "$cmd" == *"tauri.js dev"* ]] || [[ "$cmd" == *"pnpm run tauri:dev:raw"* ]] || [[ "$cmd" == *"tauri dev --"* ]]; then
    log "[dev:doctor] stopping Tauri PID $pid"
    kill_pid "$pid"
    continue
  fi

  if is_project_cargo_pid "$pid"; then
    log "[dev:doctor] stopping project cargo PID $pid"
    kill_pid "$pid"
  fi
done < <(ps ax -o pid= -o command=)

while IFS= read -r pid; do
  [[ -z "$pid" ]] && continue
  cmd="$(ps -p "$pid" -o command= 2>/dev/null || true)"
  if [[ "$cmd" == *"$ROOT_DIR"* ]]; then
    log "[dev:doctor] freeing :$PORT from PID $pid"
    kill_pid "$pid"
  fi
done < <(lsof -ti tcp:"$PORT" 2>/dev/null || true)

if [[ -f "$LOCK_FILE" ]]; then
  lock_holders="$(lsof -t "$LOCK_FILE" 2>/dev/null || true)"
  if [[ -n "$lock_holders" ]]; then
    while IFS= read -r pid; do
      [[ -z "$pid" ]] && continue
      if is_project_cargo_pid "$pid"; then
        log "[dev:doctor] releasing cargo lock via PID $pid"
        kill_pid "$pid"
      fi
    done <<< "$lock_holders"
  fi

  post_holders="$(lsof -t "$LOCK_FILE" 2>/dev/null || true)"
  if [[ -z "$post_holders" ]]; then
    rm -f "$LOCK_FILE"
    log "[dev:doctor] removed stale cargo lock file"
  fi
fi

log "[dev:doctor] done"
