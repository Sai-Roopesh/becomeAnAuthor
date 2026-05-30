import { invoke as tauriInvoke, isTauri } from "@tauri-apps/api/core";

export class TauriNotAvailableError extends Error {
  constructor(command: string) {
    super(`Tauri not available (command: ${command})`);
    this.name = "TauriNotAvailableError";
  }
}

export function invoke<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (!isTauri()) {
    return Promise.reject(new TauriNotAvailableError(cmd));
  }
  return tauriInvoke<T>(cmd, args);
}
