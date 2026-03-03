"use client";

import { useAppServices } from "@/infrastructure/di/AppContext";
import type { ICodexRelationTypeRepository } from "@/domain/repositories/ICodexRelationTypeRepository";

export function useCodexRelationTypeRepository(): ICodexRelationTypeRepository {
  const { codexRelationTypeRepository } = useAppServices();
  return codexRelationTypeRepository;
}
