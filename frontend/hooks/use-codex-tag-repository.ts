"use client";

import { useAppServices } from "@/infrastructure/di/AppContext";
import type { ICodexTagRepository } from "@/domain/repositories/ICodexTagRepository";

export function useCodexTagRepository(): ICodexTagRepository {
  const { codexTagRepository } = useAppServices();
  return codexTagRepository;
}
