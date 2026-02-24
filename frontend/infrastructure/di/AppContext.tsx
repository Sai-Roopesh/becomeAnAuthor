"use client";

import { createContext, useContext, ReactNode, useMemo } from "react";
// Tauri repositories for filesystem-based storage (desktop-only app)
import { TauriNodeRepository } from "@/infrastructure/repositories/TauriNodeRepository";
import { TauriProjectRepository } from "@/infrastructure/repositories/TauriProjectRepository";
import { TauriCodexRepository } from "@/infrastructure/repositories/TauriCodexRepository";
import { TauriSnippetRepository } from "@/infrastructure/repositories/TauriSnippetRepository";
import { TauriChatRepository } from "@/infrastructure/repositories/TauriChatRepository";
import { TauriCodexRelationRepository } from "@/infrastructure/repositories/TauriCodexRelationRepository";
import { TauriCodexTagRepository } from "@/infrastructure/repositories/TauriCodexTagRepository";
import { TauriCodexTemplateRepository } from "@/infrastructure/repositories/TauriCodexTemplateRepository";
import { TauriCodexRelationTypeRepository } from "@/infrastructure/repositories/TauriCodexRelationTypeRepository";
import { TauriSceneCodexLinkRepository } from "@/infrastructure/repositories/TauriSceneCodexLinkRepository";
import { TauriSeriesRepository } from "@/infrastructure/repositories/TauriSeriesRepository";
import { TauriSceneNoteRepository } from "@/infrastructure/repositories/TauriSceneNoteRepository";
// Repository interfaces
import type { INodeRepository } from "@/domain/repositories/INodeRepository";
import type { ICodexRepository } from "@/domain/repositories/ICodexRepository";
import type { IChatRepository } from "@/domain/repositories/IChatRepository";
import type { ISnippetRepository } from "@/domain/repositories/ISnippetRepository";
import type { IProjectRepository } from "@/domain/repositories/IProjectRepository";
import type { ICodexRelationRepository } from "@/domain/repositories/ICodexRelationRepository";
import type { ICodexTagRepository } from "@/domain/repositories/ICodexTagRepository";
import type { ICodexTemplateRepository } from "@/domain/repositories/ICodexTemplateRepository";
import type { ICodexRelationTypeRepository } from "@/domain/repositories/ICodexRelationTypeRepository";
import type { ISceneCodexLinkRepository } from "@/domain/repositories/ISceneCodexLinkRepository";
import type { ISeriesRepository } from "@/domain/repositories/ISeriesRepository";
import type { ISceneNoteRepository } from "@/domain/repositories/ISceneNoteRepository";
// Services
import type { IChatService } from "@/domain/services/IChatService";
import { ChatService } from "@/infrastructure/services/ChatService";
import type { IExportService } from "@/domain/services/IExportService";
import { DocumentExportService } from "@/infrastructure/services/DocumentExportService";

/**
 * Application-wide service container
 * Provides singleton instances of all repositories and services via React Context
 * Enables dependency injection for testability and consistency
 */
interface AppServices {
  // Repositories
  nodeRepository: INodeRepository;
  codexRepository: ICodexRepository;
  chatRepository: IChatRepository;
  snippetRepository: ISnippetRepository;
  projectRepository: IProjectRepository;
  codexRelationRepository: ICodexRelationRepository;
  // NEW: Phase 1 Codex enhancements
  codexTagRepository: ICodexTagRepository;
  codexTemplateRepository: ICodexTemplateRepository;
  codexRelationTypeRepository: ICodexRelationTypeRepository;
  // NEW: Plan-Codex integration
  sceneCodexLinkRepository: ISceneCodexLinkRepository;
  // NEW: Series management (GAP-2)
  seriesRepository: ISeriesRepository;
  sceneNoteRepository: ISceneNoteRepository;

  // Services
  chatService: IChatService;
  exportService: IExportService;
}

const AppContext = createContext<AppServices | null>(null);

interface AppProviderProps {
  children: ReactNode;
  // Optional: Allow injecting mock repositories for testing
  services?: Partial<AppServices>;
}

/**
 * Application Service Provider
 * Wraps the app and provides all repository instances
 *
 * @example
 * // In _app.tsx or layout.tsx:
 * <AppProvider>
 *   <YourApp />
 * </AppProvider>
 *
 * @example
 * // In tests with mocks:
 * <AppProvider services={{ nodeRepository: mockNodeRepo }}>
 *   <ComponentUnderTest />
 * </AppProvider>
 */
export function AppProvider({
  children,
  services: customServices,
}: AppProviderProps) {
  const services: AppServices = useMemo(() => {
    // Desktop-only app: wire one concrete Tauri implementation for each dependency.
    const nodeRepo =
      customServices?.nodeRepository ?? new TauriNodeRepository();
    const codexRepo =
      customServices?.codexRepository ?? new TauriCodexRepository();
    const chatRepo =
      customServices?.chatRepository ?? new TauriChatRepository();
    const snippetRepo =
      customServices?.snippetRepository ?? new TauriSnippetRepository();
    const projectRepo =
      customServices?.projectRepository ?? new TauriProjectRepository();
    const codexRelationRepo =
      customServices?.codexRelationRepository ??
      new TauriCodexRelationRepository();
    const codexTagRepo =
      customServices?.codexTagRepository ?? new TauriCodexTagRepository();
    const codexTemplateRepo =
      customServices?.codexTemplateRepository ??
      new TauriCodexTemplateRepository();
    const codexRelationTypeRepo =
      customServices?.codexRelationTypeRepository ??
      new TauriCodexRelationTypeRepository();
    const sceneCodexLinkRepo =
      customServices?.sceneCodexLinkRepository ??
      new TauriSceneCodexLinkRepository();
    const seriesRepo =
      customServices?.seriesRepository ?? new TauriSeriesRepository();
    const sceneNoteRepo =
      customServices?.sceneNoteRepository ?? new TauriSceneNoteRepository();

    const chatSvc =
      customServices?.chatService ??
      new ChatService(nodeRepo, codexRepo, chatRepo, projectRepo);

    const exportSvc =
      customServices?.exportService ?? new DocumentExportService(nodeRepo);

    return {
      nodeRepository: nodeRepo,
      codexRepository: codexRepo,
      chatRepository: chatRepo,
      snippetRepository: snippetRepo,
      projectRepository: projectRepo,
      codexRelationRepository: codexRelationRepo,
      codexTagRepository: codexTagRepo,
      codexTemplateRepository: codexTemplateRepo,
      codexRelationTypeRepository: codexRelationTypeRepo,
      sceneCodexLinkRepository: sceneCodexLinkRepo,
      seriesRepository: seriesRepo,
      sceneNoteRepository: sceneNoteRepo,
      chatService: chatSvc,
      exportService: exportSvc,
    };
  }, [customServices]);

  return <AppContext.Provider value={services}>{children}</AppContext.Provider>;
}

/**
 * Hook to access all application services
 * @throws Error if used outside AppProvider
 */
export function useAppServices(): AppServices {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppServices must be used within AppProvider");
  }
  return context;
}
