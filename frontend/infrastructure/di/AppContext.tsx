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
import { TauriIdeaRepository } from "@/infrastructure/repositories/TauriIdeaRepository";
import { TauriSceneNoteRepository } from "@/infrastructure/repositories/TauriSceneNoteRepository";
import { TauriMapRepository } from "@/infrastructure/repositories/TauriMapRepository";
import { TauriWorldTimelineRepository } from "@/infrastructure/repositories/TauriWorldTimelineRepository";
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
import type { IIdeaRepository } from "@/domain/repositories/IIdeaRepository";
import type { ISceneNoteRepository } from "@/domain/repositories/ISceneNoteRepository";
import type { IMapRepository } from "@/domain/repositories/IMapRepository";
import type { IWorldTimelineRepository } from "@/domain/repositories/IWorldTimelineRepository";
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
  ideaRepository: IIdeaRepository;
  sceneNoteRepository: ISceneNoteRepository;
  mapRepository: IMapRepository;
  worldTimelineRepository: IWorldTimelineRepository;

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
  // Create singleton instances with LAZY initialization
  // Repositories are only created when first accessed, improving startup time
  const services: AppServices = useMemo(() => {
    // Lazy factory helper - creates instance only on first property access
    const createLazy = <T extends object>(factory: () => T): T => {
      let instance: T | null = null;
      return new Proxy({} as T, {
        get(_, prop: string | symbol) {
          if (!instance) {
            instance = factory();
          }
          return Reflect.get(instance as object, prop);
        },
      });
    };

    // All repositories use Tauri (filesystem-based) storage
    // IndexedDB fallback has been removed - this is now a desktop-only app
    // IMPORTANT: Use singleton for TauriNodeRepository so projectPath is consistent
    const nodeRepo =
      customServices?.nodeRepository ?? TauriNodeRepository.getInstance();
    const codexRepo =
      customServices?.codexRepository ??
      createLazy(() => new TauriCodexRepository());
    const chatRepo =
      customServices?.chatRepository ??
      createLazy(() => new TauriChatRepository());
    const snippetRepo =
      customServices?.snippetRepository ??
      createLazy(() => new TauriSnippetRepository());
    const projectRepo =
      customServices?.projectRepository ??
      createLazy(() => new TauriProjectRepository());
    const codexRelationRepo =
      customServices?.codexRelationRepository ??
      createLazy(() => new TauriCodexRelationRepository());
    const codexTagRepo =
      customServices?.codexTagRepository ??
      createLazy(() => new TauriCodexTagRepository());
    const codexTemplateRepo =
      customServices?.codexTemplateRepository ??
      createLazy(() => new TauriCodexTemplateRepository());
    const codexRelationTypeRepo =
      customServices?.codexRelationTypeRepository ??
      createLazy(() => new TauriCodexRelationTypeRepository());
    const sceneCodexLinkRepo =
      customServices?.sceneCodexLinkRepository ??
      createLazy(() => new TauriSceneCodexLinkRepository());
    const seriesRepo =
      customServices?.seriesRepository ??
      createLazy(() => new TauriSeriesRepository());
    const ideaRepo =
      customServices?.ideaRepository ??
      createLazy(() => new TauriIdeaRepository());
    const sceneNoteRepo =
      customServices?.sceneNoteRepository ??
      createLazy(() => new TauriSceneNoteRepository());
    const mapRepo =
      customServices?.mapRepository ??
      createLazy(() => new TauriMapRepository());
    const worldTimelineRepo =
      customServices?.worldTimelineRepository ??
      createLazy(() => new TauriWorldTimelineRepository());

    // Services still need eager instantiation as they're commonly used
    // But they use lazy repos internally
    const chatSvc =
      customServices?.chatService ??
      new ChatService(
        nodeRepo,
        codexRepo,
        chatRepo,
        projectRepo, // Series-first: needed for seriesId lookup
      );

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
      ideaRepository: ideaRepo,
      sceneNoteRepository: sceneNoteRepo,
      mapRepository: mapRepo,
      worldTimelineRepository: worldTimelineRepo,
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
