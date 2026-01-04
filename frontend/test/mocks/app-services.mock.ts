/**
 * App Services Mock
 * 
 * Creates mock implementations of all repository and service interfaces.
 * Use this to mock the AppContext/useAppServices hook.
 * 
 * @example
 * ```ts
 * import { createMockServices, MockServices } from '@/test/mocks/app-services.mock';
 * 
 * vi.mock('@/infrastructure/di/AppContext', () => ({
 *     useAppServices: vi.fn(() => createMockServices()),
 * }));
 * ```
 */

import { vi } from 'vitest';

// Type for mock functions
type MockFn = ReturnType<typeof vi.fn>;

export interface MockNodeRepository {
    get: MockFn;
    getByProject: MockFn;
    getChildren: MockFn;
    create: MockFn;
    update: MockFn;
    save: MockFn;
    delete: MockFn;
    saveScene: MockFn;
}

export interface MockCodexRepository {
    list: MockFn;
    get: MockFn;
    save: MockFn;
    delete: MockFn;
}

export interface MockChatRepository {
    listThreads: MockFn;
    get: MockFn;
    createThread: MockFn;
    updateThread: MockFn;
    deleteThread: MockFn;
    getMessages: MockFn;
    createMessage: MockFn;
    deleteMessage: MockFn;
}

export interface MockSnippetRepository {
    list: MockFn;
    get: MockFn;
    save: MockFn;
    delete: MockFn;
}

export interface MockAnalysisService {
    runAnalysis: MockFn;
    estimateTokens: MockFn;
    listAnalyses: MockFn;
    saveAnalysis: MockFn;
    deleteAnalysis: MockFn;
}

export interface MockServices {
    nodeRepository: MockNodeRepository;
    codexRepository: MockCodexRepository;
    chatRepository: MockChatRepository;
    snippetRepository: MockSnippetRepository;
    analysisService: MockAnalysisService;
}

/**
 * Create fresh mock services instance
 * Call this in beforeEach to get clean mocks for each test
 */
export function createMockServices(): MockServices {
    return {
        nodeRepository: {
            get: vi.fn().mockResolvedValue(null),
            getByProject: vi.fn().mockResolvedValue([]),
            getChildren: vi.fn().mockResolvedValue([]),
            create: vi.fn().mockResolvedValue({ id: 'mock-id' }),
            update: vi.fn().mockResolvedValue(undefined),
            save: vi.fn().mockResolvedValue(undefined),
            delete: vi.fn().mockResolvedValue(undefined),
            saveScene: vi.fn().mockResolvedValue({ id: 'mock-id', wordCount: 0 }),
        },
        codexRepository: {
            list: vi.fn().mockResolvedValue([]),
            get: vi.fn().mockResolvedValue(null),
            save: vi.fn().mockResolvedValue(undefined),
            delete: vi.fn().mockResolvedValue(undefined),
        },
        chatRepository: {
            listThreads: vi.fn().mockResolvedValue([]),
            get: vi.fn().mockResolvedValue(null),
            createThread: vi.fn().mockResolvedValue({ id: 'thread-1' }),
            updateThread: vi.fn().mockResolvedValue(undefined),
            deleteThread: vi.fn().mockResolvedValue(undefined),
            getMessages: vi.fn().mockResolvedValue([]),
            createMessage: vi.fn().mockResolvedValue({ id: 'msg-1' }),
            deleteMessage: vi.fn().mockResolvedValue(undefined),
        },
        snippetRepository: {
            list: vi.fn().mockResolvedValue([]),
            get: vi.fn().mockResolvedValue(null),
            save: vi.fn().mockResolvedValue(undefined),
            delete: vi.fn().mockResolvedValue(undefined),
        },
        analysisService: {
            runAnalysis: vi.fn().mockResolvedValue([]),
            estimateTokens: vi.fn().mockResolvedValue(0),
            listAnalyses: vi.fn().mockResolvedValue([]),
            saveAnalysis: vi.fn().mockResolvedValue(undefined),
            deleteAnalysis: vi.fn().mockResolvedValue(undefined),
        },
    };
}

/**
 * Shared mock services instance
 * Use createMockServices() in beforeEach for isolation
 */
let sharedMockServices: MockServices | null = null;

export function getMockServices(): MockServices {
    if (!sharedMockServices) {
        sharedMockServices = createMockServices();
    }
    return sharedMockServices;
}

export function resetMockServices(): void {
    sharedMockServices = null;
}
