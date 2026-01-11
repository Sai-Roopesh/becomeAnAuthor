/**
 * Shared Zod Schemas for Forms
 *
 * All form validation schemas in one place for consistency.
 */

import { z } from "zod";

// ============================================
// Series Schemas
// ============================================

export const createSeriesSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

export type CreateSeriesFormData = z.infer<typeof createSeriesSchema>;

// ============================================
// Project Schemas
// ============================================

export const createProjectSchema = z.object({
  title: z.string().min(1, "Title is required"),
  seriesId: z.string().min(1, "Series is required"),
  bookNumber: z.string().optional(),
  newSeriesName: z.string().optional(),
});

export type CreateProjectFormData = z.infer<typeof createProjectSchema>;

// ============================================
// Node Schemas (Act, Chapter, Scene)
// ============================================

export const createNodeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["act", "chapter", "scene"]),
  parentId: z.string().nullable(),
});

export type CreateNodeFormData = z.infer<typeof createNodeSchema>;

export const nodeActionsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  pov: z.string().optional(),
  subtitle: z.string().optional(),
});

export type NodeActionsFormData = z.infer<typeof nodeActionsSchema>;

// ============================================
// AI Connection Schemas
// ============================================

export const aiConnectionSchema = z.object({
  name: z.string().min(1, "Connection name is required"),
  provider: z.string().min(1, "Provider is required"),
  apiKey: z.string().min(1, "API key is required"),
  customEndpoint: z.string().url().optional().or(z.literal("")),
  models: z.array(z.string()).optional(),
});

export type AIConnectionFormData = z.infer<typeof aiConnectionSchema>;

// ============================================
// Snippet Schemas
// ============================================

export const snippetSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type SnippetFormData = z.infer<typeof snippetSchema>;

// ============================================
// Codex Schemas
// ============================================

export const codexAttributeSchema = z.object({
  key: z.string().min(1, "Attribute name is required"),
  value: z.string().min(1, "Value is required"),
});

export type CodexAttributeFormData = z.infer<typeof codexAttributeSchema>;

export const tagSchema = z.object({
  name: z.string().min(1, "Tag name is required"),
  color: z.string().optional(),
});

export type TagFormData = z.infer<typeof tagSchema>;

// ============================================
// Map Schemas
// ============================================

export const mapSchema = z.object({
  name: z.string().min(1, "Map name is required"),
});

export type MapFormData = z.infer<typeof mapSchema>;

// ============================================
// Collaboration Schemas
// ============================================

export const joinRoomSchema = z.object({
  roomId: z.string().min(1, "Room ID is required"),
});

export type JoinRoomFormData = z.infer<typeof joinRoomSchema>;

// ============================================
// Chat Schemas
// ============================================

export const chatMessageSchema = z.object({
  message: z.string().min(1, "Message is required"),
  model: z.string().optional(),
});

export type ChatMessageFormData = z.infer<typeof chatMessageSchema>;

// ============================================
// Editor Schemas
// ============================================

export const tinkerInstructionSchema = z.object({
  instruction: z.string().min(1, "Instruction is required"),
});

export type TinkerInstructionFormData = z.infer<typeof tinkerInstructionSchema>;

// ============================================
// Quick Capture Schemas
// ============================================

export const quickCaptureSchema = z.object({
  content: z.string().min(1, "Content is required"),
});

export type QuickCaptureFormData = z.infer<typeof quickCaptureSchema>;

// ============================================
// Search Schemas (for components with search)
// ============================================

export const searchSchema = z.object({
  query: z.string(),
});

export type SearchFormData = z.infer<typeof searchSchema>;
