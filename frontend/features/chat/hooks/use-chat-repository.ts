import { useAppServices } from "@/infrastructure/di/AppContext";
import type { IChatRepository } from "@/domain/repositories/IChatRepository";

export function useChatRepository(): IChatRepository {
  const { chatRepository } = useAppServices();
  return chatRepository;
}
