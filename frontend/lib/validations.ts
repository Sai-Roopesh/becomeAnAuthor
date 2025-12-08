/**
 * Zod validation schemas for forms
 * Provides type-safe form validation with React Hook Form
 */

import { z } from 'zod';

// ============================================================================
// Dialog Form Schemas
// ============================================================================

/**
 * Schema for Tweak & Generate dialog
 */
export const tweakGenerateSchema = z.object({
    wordCount: z.string()
        .min(1, 'Word count is required')
        .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
            message: 'Word count must be a positive number',
        })
        .refine((val) => Number(val) <= 10000, {
            message: 'Word count must be 10,000 or less',
        }),
    instructions: z.string().optional(),
    model: z.string().min(1, 'Please select a model'),
    selectedContexts: z.array(z.any()).optional().default([]),
});

export type TweakGenerateFormData = z.infer<typeof tweakGenerateSchema>;

/**
 * Schema for Text Replace dialog
 */
export const textReplaceSchema = z.object({
    instruction: z.string().min(1, 'Instruction is required'),
    preset: z.enum(['default', 'shorter', 'longer', 'custom']),
    customLength: z.string().optional(),
    selectedContexts: z.array(z.any()).optional().default([]),
});

export type TextReplaceFormData = z.infer<typeof textReplaceSchema>;

// ============================================================================
// Settings Schemas
// ============================================================================

/**
 * Schema for AI connection settings
 */
export const aiConnectionSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    provider: z.enum(['openai', 'anthropic', 'google', 'openrouter']),
    apiKey: z.string().min(1, 'API key is required'),
    baseUrl: z.string().url('Must be a valid URL').optional(),
    models: z.array(z.string()).min(1, 'At least one model is required'),
    enabled: z.boolean().default(true),
});

export type AIConnectionFormData = z.infer<typeof aiConnectionSchema>;

/**
 * Schema for project settings
 */
export const projectSettingsSchema = z.object({
    name: z.string().min(1, 'Project name is required').max(100, 'Name must be 100 characters or less'),
    description: z.string().max(500, 'Description must be 500 characters or less').optional(),
    defaultModel: z.string().optional(),
    autoSave: z.boolean().default(true),
    autoSaveInterval: z.number().min(30).max(600).default(60),
});

export type ProjectSettingsFormData = z.infer<typeof projectSettingsSchema>;

// ============================================================================
// Node Creation Schemas
// ============================================================================

/**
 * Schema for creating a new scene
 */
export const createSceneSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
    summary: z.string().max(1000, 'Summary must be 1,000 characters or less').optional(),
    content: z.string().optional(),
});

export type CreateSceneFormData = z.infer<typeof createSceneSchema>;

/**
 * Schema for creating a new chapter
 */
export const createChapterSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
    summary: z.string().max(1000, 'Summary must be 1,000 characters or less').optional(),
});

export type CreateChapterFormData = z.infer<typeof createChapterSchema>;
