/**
 * EditorStateManager Specification Tests
 * 
 * Following Test-Driven Development (TDD):
 * Tests written BEFORE implementation to define expected behavior.
 * 
 * SPECIFICATIONS:
 * 1. MUST mark dirty on editor update events
 * 2. MUST debounce saves to 500ms (configurable)
 * 3. MUST provide immediate save method (bypasses debounce)
 * 4. MUST track save status (saved, saving, unsaved, error)
 * 5. MUST notify listeners of status changes
 * 6. MUST create emergency backup on save failure
 * 7. MUST cancel pending debounced saves when immediate save called
 * 8. MUST use SaveCoordinator for actual save operations
 * 9. MUST cleanup listeners on destroy
 * 10. MUST expose current status via getStatus()
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Editor } from '@tiptap/react';

// ============================================
// Mock Dependencies BEFORE importing
// ============================================

const mockScheduleSave = vi.fn();
vi.mock('@/lib/core/save-coordinator', () => ({
    saveCoordinator: {
        scheduleSave: (...args: unknown[]) => mockScheduleSave(...args),
    },
}));

const mockSaveBackup = vi.fn();
vi.mock('@/infrastructure/services/emergency-backup-service', () => ({
    emergencyBackupService: {
        saveBackup: (...args: unknown[]) => mockSaveBackup(...args),
    },
}));

vi.mock('@/shared/utils/logger', () => ({
    logger: {
        scope: () => ({
            debug: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
        }),
    },
}));

// Import after mocks
import { EditorStateManager } from '../editor-state-manager';
import type { SaveStatus } from '../editor-state-manager';

// ============================================
// Mock Editor Factory
// ============================================

function createMockEditor(options: {
    content?: object;
    isDestroyed?: boolean;
} = {}) {
    const handlers: Map<string, Function[]> = new Map();

    return {
        getJSON: vi.fn().mockReturnValue(options.content ?? { type: 'doc', content: [] }),
        isDestroyed: options.isDestroyed ?? false,
        on: vi.fn((event: string, handler: Function) => {
            const existing = handlers.get(event) || [];
            handlers.set(event, [...existing, handler]);
        }),
        off: vi.fn((event: string, handler: Function) => {
            const existing = handlers.get(event) || [];
            handlers.set(event, existing.filter(h => h !== handler));
        }),
        // Helper to trigger events in tests
        _emit: (event: string) => {
            handlers.get(event)?.forEach(h => h());
        },
        _handlers: handlers,
    };
}

// ============================================
// Specification Tests
// ============================================

describe('EditorStateManager Specifications', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        mockScheduleSave.mockResolvedValue(undefined);
        mockSaveBackup.mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // ========================================
    // SPEC 1: Dirty Flag Tracking
    // ========================================

    describe('SPEC: Dirty Flag - MUST mark dirty on editor update', () => {
        it('MUST mark dirty when editor emits update event', () => {
            const editor = createMockEditor();
            const manager = new EditorStateManager(editor as any, 'scene-123');

            // Initially clean
            expect(manager.getStatus().isDirty).toBe(false);
            expect(manager.getStatus().status).toBe('saved');

            // Trigger update
            editor._emit('update');

            // Now dirty
            expect(manager.getStatus().isDirty).toBe(true);
            expect(manager.getStatus().status).toBe('unsaved');

            manager.destroy();
        });

        it('MUST attach update listener on construction', () => {
            const editor = createMockEditor();

            new EditorStateManager(editor as any, 'scene-123');

            expect(editor.on).toHaveBeenCalledWith('update', expect.any(Function));
        });

        it('MUST NOT mark dirty multiple times for rapid updates', () => {
            const editor = createMockEditor();
            const manager = new EditorStateManager(editor as any, 'scene-123');

            editor._emit('update');
            editor._emit('update');
            editor._emit('update');

            // Should still be dirty (not multiple times)
            expect(manager.getStatus().isDirty).toBe(true);

            manager.destroy();
        });
    });

    // ========================================
    // SPEC 2: Debounced Saves
    // ========================================

    describe('SPEC: Debounced Saves - MUST wait 500ms before saving', () => {
        it('MUST debounce save after update event', async () => {
            const editor = createMockEditor();
            const manager = new EditorStateManager(editor as any, 'scene-123', { debounceMs: 500 });

            editor._emit('update');

            // Should NOT save immediately
            expect(mockScheduleSave).not.toHaveBeenCalled();

            // Advance 250ms - still should not save
            await vi.advanceTimersByTimeAsync(250);
            expect(mockScheduleSave).not.toHaveBeenCalled();

            // Advance to 500ms - NOW should save
            await vi.advanceTimersByTimeAsync(250);
            await vi.runAllTimersAsync();

            expect(mockScheduleSave).toHaveBeenCalledTimes(1);
            expect(mockScheduleSave).toHaveBeenCalledWith('scene-123', expect.any(Function));

            manager.destroy();
        });

        it('MUST coalesce multiple rapid updates into single save', async () => {
            const editor = createMockEditor();
            const manager = new EditorStateManager(editor as any, 'scene-123', { debounceMs: 500 });

            // Rapid updates
            editor._emit('update');
            await vi.advanceTimersByTimeAsync(100);
            editor._emit('update');
            await vi.advanceTimersByTimeAsync(100);
            editor._emit('update');

            // Wait for debounce
            await vi.advanceTimersByTimeAsync(500);
            await vi.runAllTimersAsync();

            // Should only save once
            expect(mockScheduleSave).toHaveBeenCalledTimes(1);

            manager.destroy();
        });

        it('MUST allow custom debounce time', async () => {
            const editor = createMockEditor();
            const manager = new EditorStateManager(editor as any, 'scene-123', { debounceMs: 1000 });

            editor._emit('update');

            await vi.advanceTimersByTimeAsync(500);
            expect(mockScheduleSave).not.toHaveBeenCalled();

            await vi.advanceTimersByTimeAsync(500);
            await vi.runAllTimersAsync();

            expect(mockScheduleSave).toHaveBeenCalledTimes(1);

            manager.destroy();
        });
    });

    // ========================================
    // SPEC 3: Immediate Save
    // ========================================

    describe('SPEC: Immediate Save - MUST bypass debounce', () => {
        it('MUST save immediately without waiting for debounce', async () => {
            const editor = createMockEditor();
            const manager = new EditorStateManager(editor as any, 'scene-123', { debounceMs: 500 });

            editor._emit('update');

            // Call immediate save
            await manager.saveImmediate();

            // Should save immediately (no debounce wait)
            expect(mockScheduleSave).toHaveBeenCalledTimes(1);

            manager.destroy();
        });

        it('MUST cancel pending debounced save when immediate save called', async () => {
            const editor = createMockEditor();
            const manager = new EditorStateManager(editor as any, 'scene-123', { debounceMs: 500 });

            editor._emit('update');

            // Call immediate save before debounce completes
            await manager.saveImmediate();

            // Advance past debounce time
            await vi.advanceTimersByTimeAsync(500);
            await vi.runAllTimersAsync();

            // Should only have saved once (immediate), not twice
            expect(mockScheduleSave).toHaveBeenCalledTimes(1);

            manager.destroy();
        });

        it('MUST NOT save if already clean', async () => {
            const editor = createMockEditor();
            const manager = new EditorStateManager(editor as any, 'scene-123');

            // Don't trigger update (stay clean)
            await manager.saveImmediate();

            // Should not save (nothing to save)
            expect(mockScheduleSave).not.toHaveBeenCalled();

            manager.destroy();
        });

        it('MUST NOT save if already saving', async () => {
            const editor = createMockEditor();
            const manager = new EditorStateManager(editor as any, 'scene-123');

            // Make it block on first save
            let resolveFirstSave: () => void;
            const firstSavePromise = new Promise<void>(resolve => {
                resolveFirstSave = resolve;
            });
            mockScheduleSave.mockReturnValueOnce(firstSavePromise);

            editor._emit('update');

            // Start first save (will block)
            const firstSave = manager.saveImmediate();

            // Try to save again while first is in progress
            await manager.saveImmediate();

            // Should only call once
            expect(mockScheduleSave).toHaveBeenCalledTimes(1);

            // Resolve first save
            resolveFirstSave!();
            await firstSave;

            manager.destroy();
        });
    });

    // ========================================
    // SPEC 4: Save Status Tracking
    // ========================================

    describe('SPEC: Status Tracking - MUST track save status', () => {
        it('MUST start with "saved" status', () => {
            const editor = createMockEditor();
            const manager = new EditorStateManager(editor as any, 'scene-123');

            const status = manager.getStatus();
            expect(status.status).toBe('saved');
            expect(status.isDirty).toBe(false);
            expect(status.isSaving).toBe(false);
            expect(status.lastSavedAt).toBe(null);

            manager.destroy();
        });

        it('MUST change to "unsaved" when dirty', () => {
            const editor = createMockEditor();
            const manager = new EditorStateManager(editor as any, 'scene-123');

            editor._emit('update');

            expect(manager.getStatus().status).toBe('unsaved');

            manager.destroy();
        });

        it('MUST change to "saving" during save', async () => {
            const editor = createMockEditor();
            const manager = new EditorStateManager(editor as any, 'scene-123');

            // Block save
            let resolveSave: () => void;
            const savePromise = new Promise<void>(resolve => {
                resolveSave = resolve;
            });
            mockScheduleSave.mockReturnValueOnce(savePromise);

            editor._emit('update');
            const save = manager.saveImmediate();

            // Check status during save
            expect(manager.getStatus().status).toBe('saving');
            expect(manager.getStatus().isSaving).toBe(true);

            resolveSave!();
            await save;

            manager.destroy();
        });

        it('MUST change to "saved" after successful save', async () => {
            const editor = createMockEditor();
            const manager = new EditorStateManager(editor as any, 'scene-123');

            editor._emit('update');
            await manager.saveImmediate();

            const status = manager.getStatus();
            expect(status.status).toBe('saved');
            expect(status.isDirty).toBe(false);
            expect(status.isSaving).toBe(false);
            expect(status.lastSavedAt).toBeGreaterThan(0);

            manager.destroy();
        });

        it('MUST change to "error" on save failure', async () => {
            const editor = createMockEditor();
            const manager = new EditorStateManager(editor as any, 'scene-123');

            mockScheduleSave.mockRejectedValueOnce(new Error('Save failed'));

            editor._emit('update');

            try {
                await manager.saveImmediate();
            } catch {
                // Expected to throw
            }

            expect(manager.getStatus().status).toBe('error');

            manager.destroy();
        });
    });

    // ========================================
    // SPEC 5: Status Listeners
    // ========================================

    describe('SPEC: Status Listeners - MUST notify on status change', () => {
        it('MUST call listener immediately with current status on subscribe', () => {
            const editor = createMockEditor();
            const manager = new EditorStateManager(editor as any, 'scene-123');

            const listener = vi.fn();
            manager.onStatusChange(listener);

            // Should be called immediately
            expect(listener).toHaveBeenCalledWith('saved', undefined);

            manager.destroy();
        });

        it('MUST notify listener when status changes to unsaved', () => {
            const editor = createMockEditor();
            const manager = new EditorStateManager(editor as any, 'scene-123');

            const listener = vi.fn();
            manager.onStatusChange(listener);

            vi.clearAllMocks();

            editor._emit('update');

            expect(listener).toHaveBeenCalledWith('unsaved', undefined);

            manager.destroy();
        });

        it('MUST notify listener when status changes to saved', async () => {
            const editor = createMockEditor();
            const manager = new EditorStateManager(editor as any, 'scene-123');

            const listener = vi.fn();
            manager.onStatusChange(listener);

            editor._emit('update');
            vi.clearAllMocks();

            await manager.saveImmediate();

            // Should notify with 'saved' and timestamp
            expect(listener).toHaveBeenCalledWith('saved', expect.any(Number));

            manager.destroy();
        });

        it('MUST support multiple listeners', () => {
            const editor = createMockEditor();
            const manager = new EditorStateManager(editor as any, 'scene-123');

            const listener1 = vi.fn();
            const listener2 = vi.fn();

            manager.onStatusChange(listener1);
            manager.onStatusChange(listener2);

            vi.clearAllMocks();

            editor._emit('update');

            expect(listener1).toHaveBeenCalledWith('unsaved', undefined);
            expect(listener2).toHaveBeenCalledWith('unsaved', undefined);

            manager.destroy();
        });

        it('MUST return unsubscribe function', () => {
            const editor = createMockEditor();
            const manager = new EditorStateManager(editor as any, 'scene-123');

            const listener = vi.fn();
            const unsubscribe = manager.onStatusChange(listener);

            expect(typeof unsubscribe).toBe('function');

            vi.clearAllMocks();
            unsubscribe();

            editor._emit('update');

            // Should not be called after unsubscribe
            expect(listener).not.toHaveBeenCalled();

            manager.destroy();
        });
    });

    // ========================================
    // SPEC 6: Emergency Backup
    // ========================================

    describe('SPEC: Emergency Backup - MUST create backup on save failure', () => {
        it('MUST create emergency backup when save fails', async () => {
            const editor = createMockEditor({ content: { type: 'doc', content: [{ type: 'paragraph' }] } });
            const manager = new EditorStateManager(editor as any, 'scene-123');

            mockScheduleSave.mockRejectedValueOnce(new Error('Network error'));

            editor._emit('update');

            try {
                await manager.saveImmediate();
            } catch {
                // Expected
            }

            expect(mockSaveBackup).toHaveBeenCalledWith(
                'scene-123',
                { type: 'doc', content: [{ type: 'paragraph' }] }
            );

            manager.destroy();
        });

        it('MUST still throw error after creating backup', async () => {
            const editor = createMockEditor();
            const manager = new EditorStateManager(editor as any, 'scene-123');

            const error = new Error('Save failed');
            mockScheduleSave.mockRejectedValueOnce(error);

            editor._emit('update');

            await expect(manager.saveImmediate()).rejects.toThrow('Save failed');

            manager.destroy();
        });
    });

    // ========================================
    // SPEC 7: SaveCoordinator Integration
    // ========================================

    describe('SPEC: SaveCoordinator - MUST use coordinator for saves', () => {
        it('MUST call saveCoordinator.scheduleSave with scene ID', async () => {
            const editor = createMockEditor();
            const manager = new EditorStateManager(editor as any, 'my-scene-456');

            editor._emit('update');
            await manager.saveImmediate();

            expect(mockScheduleSave).toHaveBeenCalledWith(
                'my-scene-456',
                expect.any(Function)
            );

            manager.destroy();
        });

        it('Content getter MUST return current editor JSON', async () => {
            const expectedContent = { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 } }] };
            const editor = createMockEditor({ content: expectedContent });
            const manager = new EditorStateManager(editor as any, 'scene-123');

            editor._emit('update');
            await manager.saveImmediate();

            const calls = mockScheduleSave.mock.calls[0] as [string, () => unknown];
            const contentGetter = calls[1];
            expect(contentGetter()).toEqual(expectedContent);

            manager.destroy();
        });
    });

    // ========================================
    // SPEC 8: Cleanup
    // ========================================

    describe('SPEC: Cleanup - MUST cleanup on destroy', () => {
        it('MUST detach editor listeners on destroy', () => {
            const editor = createMockEditor();
            const manager = new EditorStateManager(editor as any, 'scene-123');

            expect(editor.on).toHaveBeenCalled();

            manager.destroy();

            expect(editor.off).toHaveBeenCalledWith('update', expect.any(Function));
        });

        it('MUST clear debounce timer on destroy', async () => {
            const editor = createMockEditor();
            const manager = new EditorStateManager(editor as any, 'scene-123', { debounceMs: 500 });

            editor._emit('update');

            manager.destroy();

            // Advance past debounce time
            await vi.advanceTimersByTimeAsync(500);
            await vi.runAllTimersAsync();

            // Should not save (timer was cleared)
            expect(mockScheduleSave).not.toHaveBeenCalled();
        });

        it('MUST clear status listeners on destroy', () => {
            const editor = createMockEditor();
            const manager = new EditorStateManager(editor as any, 'scene-123');

            const listener = vi.fn();
            manager.onStatusChange(listener);

            manager.destroy();

            vi.clearAllMocks();

            // Try to trigger update (should not notify)
            editor._emit('update');

            expect(listener).not.toHaveBeenCalled();
        });
    });

    // ========================================
    // SPEC 9: Flush Method
    // ========================================

    describe('SPEC: Flush - MUST provide flush method', () => {
        it('flush() MUST be an alias for saveImmediate()', async () => {
            const editor = createMockEditor();
            const manager = new EditorStateManager(editor as any, 'scene-123');

            editor._emit('update');
            await manager.flush();

            expect(mockScheduleSave).toHaveBeenCalledTimes(1);

            manager.destroy();
        });
    });
});
