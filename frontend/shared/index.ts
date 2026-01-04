/**
 * Shared Module Barrel Export
 * 
 * Centralized exports for shared utilities, types, and constants
 */

// Constants (re-exported from lib/config + export-specific)
export * from './constants';

// Prompt templates
export * from './prompts/templates';

// Validation schemas
export * from './schemas';

// Types
export * from './types/tiptap';

// Utilities
export { logger } from './utils/logger';
export { toast } from './utils/toast-service';
export * from './utils/ai-utils';
export { getContextAssembler, ContextAssembler } from './utils/context-assembler';
export type { ContextItem } from './utils/context-assembler';

// Form validations
export * from './validations';
