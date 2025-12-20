// Barrel export for domain repositories
export type { INodeRepository } from './INodeRepository';
export type { ICodexRepository } from './ICodexRepository';
export type { IChatRepository } from './IChatRepository';
export type { IProjectRepository } from './IProjectRepository';
export type { IAnalysisRepository } from './IAnalysisRepository';
export type { ISeriesRepository } from './ISeriesRepository';
export type { ISnippetRepository } from './ISnippetRepository';
export type { ICodexRelationRepository } from './ICodexRelationRepository';
export type { ICodexRelationTypeRepository } from './ICodexRelationTypeRepository';
export type { ICodexTagRepository } from './ICodexTagRepository';
export type { ICodexTemplateRepository } from './ICodexTemplateRepository';
export type { ISceneCodexLinkRepository } from './ISceneCodexLinkRepository';

// Re-export types that might be needed
export type { SceneCodexLink } from '../entities/types';
export type { TauriSnippetRepository as SnippetRepository } from '../../infrastructure/repositories/TauriSnippetRepository';
