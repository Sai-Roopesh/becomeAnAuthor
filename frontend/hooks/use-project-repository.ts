"use client";

import { useAppServices } from "@/infrastructure/di/AppContext";
import type { IProjectRepository } from "@/domain/repositories/IProjectRepository";

export function useProjectRepository(): IProjectRepository {
  const { projectRepository } = useAppServices();
  return projectRepository;
}
