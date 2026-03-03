"use client";

import { useAppServices } from "@/infrastructure/di/AppContext";
import type { ISeriesRepository } from "@/domain/repositories/ISeriesRepository";

export function useSeriesRepository(): ISeriesRepository {
  const { seriesRepository } = useAppServices();
  return seriesRepository;
}
