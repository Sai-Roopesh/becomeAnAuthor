/**
 * Tauri Invoke Mock
 * 
 * Provides a centralized mock for @tauri-apps/api/core invoke function.
 * Use this to simulate Rust backend responses in tests.
 * 
 * @example
 * ```ts
 * import { mockInvokeHandlers, resetMocks } from '@/test/mocks/tauri-invoke.mock';
 * 
 * beforeEach(() => {
 *     resetMocks();
 *     mockInvokeHandlers.set('list_projects', () => [
 *         { id: '1', title: 'Test Project' }
 *     ]);
 * });
 * ```
 */

import { vi } from 'vitest';

// Registry for mock handlers
export const mockInvokeHandlers = new Map<string, (args?: Record<string, unknown>) => unknown>();

// Default responses for common commands
const defaultHandlers: Record<string, (args?: Record<string, unknown>) => unknown> = {
    get_app_info: () => ({
        name: 'Become An Author',
        version: '0.1.0',
        platform: 'test',
        arch: 'x64',
    }),
    get_projects_path: () => '/mock/projects',
    list_projects: () => [],
    get_structure: () => [],
    list_codex_entries: () => [],
    list_chat_threads: () => [],
    list_snippets: () => [],
    list_analyses: () => [],
};

/**
 * Mock implementation of Tauri's invoke function
 */
export const mockInvoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
    // Check for registered handler
    const handler = mockInvokeHandlers.get(command);
    if (handler) {
        return handler(args);
    }
    
    // Check for default handler
    const defaultHandler = defaultHandlers[command];
    if (defaultHandler) {
        return defaultHandler(args);
    }
    
    // No handler found - throw error (helps catch missing mocks)
    throw new Error(`[MockInvoke] No mock registered for command: "${command}". Register with mockInvokeHandlers.set('${command}', handler)`);
});

/**
 * Reset all mocks and clear custom handlers
 */
export const resetMocks = () => {
    mockInvokeHandlers.clear();
    mockInvoke.mockClear();
};

/**
 * Setup the Tauri mock - call this in vitest.setup.ts or at top of test file
 */
export const setupTauriMock = () => {
    vi.mock('@tauri-apps/api/core', () => ({
        invoke: mockInvoke,
    }));
};
