"use client";

import { useAppServices } from "@/infrastructure/di/AppContext";
import type { ICodexTemplateRepository } from "@/domain/repositories/ICodexTemplateRepository";

export function useCodexTemplateRepository(): ICodexTemplateRepository {
  const { codexTemplateRepository } = useAppServices();
  return codexTemplateRepository;
}
