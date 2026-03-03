"use client";

import { useAppServices } from "@/infrastructure/di/AppContext";
import type { INodeRepository } from "@/domain/repositories/INodeRepository";

export function useNodeRepository(): INodeRepository {
  const { nodeRepository } = useAppServices();
  return nodeRepository;
}
