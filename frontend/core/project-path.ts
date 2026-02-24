import { AppError } from "@/shared/errors/app-error";

let currentProjectPath: string | null = null;

export function setCurrentProjectPath(path: string | null): void {
  const normalized = path?.trim() ?? "";
  currentProjectPath = normalized.length > 0 ? normalized : null;
}

export function getCurrentProjectPath(): string | null {
  return currentProjectPath;
}

export function requireCurrentProjectPath(): string {
  const projectPath = getCurrentProjectPath();
  if (!projectPath) {
    throw new AppError("E_PROJECT_NOT_OPEN", "No project is currently open", {
      recoverable: true,
    });
  }
  return projectPath;
}
