"use client";

import { useAppServices } from "@/infrastructure/di/AppContext";
import type { ICodexRepository } from "@/domain/repositories/ICodexRepository";

export function useCodexRepository(): ICodexRepository {
  const { codexRepository } = useAppServices();
  return codexRepository;
}
