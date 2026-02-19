#!/usr/bin/env python3
"""
Generate updater signing keys using the official Tauri signer CLI.

Usage:
  python scripts/generate-keys.py [output_private_key_path]

Example:
  python scripts/generate-keys.py ~/.tauri/becomeAnAuthor.key
"""

from __future__ import annotations

import os
import shlex
import subprocess
import sys
from pathlib import Path


def main() -> int:
    target = (
        Path(sys.argv[1]).expanduser()
        if len(sys.argv) > 1
        else Path("~/.tauri/becomeAnAuthor.key").expanduser()
    )

    target.parent.mkdir(parents=True, exist_ok=True)

    cmd = ["pnpm", "tauri", "signer", "generate", "-w", str(target)]
    print("Running:", " ".join(shlex.quote(part) for part in cmd))

    try:
        subprocess.run(cmd, check=True)
    except FileNotFoundError:
        print("Error: pnpm is not installed or not in PATH.")
        return 1
    except subprocess.CalledProcessError as exc:
        print(f"Error: tauri signer command failed with exit code {exc.returncode}")
        return exc.returncode

    print("\nKeys generated successfully.")
    print(f"Private key: {target}")
    print(f"Public key:  {target}.pub")
    print(
        "\nNext steps:\n"
        "1. Set TAURI_SIGNING_PRIVATE_KEY and TAURI_SIGNING_PRIVATE_KEY_PASSWORD in GitHub secrets.\n"
        "2. Put the public key content into backend/tauri.conf.json plugins.updater.pubkey or TAURI_UPDATER_PUBLIC_KEY env."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
