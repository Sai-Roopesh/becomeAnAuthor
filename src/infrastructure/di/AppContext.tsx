'use client';

import { createContext, useContext, ReactNode, useMemo, useEffect, useRef } from 'react';
import { DexieNodeRepository } from '@/infrastructure/repositories/DexieNodeRepository';
import { DexieCodexRepository } from '@/infrastructure/repositories/DexieCodexRepository';
import { DexieChatRepository } from '@/infrastructure/repositories/DexieChatRepository';
import { DexieSnippetRepository } from '@/infrastructure/repositories/DexieSnippetRepository';
import { DexieProjectRepository } from '@/infrastructure/repositories/DexieProjectRepository';
import { DexieCodexRelationRepository } from '@/infrastructure/repositories/DexieCodexRelationRepository';
import { DexieCodexTagRepository } from '@/infrastructure/repositories/DexieCodexTagRepository'; // NEW: Phase 1
import { DexieCodexTemplateRepository } from '@/infrastructure/repositories/DexieCodexTemplateRepository'; // NEW: Phase 1
import { DexieCodexRelationTypeRepository } from '@/infrastructure/repositories/DexieCodexRelationTypeRepository'; // NEW: Phase 1
import type { INodeRepository } from '@/domain/repositories/INodeRepository';
import type { ICodexRepository } from '@/domain/repositories/ICodexRepository';
import type { IChatRepository } from '@/domain/repositories/IChatRepository';
import type { ISnippetRepository } from '@/domain/repositories/ISnippetRepository';
import type { IProjectRepository } from '@/domain/repositories/IProjectRepository';
import type { ICodexRelationRepository } from '@/domain/repositories/ICodexRelationRepository';
import type { ICodexTagRepository } from '@/domain/repositories/ICodexTagRepository'; // NEW: Phase 1
import type { ICodexTemplateRepository } from '@/domain/repositories/ICodexTemplateRepository'; // NEW: Phase 1
import type { ICodexRelationTypeRepository } from '@/domain/repositories/ICodexRelationTypeRepository'; // NEW: Phase 1
import type { IChatService } from '@/domain/services/IChatService';
import { DexieChatService } from '@/infrastructure/services/DexieChatService';
import type { IExportService } from '@/domain/services/IExportService';
import { DocumentExportService } from '@/infrastructure/services/DocumentExportService';
import type { IAnalysisRepository } from '@/domain/repositories/IAnalysisRepository';
import { DexieAnalysisRepository } from '@/infrastructure/repositories/DexieAnalysisRepository';
import type { IAnalysisService } from '@/domain/services/IAnalysisService';
import { AnalysisService } from '@/infrastructure/services/AnalysisService';

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
    analysisRepository: IAnalysisRepository;
    codexRelationRepository: ICodexRelationRepository;
    // NEW: Phase 1 Codex enhancements
    codexTagRepository: ICodexTagRepository;
    codexTemplateRepository: ICodexTemplateRepository;
    codexRelationTypeRepository: ICodexRelationTypeRepository;

    // Services
    chatService: IChatService;
    exportService: IExportService;
    analysisService: IAnalysisService;
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
export function AppProvider({ children, services: customServices }: AppProviderProps) {
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
                    return (instance as any)[prop];
                },
                // Support method binding
                apply(_, thisArg, args) {
                    if (!instance) {
                        instance = factory();
                    }
                    return Reflect.apply(instance as any, thisArg, args);
                }
            });
        };

        // Create lazy repositories (instantiated on first use)
        const nodeRepo = customServices?.nodeRepository ??
            createLazy(() => new DexieNodeRepository());
        const codexRepo = customServices?.codexRepository ??
            createLazy(() => new DexieCodexRepository());
        const chatRepo = customServices?.chatRepository ??
            createLazy(() => new DexieChatRepository());
        const snippetRepo = customServices?.snippetRepository ??
            createLazy(() => new DexieSnippetRepository());
        const projectRepo = customServices?.projectRepository ??
            createLazy(() => new DexieProjectRepository());
        const codexRelationRepo = customServices?.codexRelationRepository ??
            createLazy(() => new DexieCodexRelationRepository());
        const codexTagRepo = customServices?.codexTagRepository ??
            createLazy(() => new DexieCodexTagRepository());
        const codexTemplateRepo = customServices?.codexTemplateRepository ??
            createLazy(() => new DexieCodexTemplateRepository());
        const codexRelationTypeRepo = customServices?.codexRelationTypeRepository ??
            createLazy(() => new DexieCodexRelationTypeRepository());
        const analysisRepo = customServices?.analysisRepository ??
            createLazy(() => new DexieAnalysisRepository());

        // Services still need eager instantiation as they're commonly used
        // But they use lazy repos internally
        const chatSvc = customServices?.chatService ?? new DexieChatService(
            nodeRepo,
            codexRepo,
            chatRepo
        );

        const exportSvc = customServices?.exportService ?? new DocumentExportService(
            nodeRepo
        );

        const analysisSvc = customServices?.analysisService ?? new AnalysisService(
            nodeRepo,
            codexRepo,
            analysisRepo
        );

        return {
            nodeRepository: nodeRepo,
            codexRepository: codexRepo,
            chatRepository: chatRepo,
            snippetRepository: snippetRepo,
            projectRepository: projectRepo,
            analysisRepository: analysisRepo,
            codexRelationRepository: codexRelationRepo,
            codexTagRepository: codexTagRepo,
            codexTemplateRepository: codexTemplateRepo,
            codexRelationTypeRepository: codexRelationTypeRepo,
            chatService: chatSvc,
            exportService: exportSvc,
            analysisService: analysisSvc,
        };
    }, [customServices]);

    // ✅ NEW: Use CodexSeedService with localStorage-based completion tracking
    // This prevents re-seeding on HMR (Hot Module Replacement) during development
    const seedingRef = useRef(false);

    useEffect(() => {
        if (!seedingRef.current) {
            seedingRef.current = true;

            // Import dynamically to avoid circular dependencies
            import('@/infrastructure/services/CodexSeedService').then(({ codexSeedService }) => {
                codexSeedService.seed().catch((error) => {
                    console.error('Failed to seed codex data:', error);
                });
            });
        }
    }, []);

    return (
        <AppContext.Provider value={services}>
            {children}
        </AppContext.Provider>
    );
}

/**
 * Hook to access all application services
 * @throws Error if used outside AppProvider
 */
export function useAppServices(): AppServices {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppServices must be used within AppProvider');
    }
    return context;
}
