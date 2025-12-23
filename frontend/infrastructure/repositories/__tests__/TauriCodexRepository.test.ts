/**
 * TauriCodexRepository Specification Tests
 * 
 * Tests define EXPECTED BEHAVIOR based on user requirements:
 * - Characters can have duplicate names (allowed)
 * - CANNOT delete codex entry if relations exist (blocking constraint)
 * - Categories must be valid enum values
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TauriCodexRepository } from '../TauriCodexRepository';
import type { CodexEntry, CodexCategory } from '@/domain/entities/types';

// ============================================
// Mock Dependencies
// ============================================

vi.mock('@/core/tauri', () => ({
    listCodexEntries: vi.fn(),
    saveCodexEntry: vi.fn(),
    deleteCodexEntry: vi.fn(),
}));

vi.mock('../TauriNodeRepository', () => ({
    TauriNodeRepository: {
        getInstance: () => ({
            getProjectPath: () => '/mock/project/path',
        }),
    },
}));

vi.mock('@/hooks/use-live-query', () => ({
    invalidateQueries: vi.fn(),
}));

import * as tauriCommands from '@/core/tauri';

// ============================================
// Test Fixtures
// ============================================

// Valid categories are singular: character, location, item, lore, subplot
const createMockCharacter = (overrides: Partial<CodexEntry> = {}): CodexEntry => ({
    id: 'char-1',
    projectId: 'project-1',
    name: 'Alice',
    category: 'character', // singular!
    aliases: [],
    description: 'Main protagonist',
    attributes: {},
    tags: [],
    references: [],
    settings: { isGlobal: false, doNotTrack: false },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
});

// ============================================
// Specification Tests
// ============================================

describe('TauriCodexRepository Contract', () => {
    let repo: TauriCodexRepository;

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new TauriCodexRepository();
    });

    // ========================================
    // SPECIFICATION: Category Validation
    // ========================================

    describe('Category Constraints', () => {
        const VALID_CATEGORIES = ['characters', 'locations', 'items', 'lore', 'subplots'];

        it('MUST accept all valid category values', async () => {
            for (const category of VALID_CATEGORIES) {
                vi.mocked(tauriCommands.saveCodexEntry).mockResolvedValue(undefined);
                vi.mocked(tauriCommands.listCodexEntries).mockResolvedValue([]);

                const entry = await repo.create({
                    projectId: 'proj-1',
                    name: `Test ${category}`,
                    category: category as any,
                });

                expect(entry.category).toBe(category);
            }
        });

        it('MUST store entries in category-specific files', async () => {
            vi.mocked(tauriCommands.saveCodexEntry).mockResolvedValue(undefined);

            await repo.create({
                projectId: 'proj-1',
                name: 'A Location',
                category: 'locations',
            });

            // Verify saveCodexEntry was called with correct category in entry
            expect(tauriCommands.saveCodexEntry).toHaveBeenCalledWith(
                '/mock/project/path',
                expect.objectContaining({
                    category: 'locations',
                })
            );
        });
    });

    // ========================================
    // SPECIFICATION: Duplicate Names - ALLOWED
    // ========================================

    describe('Name Uniqueness - REQUIREMENT: Duplicate names ARE allowed', () => {
        it('MUST allow creating two characters with the same name', async () => {
            vi.mocked(tauriCommands.saveCodexEntry).mockResolvedValue(undefined);
            vi.mocked(tauriCommands.listCodexEntries).mockResolvedValue([
                createMockCharacter({ id: 'char-1', name: 'John' }),
            ]);

            // Create second character with same name - MUST succeed
            const secondJohn = await repo.create({
                projectId: 'proj-1',
                name: 'John', // Same name as existing
                category: 'characters',
            });

            expect(secondJohn.name).toBe('John');
            expect(tauriCommands.saveCodexEntry).toHaveBeenCalled();
        });

        it('MUST allow same name in different categories', async () => {
            vi.mocked(tauriCommands.saveCodexEntry).mockResolvedValue(undefined);

            // "London" as character (person named London)
            await repo.create({
                projectId: 'proj-1',
                name: 'London',
                category: 'characters',
            });

            // "London" as location - MUST also succeed
            await repo.create({
                projectId: 'proj-1',
                name: 'London',
                category: 'locations',
            });

            expect(tauriCommands.saveCodexEntry).toHaveBeenCalledTimes(2);
        });
    });

    // ========================================
    // SPECIFICATION: Search Behavior
    // ========================================

    describe('Search Contract', () => {
        it('MUST search case-insensitively', async () => {
            vi.mocked(tauriCommands.listCodexEntries).mockResolvedValue([
                createMockCharacter({ name: 'ALICE' }),
                createMockCharacter({ id: 'char-2', name: 'Bob' }),
            ]);

            const results = await repo.search('proj-1', 'alice');

            expect(results).toHaveLength(1);
            expect(results[0].name).toBe('ALICE');
        });

        it('MUST search in aliases as well as names', async () => {
            vi.mocked(tauriCommands.listCodexEntries).mockResolvedValue([
                createMockCharacter({
                    name: 'Elizabeth',
                    aliases: ['Liz', 'Beth', 'Lizzy'],
                }),
            ]);

            const results = await repo.search('proj-1', 'liz');

            expect(results).toHaveLength(1);
            expect(results[0].name).toBe('Elizabeth');
        });

        it('MUST return empty array for no matches', async () => {
            vi.mocked(tauriCommands.listCodexEntries).mockResolvedValue([
                createMockCharacter({ name: 'Alice' }),
            ]);

            const results = await repo.search('proj-1', 'xyz123');

            expect(results).toEqual([]);
        });
    });

    // ========================================
    // SPECIFICATION: Entry Retrieval
    // ========================================

    describe('Entry Retrieval Contract', () => {
        it('MUST return undefined for non-existent entry', async () => {
            vi.mocked(tauriCommands.listCodexEntries).mockResolvedValue([]);

            const result = await repo.get('non-existent-id');

            expect(result).toBeUndefined();
        });

        it('MUST filter by category when requested', async () => {
            const allEntries = [
                createMockCharacter({ id: 'char-1', category: 'characters' }),
                createMockCharacter({ id: 'loc-1', category: 'locations', name: 'Forest' }),
            ];

            vi.mocked(tauriCommands.listCodexEntries).mockImplementation(
                async (_path, category?) => {
                    if (category) {
                        return allEntries.filter(e => e.category === category);
                    }
                    return allEntries;
                }
            );

            const characters = await repo.getByCategory('proj-1', 'characters');
            const locations = await repo.getByCategory('proj-1', 'locations');

            expect(characters).toHaveLength(1);
            expect(locations).toHaveLength(1);
            expect(characters[0].category).toBe('characters');
            expect(locations[0].category).toBe('locations');
        });
    });

    // ========================================
    // SPECIFICATION: Update Behavior
    // ========================================

    describe('Update Contract', () => {
        it('MUST preserve existing fields when updating partially', async () => {
            const existingEntry = createMockCharacter({
                name: 'Alice',
                description: 'Original description',
                tags: ['protagonist', 'hero'],
            });

            vi.mocked(tauriCommands.listCodexEntries).mockResolvedValue([existingEntry]);
            vi.mocked(tauriCommands.saveCodexEntry).mockResolvedValue(undefined);

            // Update only the description
            await repo.update('char-1', { description: 'New description' });

            // SPECIFICATION: All other fields MUST be preserved
            expect(tauriCommands.saveCodexEntry).toHaveBeenCalledWith(
                '/mock/project/path',
                expect.objectContaining({
                    name: 'Alice', // Preserved
                    description: 'New description', // Updated
                    tags: ['protagonist', 'hero'], // Preserved
                })
            );
        });

        it('MUST update the updatedAt timestamp on every update', async () => {
            const oldTimestamp = Date.now() - 10000;
            const existingEntry = createMockCharacter({
                updatedAt: oldTimestamp,
            });

            vi.mocked(tauriCommands.listCodexEntries).mockResolvedValue([existingEntry]);
            vi.mocked(tauriCommands.saveCodexEntry).mockResolvedValue(undefined);

            await repo.update('char-1', { description: 'Changed' });

            const savedEntry = vi.mocked(tauriCommands.saveCodexEntry).mock.calls[0][1];
            expect(savedEntry.updatedAt).toBeGreaterThan(oldTimestamp);
        });
    });

    // ========================================
    // SPECIFICATION: Create Behavior
    // ========================================

    describe('Create Contract', () => {
        it('MUST generate a unique UUID for new entries', async () => {
            vi.mocked(tauriCommands.saveCodexEntry).mockResolvedValue(undefined);

            const entry = await repo.create({
                projectId: 'proj-1',
                name: 'New Character',
                category: 'characters',
            });

            // UUID format validation
            expect(entry.id).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            );
        });

        it('MUST set default values for optional fields', async () => {
            vi.mocked(tauriCommands.saveCodexEntry).mockResolvedValue(undefined);

            const entry = await repo.create({
                projectId: 'proj-1',
                name: 'Minimal Entry',
                category: 'items',
            });

            // SPECIFICATION: Defaults must be applied
            expect(entry.aliases).toEqual([]);
            expect(entry.description).toBe('');
            expect(entry.tags).toEqual([]);
            expect(entry.attributes).toEqual({});
            expect(entry.settings).toEqual({ isGlobal: false, doNotTrack: false });
        });

        it('MUST set createdAt and updatedAt to current time', async () => {
            const beforeCreate = Date.now();
            vi.mocked(tauriCommands.saveCodexEntry).mockResolvedValue(undefined);

            const entry = await repo.create({
                projectId: 'proj-1',
                name: 'Timed Entry',
                category: 'lore',
            });

            const afterCreate = Date.now();

            expect(entry.createdAt).toBeGreaterThanOrEqual(beforeCreate);
            expect(entry.createdAt).toBeLessThanOrEqual(afterCreate);
            expect(entry.updatedAt).toBe(entry.createdAt);
        });
    });

    // ========================================
    // SPECIFICATION: Error Handling
    // ========================================

    describe('Error Handling', () => {
        it('MUST throw when Rust command fails on create', async () => {
            vi.mocked(tauriCommands.saveCodexEntry).mockRejectedValue(
                new Error('Disk full')
            );

            await expect(
                repo.create({
                    projectId: 'proj-1',
                    name: 'Will Fail',
                    category: 'characters',
                })
            ).rejects.toThrow('Disk full');
        });

        it('MUST return empty array when listing fails', async () => {
            vi.mocked(tauriCommands.listCodexEntries).mockRejectedValue(
                new Error('Read error')
            );

            const result = await repo.getByProject('proj-1');

            // Graceful degradation - return empty, don't crash
            expect(result).toEqual([]);
        });
    });
});

// ========================================
// FUTURE: Relation Deletion Blocking
// ========================================

describe('Codex Deletion Constraints', () => {
    describe('REQUIREMENT: Cannot delete entry with existing relations', () => {
        it.todo('MUST throw error when attempting to delete entry with relations');
        it.todo('MUST list which entries have relations blocking deletion');
        it.todo('MUST allow deletion after all relations are removed');
    });
});
