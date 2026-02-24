import {
  save as dialogSave,
  open as dialogOpen,
} from "@tauri-apps/plugin-dialog";
import type { OpenDialogOptions, SaveDialogOptions } from "./types";

export async function showSaveDialog(
  options?: SaveDialogOptions,
): Promise<string | null> {
  return dialogSave(options);
}

export async function showOpenDialog(
  options?: OpenDialogOptions,
): Promise<string | string[] | null> {
  return dialogOpen(options);
}
