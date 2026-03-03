"use client";

import { useAppServices } from "@/infrastructure/di/AppContext";
import type { ISnippetRepository } from "@/domain/repositories/ISnippetRepository";

export function useSnippetRepository(): ISnippetRepository {
  const { snippetRepository } = useAppServices();
  return snippetRepository;
}
