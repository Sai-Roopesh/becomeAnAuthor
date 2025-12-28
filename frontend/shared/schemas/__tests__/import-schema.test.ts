/**
 * Import Schema Validation Specification Tests
 * 
 * SPECIFICATIONS (from implementation plan):
 * 1. Import MUST validate schema before modification
 * 2. Backup format MUST be versioned for forward compatibility
 * 3. MUST reject corrupted backup files
 * 4. MUST reject backups from incompatible versions
 * 5. MUST sanitize input to prevent XSS and injection
 */


import { describe, it, expect } from 'vitest';
import { ExportedProjectSchema } from '../import-schema';

// ============================================
// Test Fixtures
// ============================================

const createValidBackup = (overrides = {}) => ({
    version: 1,
    project: {
        id: 'proj-123',
        title: 'My Novel',
        description: 'A story about...',
        author: 'Jane Author',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        archived: false,
    },
    nodes: [],
    codex: [],
    ...overrides,
});

const createValidScene = (overrides = {}) => ({
    id: 'scene-1',
    projectId: 'proj-123',
    parentId: 'chapter-1',
    type: 'scene' as const,
    title: 'Opening Scene',
    order: 0,
    expanded: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
    },
    ...overrides,
});

const createValidChapter = (overrides = {}) => ({
    id: 'chapter-1',
    projectId: 'proj-123',
    parentId: null,
    type: 'chapter' as const,
    title: 'Chapter One',
    order: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
});

const createValidCodexEntry = (overrides = {}) => ({
    id: 'char-1',
    projectId: 'proj-123',
    name: 'Alice',
    category: 'character',
    description: 'The protagonist',
    aliases: ['Al'],
    tags: ['main', 'hero'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
});

// ============================================
// Specification Tests
// ============================================

describe('Import Schema Validation Contract', () => {
    // ========================================
    // SPECIFICATION 1: Version Validation
    // ========================================

    describe('SPEC: Version - MUST validate backup format version', () => {
        it('MUST accept version 1 backups', () => {
            const backup = createValidBackup({ version: 1 });
            const result = ExportedProjectSchema.safeParse(backup);

            expect(result.success).toBe(true);
        });

        it('MUST reject unsupported version numbers', () => {
            const backup = createValidBackup({ version: 2 });
            const result = ExportedProjectSchema.safeParse(backup);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0]?.path).toContain('version');
            }
        });

        it('MUST reject missing version', () => {
            const backup = createValidBackup();
            const backupRecord = backup as unknown as Record<string, unknown>;
            delete backupRecord['version'];


            const result = ExportedProjectSchema.safeParse(backup);

            expect(result.success).toBe(false);
        });
    });

    // ========================================
    // SPECIFICATION 2: Project Validation
    // ========================================

    describe('SPEC: Project - MUST validate required project fields', () => {
        it('MUST require project title', () => {
            const backup = createValidBackup({
                project: { ...createValidBackup().project, title: '' },
            });

            const result = ExportedProjectSchema.safeParse(backup);

            expect(result.success).toBe(false);
        });

        it('MUST reject project title exceeding 200 characters', () => {
            const backup = createValidBackup({
                project: { ...createValidBackup().project, title: 'x'.repeat(201) },
            });

            const result = ExportedProjectSchema.safeParse(backup);

            expect(result.success).toBe(false);
        });

        it('MUST allow optional description up to 2000 characters', () => {
            const backup = createValidBackup({
                project: {
                    ...createValidBackup().project,
                    description: 'A'.repeat(2000)
                },
            });

            const result = ExportedProjectSchema.safeParse(backup);

            expect(result.success).toBe(true);
        });

        it('MUST reject description exceeding 2000 characters', () => {
            const backup = createValidBackup({
                project: {
                    ...createValidBackup().project,
                    description: 'A'.repeat(2001)
                },
            });

            const result = ExportedProjectSchema.safeParse(backup);

            expect(result.success).toBe(false);
        });
    });

    // ========================================
    // SPECIFICATION 3: Scene Validation
    // ========================================

    describe('SPEC: Scenes - MUST validate scene structure', () => {
        it('MUST accept valid scene nodes', () => {
            const backup = createValidBackup({
                nodes: [createValidScene()],
            });

            const result = ExportedProjectSchema.safeParse(backup);

            expect(result.success).toBe(true);
        });

        it('MUST require scene type field', () => {
            const invalidScene = createValidScene();
            const sceneRecord = invalidScene as unknown as Record<string, unknown>;
            delete sceneRecord['type'];

            const backup = createValidBackup({ nodes: [invalidScene] });
            const result = ExportedProjectSchema.safeParse(backup);

            expect(result.success).toBe(false);
        });

        it('MUST accept valid scene status values', () => {
            const statuses = ['draft', 'in-progress', 'complete', 'needs-revision'];

            for (const status of statuses) {
                const backup = createValidBackup({
                    nodes: [createValidScene({ status })],
                });
                const result = ExportedProjectSchema.safeParse(backup);
                expect(result.success).toBe(true);
            }
        });

        it('MUST reject invalid scene status values', () => {
            const backup = createValidBackup({
                nodes: [createValidScene({ status: 'invalid-status' })],
            });

            const result = ExportedProjectSchema.safeParse(backup);

            expect(result.success).toBe(false);
        });

        it('MUST accept scenes with Tiptap content', () => {
            const content = {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            { type: 'text', text: 'Hello world', marks: [{ type: 'bold' }] },
                        ],
                    },
                ],
            };

            const backup = createValidBackup({
                nodes: [createValidScene({ content })],
            });

            const result = ExportedProjectSchema.safeParse(backup);

            expect(result.success).toBe(true);
        });
    });

    // ========================================
    // SPECIFICATION 4: Document Node Validation
    // ========================================

    describe('SPEC: Chapters/Acts - MUST validate document nodes', () => {
        it('MUST accept valid chapter nodes', () => {
            const backup = createValidBackup({
                nodes: [createValidChapter()],
            });

            const result = ExportedProjectSchema.safeParse(backup);

            expect(result.success).toBe(true);
        });

        it('MUST accept act type nodes', () => {
            const act = createValidChapter({ type: 'act', id: 'act-1' });
            const backup = createValidBackup({ nodes: [act] });

            const result = ExportedProjectSchema.safeParse(backup);

            expect(result.success).toBe(true);
        });
    });

    // ========================================
    // SPECIFICATION 5: Codex Entry Validation
    // ========================================

    describe('SPEC: Codex - MUST validate codex entries', () => {
        it('MUST accept valid codex entries', () => {
            const backup = createValidBackup({
                codex: [createValidCodexEntry()],
            });

            const result = ExportedProjectSchema.safeParse(backup);

            expect(result.success).toBe(true);
        });

        it('MUST require codex entry name', () => {
            const entry = createValidCodexEntry({ name: '' });
            const backup = createValidBackup({ codex: [entry] });

            const result = ExportedProjectSchema.safeParse(backup);

            expect(result.success).toBe(false);
        });

        it('MUST reject codex name exceeding 200 characters', () => {
            const entry = createValidCodexEntry({ name: 'x'.repeat(201) });
            const backup = createValidBackup({ codex: [entry] });

            const result = ExportedProjectSchema.safeParse(backup);

            expect(result.success).toBe(false);
        });

        it('MUST reject description exceeding 10000 characters', () => {
            const entry = createValidCodexEntry({ description: 'x'.repeat(10001) });
            const backup = createValidBackup({ codex: [entry] });

            const result = ExportedProjectSchema.safeParse(backup);

            expect(result.success).toBe(false);
        });
    });

    // ========================================
    // SPECIFICATION 6: Malformed Data Rejection
    // ========================================

    describe('SPEC: Security - MUST reject malformed data', () => {
        it('MUST reject non-object input', () => {
            const result = ExportedProjectSchema.safeParse('not an object');

            expect(result.success).toBe(false);
        });

        it('MUST reject null input', () => {
            const result = ExportedProjectSchema.safeParse(null);

            expect(result.success).toBe(false);
        });

        it('MUST reject missing required fields', () => {
            const result = ExportedProjectSchema.safeParse({});

            expect(result.success).toBe(false);
        });

        it('MUST reject backup with missing project', () => {
            const result = ExportedProjectSchema.safeParse({
                version: 1,
                nodes: [],
                codex: [],
            });

            expect(result.success).toBe(false);
        });
    });

    // ========================================
    // SPECIFICATION 7: Optional Fields
    // ========================================

    describe('SPEC: Optional Data - MUST handle optional fields', () => {
        it('MUST accept backup without chats', () => {
            const backup = createValidBackup();
            const result = ExportedProjectSchema.safeParse(backup);

            expect(result.success).toBe(true);
        });

        it('MUST accept backup without snippets', () => {
            const backup = createValidBackup();
            const result = ExportedProjectSchema.safeParse(backup);

            expect(result.success).toBe(true);
        });

        it('MUST accept backup with all optional fields', () => {
            const backup = createValidBackup({
                chats: [
                    { id: 'chat-1', projectId: 'proj-123', createdAt: Date.now(), updatedAt: Date.now() },
                ],
                messages: [
                    { id: 'msg-1', threadId: 'chat-1', role: 'user', content: 'Hello', timestamp: Date.now() },
                ],
                snippets: [
                    { id: 'snip-1', projectId: 'proj-123', title: 'Snippet', createdAt: Date.now(), updatedAt: Date.now() },
                ],
            });

            const result = ExportedProjectSchema.safeParse(backup);

            expect(result.success).toBe(true);
        });
    });
});
