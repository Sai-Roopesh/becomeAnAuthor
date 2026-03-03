"use client";

import { useAppServices } from "@/infrastructure/di/AppContext";
import type { ISceneCodexLinkRepository } from "@/domain/repositories/ISceneCodexLinkRepository";

export function useSceneCodexLinkRepository(): ISceneCodexLinkRepository {
  const { sceneCodexLinkRepository } = useAppServices();
  return sceneCodexLinkRepository;
}
