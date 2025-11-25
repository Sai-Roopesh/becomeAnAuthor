'use client';

import { createContext, useContext, ReactNode, useMemo } from 'react';
import { DexieNodeRepository } from '@/infrastructure/repositories/DexieNodeRepository';
import { DexieCodexRepository } from '@/infrastructure/repositories/DexieCodexRepository';
import { DexieChatRepository } from '@/infrastructure/repositories/DexieChatRepository';
import { DexieSnippetRepository } from '@/infrastructure/repositories/DexieSnippetRepository';
import type { INodeRepository } from '@/domain/repositories/INodeRepository';
import type { ICodexRepository } from '@/domain/repositories/ICodexRepository';
import type { IChatRepository } from '@/domain/repositories/IChatRepository';
import type { ISnippetRepository } from '@/domain/repositories/ISnippetRepository';
import type { IChatService } from '@/domain/services/IChatService';
import { DexieChatService } from '@/infrastructure/services/DexieChatService';
import type { IExportService } from '@/domain/services/IExportService';
import { DocumentExportService } from '@/infrastructure/services/DocumentExportService';

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
export function AppProvider({ children, services: customServices }: AppProviderProps) {
    // Create singleton instances (memoized to prevent recreation on re-renders)
    const services: AppServices = useMemo(() => {
        // Create repositories
        const nodeRepo = customServices?.nodeRepository ?? new DexieNodeRepository();
        const codexRepo = customServices?.codexRepository ?? new DexieCodexRepository();
        const chatRepo = customServices?.chatRepository ?? new DexieChatRepository();
        const snippetRepo = customServices?.snippetRepository ?? new DexieSnippetRepository();

        // Create services (with repository dependencies)
        const chatSvc = customServices?.chatService ?? new DexieChatService(
            nodeRepo,
            codexRepo,
            chatRepo
        );

        const exportSvc = customServices?.exportService ?? new DocumentExportService(
            nodeRepo
        );

        return {
            nodeRepository: nodeRepo,
            codexRepository: codexRepo,
            chatRepository: chatRepo,
            snippetRepository: snippetRepo,
            chatService: chatSvc,
            exportService: exportSvc,
        };
    }, [customServices]);

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
