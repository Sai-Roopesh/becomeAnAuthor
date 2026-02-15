import { useLiveQuery } from "@/hooks/use-live-query";
import { useAppServices } from "@/infrastructure/di/AppContext";

/**
 * Hook to get manuscript nodes for a project
 * Wraps the repository following clean architecture
 */
export function useManuscriptNodes(projectId: string | undefined) {
  const { nodeRepository } = useAppServices();

  const nodes = useLiveQuery(
    () =>
      projectId ? nodeRepository.getByProject(projectId) : Promise.resolve([]),
    [projectId, nodeRepository],
  );

  return nodes;
}
