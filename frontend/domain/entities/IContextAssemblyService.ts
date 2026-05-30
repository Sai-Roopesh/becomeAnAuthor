/**
 * Interface for context assembly service.
 *
 * Models the contract of the existing context-engine.ts assembleContext()
 * function, which takes a sceneId and optional seriesId and returns a
 * formatted markdown string ready for injection into an AI prompt.
 */
export interface ContextAssemblyOptions {
  sceneId: string | null;
  seriesId?: string;
}

export interface IContextAssemblyService {
  assembleContext(options: ContextAssemblyOptions): Promise<string>;
}
