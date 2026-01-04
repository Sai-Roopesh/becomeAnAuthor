import { z } from 'zod';

/**
 * Project Validation Schema
 */
export const ProjectSchema = z.object({
    id: z.string().uuid(), // Auto-generated on create
    title: z.string()
        .min(1, 'Title is required')
        .max(200, 'Title must be less than 200 characters')
        .trim(),
    author: z.string()
        .max(100, 'Author name must be less than 100 characters')
        .trim()
        .optional(),
    seriesId: z.string().uuid().optional(),
    seriesIndex: z.string()
        .max(50, 'Series index must be less than 50 characters')
        .optional(),
    language: z.string()
        .max(50, 'Language must be less than 50 characters')
        .optional(),
    coverImage: z.string()
        .optional(), // Base64 or URL - validated elsewhere
    archived: z.boolean().optional(),
    createdAt: z.number().int().positive(),
    updatedAt: z.number().int().positive(),
});

export type ProjectInput = z.infer<typeof ProjectSchema>;

/**
 * Node Schemas (Act, Chapter, Scene)
 */
const BaseNodeSchema = z.object({
    id: z.string().uuid(),
    projectId: z.string().uuid('Invalid project ID'),
    parentId: z.string().uuid().nullable(),
    title: z.string()
        .min(1, 'Title is required')
        .max(200, 'Title must be less than 200 characters')
        .trim(),
    order: z.number(),
    expanded: z.boolean().optional().default(false),
    createdAt: z.number().int().positive(),
    updatedAt: z.number().int().positive(),
});

export const ActSchema = BaseNodeSchema.extend({
    type: z.literal('act'),
});

export const ChapterSchema = BaseNodeSchema.extend({
    type: z.literal('chapter'),
});

const BeatSchema = z.object({
    id: z.string().uuid(),
    text: z.string().max(500, 'Beat text too long'),
    isCompleted: z.boolean(),
});

export const SceneSchema = BaseNodeSchema.extend({
    type: z.literal('scene'),
    pov: z.string().max(100).optional(),
    subtitle: z.string().max(200).optional(),
    labels: z.array(z.string().max(50)).max(20, 'Too many labels').optional(),
    excludeFromAI: z.boolean().optional(),
    content: z.unknown(), // Tiptap JSON - validated separately by Tiptap editor
    summary: z.string().max(1000, 'Summary too long').optional().default(''),
    status: z.enum(['draft', 'revised', 'final']).default('draft'),
    wordCount: z.number().int().min(0).default(0),
    beats: z.array(BeatSchema).max(50, 'Too many beats').optional(),
});

export const DocumentNodeSchema = z.discriminatedUnion('type', [
    ActSchema,
    ChapterSchema,
    SceneSchema,
]);

export type ActInput = z.infer<typeof ActSchema>;
export type ChapterInput = z.infer<typeof ChapterSchema>;
export type SceneInput = z.infer<typeof SceneSchema>;
export type DocumentNodeInput = z.infer<typeof DocumentNodeSchema>;

/**
 * Codex Schemas
 */
export const CodexEntrySchema = z.object({
    id: z.string().uuid(),
    projectId: z.string().uuid('Invalid project ID'),
    name: z.string()
        .min(1, 'Name is required')
        .max(200, 'Name must be less than 200 characters')
        .trim(),
    aliases: z.array(z.string().max(100)).max(10, 'Too many aliases').default([]),
    category: z.enum(['character', 'location', 'item', 'lore', 'subplot']),
    description: z.string().max(5000, 'Description too long').default(''),
    attributes: z.record(z.string(), z.string()).default({}),
    tags: z.array(z.string().max(50)).max(20, 'Too many tags').default([]),
    references: z.array(z.string().uuid()).max(50, 'Too many references').default([]),
    image: z.string().optional(),
    thumbnail: z.string().optional(),
    customDetails: z.record(z.string(), z.unknown()).optional(),
    aiContext: z.enum(['always', 'detected', 'exclude', 'never']).optional(),
    trackMentions: z.boolean().optional(),
    notes: z.string().max(10000, 'Notes too long').optional(),
    externalLinks: z.array(z.string().url().or(z.string().max(500))).max(10, 'Too many links').optional(),
    settings: z.object({
        isGlobal: z.boolean().default(false),
        doNotTrack: z.boolean().default(false),
    }).default({ isGlobal: false, doNotTrack: false }),
    createdAt: z.number().int().positive(),
    updatedAt: z.number().int().positive(),
});

export type CodexEntryInput = z.infer<typeof CodexEntrySchema>;

/**
 * Snippet Schema
 */
export const SnippetSchema = z.object({
    id: z.string().uuid(),
    projectId: z.string().uuid('Invalid project ID'),
    title: z.string()
        .min(1, 'Title is required')
        .max(200, 'Title must be less than 200 characters')
        .trim(),
    content: z.unknown(), // Tiptap JSON - validated separately by Tiptap editor
    pinned: z.boolean().default(false),
    createdAt: z.number().int().positive(),
    updatedAt: z.number().int().positive(),
});

export type SnippetInput = z.infer<typeof SnippetSchema>;

/**
 * Chat Schemas
 */
export const ChatThreadSchema = z.object({
    id: z.string().uuid(),
    projectId: z.string().uuid('Invalid project ID'),
    name: z.string()
        .min(1, 'Name is required')
        .max(200, 'Name must be less than 200 characters')
        .trim(),
    pinned: z.boolean().default(false),
    archived: z.boolean().default(false),
    defaultPrompt: z.string().max(100).optional(),
    defaultModel: z.string().max(100).optional(),
    createdAt: z.number().int().positive(),
    updatedAt: z.number().int().positive(),
});

export const ChatContextSchema = z.object({
    novelText: z.union([
        z.literal('full'),
        z.literal('outline'),
        z.string().max(100),
    ]).optional(),
    acts: z.array(z.string().uuid()).max(50).optional(),
    chapters: z.array(z.string().uuid()).max(100).optional(),
    scenes: z.array(z.string().uuid()).max(500).optional(),
    snippets: z.array(z.string().uuid()).max(50).optional(),
    codexEntries: z.array(z.string().uuid()).max(100).optional(),
});

export const ChatMessageSchema = z.object({
    id: z.string().uuid(),
    threadId: z.string().uuid('Invalid thread ID'),
    role: z.enum(['user', 'assistant']),
    content: z.string()
        .min(1, 'Message content is required')
        .max(50000, 'Message too long'),
    model: z.string().max(100).optional(),
    prompt: z.string().max(100).optional(),
    context: ChatContextSchema.optional(),
    timestamp: z.number().int().positive(),
});

export type ChatThreadInput = z.infer<typeof ChatThreadSchema>;
export type ChatMessageInput = z.infer<typeof ChatMessageSchema>;
export type ChatContextInput = z.infer<typeof ChatContextSchema>;

/**
 * Helper function to validate and sanitize data
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
        return schema.parse(data);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const messages = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
            throw new Error(`Validation failed: ${messages}`);
        }
        throw error;
    }
}

/**
 * Safe parse version that returns { success, data, error }
 */
export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown) {
    return schema.safeParse(data);
}
