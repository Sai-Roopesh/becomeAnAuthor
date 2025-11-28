import { z } from 'zod';

/**
 * Validation schemas for import/export data
 * Prevents XSS, injection attacks, and data corruption from malicious import files
 */

// Tiptap content schema (basic validation)
const TiptapContentSchema: z.ZodType<any> = z.lazy(() =>
    z.object({
        type: z.string(),
        content: z.array(TiptapContentSchema).optional(),
        attrs: z.record(z.string(), z.any()).optional(),
        text: z.string().optional(),
        marks: z.array(z.any()).optional(),
    })
);

// Scene node schema
const SceneSchema = z.object({
    id: z.string(),
    projectId: z.string(),
    parentId: z.string().nullable(),
    type: z.literal('scene'),
    title: z.string().max(200),
    order: z.number(),
    expanded: z.boolean().optional(),
    content: TiptapContentSchema.optional(),
    summary: z.string().max(5000).optional(),
    status: z.enum(['draft', 'in-progress', 'complete', 'needs-revision']).optional(),
    wordCount: z.number().optional(),
    pov: z.string().max(100).optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
});

// Document node schema (Act/Chapter)
const DocumentNodeSchema = z.object({
    id: z.string(),
    projectId: z.string(),
    parentId: z.string().nullable(),
    type: z.enum(['act', 'chapter']),
    title: z.string().max(200),
    order: z.number(),
    expanded: z.boolean().optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
});

// Codex entry schema
const CodexEntrySchema = z.object({
    id: z.string(),
    projectId: z.string(),
    name: z.string().min(1).max(200),
    category: z.string(),
    description: z.string().max(10000).optional(),
    aliases: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    image: z.string().optional(),
    settings: z.any().optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
});

// Chat thread schema
const ChatThreadSchema = z.object({
    id: z.string(),
    projectId: z.string(),
    title: z.string().max(200).optional(),
    pinned: z.boolean().optional(),
    archived: z.boolean().optional(),
    defaultModel: z.string().optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
});

// Chat message schema
const ChatMessageSchema = z.object({
    id: z.string(),
    threadId: z.string(),
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    model: z.string().optional(),
    timestamp: z.number(),
});

// Snippet schema
const SnippetSchema = z.object({
    id: z.string(),
    projectId: z.string(),
    title: z.string().max(200),
    content: TiptapContentSchema.optional(),
    pinned: z.boolean().optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
});

// Exported project schema
export const ExportedProjectSchema = z.object({
    version: z.literal(1),
    project: z.object({
        id: z.string(),
        title: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        author: z.string().max(100).optional(),
        coverImage: z.string().optional(),
        createdAt: z.number(),
        updatedAt: z.number(),
        archived: z.boolean().optional(),
        seriesId: z.string().nullable().optional(),
    }),
    nodes: z.array(z.union([SceneSchema, DocumentNodeSchema])),
    codex: z.array(CodexEntrySchema),
    chats: z.array(ChatThreadSchema).optional(),
    messages: z.array(ChatMessageSchema).optional(),
    snippets: z.array(SnippetSchema).optional(),
    codexRelations: z.array(z.object({
        id: z.string(),
        parentId: z.string(),
        childId: z.string(),
    })).optional(),
    codexAdditions: z.array(z.object({
        id: z.string(),
        sceneId: z.string(),
        codexEntryId: z.string(),
    })).optional(),
    sections: z.array(z.object({
        id: z.string(),
        sceneId: z.string(),
        title: z.string().max(200).optional(),
        color: z.string().optional(),
    })).optional(),
});

export type ValidatedExportedProject = z.infer<typeof ExportedProjectSchema>;
