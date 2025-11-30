import type { IAnalysisService } from '@/domain/services/IAnalysisService';
import type { IAnalysisRepository } from '@/domain/repositories/IAnalysisRepository';
import type { INodeRepository } from '@/domain/repositories/INodeRepository';
import type { ICodexRepository } from '@/domain/repositories/ICodexRepository';
import type { StoryAnalysis, Scene, DocumentNode } from '@/lib/config/types';
import { generateText } from '@/lib/ai-service';
import {
    SYNOPSIS_PROMPT,
    PLOT_THREADS_PROMPT,
    CHARACTER_ARCS_PROMPT,
    TIMELINE_PROMPT,
    CONTRADICTIONS_PROMPT,
    ALPHA_READER_PROMPT,
    BETA_READER_PROMPT,
} from '@/lib/prompts/analysis-prompts';

/**
 * Service for running AI-powered story analyses
 * Dependencies injected via constructor
 */
export class AnalysisService implements IAnalysisService {
    constructor(
        private nodeRepo: INodeRepository,
        private codexRepo: ICodexRepository,
        private analysisRepo: IAnalysisRepository
    ) { }

    async runAnalysis(
        projectId: string,
        scope: string[],
        types: string[],
        model: string
    ): Promise<StoryAnalysis[]> {
        const results: StoryAnalysis[] = [];

        // Gather context
        const allNodes = await this.nodeRepo.getByProject(projectId);
        const scenes = this.filterScenesByScope(allNodes, scope);
        const codexEntries = await this.codexRepo.getByProject(projectId);

        const manuscriptVersion = await this.getManuscriptVersion(projectId);
        const wordCount = scenes.reduce((sum, s) => sum + (s.wordCount || 0), 0);

        // Run each analysis type
        for (const type of types) {
            const prompt = this.getPromptForType(type, scenes, codexEntries);

            try {
                const response = await generateText({
                    model,
                    prompt,
                    temperature: 0.7,
                });

                const parsedResult = this.parseResponse(type, response.text);

                const analysis: Omit<StoryAnalysis, 'id' | 'createdAt'> = {
                    projectId,
                    analysisType: type as any,
                    scope: this.determineScope(scope, allNodes),
                    scopeIds: scope.length > 0 ? scope : allNodes.filter(n => n.type === 'scene').map(n => n.id),
                    results: parsedResult,
                    manuscriptVersion,
                    wordCountAtAnalysis: wordCount,
                    scenesAnalyzedCount: scenes.length,
                    model,
                    dismissed: false,
                    resolved: false,
                };

                const created = await this.analysisRepo.create(analysis);
                results.push(created);
            } catch (error) {
                console.error(`Analysis failed for type ${type}:`, error);
                throw error;
            }
        }

        return results;
    }

    async getManuscriptVersion(projectId: string): Promise<number> {
        const nodes = await this.nodeRepo.getByProject(projectId);
        const scenes = nodes.filter(n => n.type === 'scene') as Scene[];
        return scenes.reduce((sum, scene) => sum + scene.updatedAt, 0);
    }

    async countEditedScenes(analysis: StoryAnalysis): Promise<number> {
        const nodes = await this.nodeRepo.getByProject(analysis.projectId);
        const scenes = nodes.filter(n => n.type === 'scene') as Scene[];
        return scenes.filter(scene => scene.updatedAt > analysis.createdAt).length;
    }

    async estimateTokens(scope: string[], types: string[]): Promise<number> {
        // Rough estimation: 1000 tokens per scene * number of scenes * number of analysis types
        const sceneCount = scope.length || 10; // Default estimate
        return sceneCount * 1000 * types.length;
    }

    private filterScenesByScope(nodes: DocumentNode[], scopeIds: string[]): Scene[] {
        if (scopeIds.length === 0) {
            // Full manuscript
            return nodes.filter(n => n.type === 'scene') as Scene[];
        }

        const selectedNodes = new Set(scopeIds);
        const scenes: Scene[] = [];

        for (const node of nodes) {
            if (node.type === 'scene' && selectedNodes.has(node.id)) {
                scenes.push(node as Scene);
            } else if (node.type === 'chapter' && selectedNodes.has(node.id)) {
                // Get all scenes in this chapter
                const chapterScenes = nodes.filter(
                    n => n.type === 'scene' && n.parentId === node.id
                ) as Scene[];
                scenes.push(...chapterScenes);
            } else if (node.type === 'act' && selectedNodes.has(node.id)) {
                // Get all chapters in this act, then their scenes
                const actChapters = nodes.filter(n => n.type === 'chapter' && n.parentId === node.id);
                for (const chapter of actChapters) {
                    const chapterScenes = nodes.filter(
                        n => n.type === 'scene' && n.parentId === chapter.id
                    ) as Scene[];
                    scenes.push(...chapterScenes);
                }
            }
        }

        return scenes;
    }

    private getPromptForType(type: string, scenes: Scene[], codex: any[]): string {
        const context = { scenes, codex };

        switch (type) {
            case 'synopsis':
                return SYNOPSIS_PROMPT(context);
            case 'plot-threads':
                return PLOT_THREADS_PROMPT(context);
            case 'character-arcs':
                return CHARACTER_ARCS_PROMPT(context);
            case 'timeline':
                return TIMELINE_PROMPT(context);
            case 'contradictions':
                return CONTRADICTIONS_PROMPT(context);
            case 'alpha-reader':
                return ALPHA_READER_PROMPT(context);
            case 'beta-reader':
                return BETA_READER_PROMPT(context);
            default:
                return `Analyze this manuscript for ${type}.\n\nScenes:\n${scenes.map(s => s.title).join(', ')}`;
        }
    }

    private parseResponse(type: string, responseText: string): { summary?: string; insights: any[]; metrics?: any } {
        try {
            // Try to extract JSON from response (handle cases where AI adds extra text)
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            // Convert parsed data to insights format
            const insights = this.convertToInsights(type, parsed);

            return {
                summary: this.extractSummary(type, parsed),
                insights,
                metrics: parsed,
            };
        } catch (error) {
            console.error('Failed to parse AI response:', error);
            // Fallback: treat entire response as summary
            return {
                summary: responseText,
                insights: [],
                metrics: {},
            };
        }
    }

    private extractSummary(type: string, parsed: any): string | undefined {
        switch (type) {
            case 'synopsis':
                return parsed.summary;
            case 'plot-threads':
                return `Found ${parsed.threads?.length || 0} plot threads`;
            case 'character-arcs':
                return `Analyzed ${parsed.characters?.length || 0} characters`;
            case 'timeline':
                return `${parsed.events?.length || 0} temporal markers found, ${parsed.inconsistencies?.length || 0} issues detected`;
            case 'contradictions':
                return `${parsed.contradictions?.length || 0} contradictions found`;
            case 'alpha-reader':
                return parsed.overallImpression;
            case 'beta-reader':
                return `Rating: ${parsed.rating}/5 - ${parsed.enjoyment}`;
            default:
                return undefined;
        }
    }

    private convertToInsights(type: string, parsed: any): any[] {
        const insights: any[] = [];

        switch (type) {
            case 'plot-threads':
                parsed.threads?.forEach((thread: any) => {
                    if (thread.status === 'unresolved') {
                        insights.push({
                            id: crypto.randomUUID(),
                            type: 'warning',
                            category: 'plot',
                            message: `Unresolved plot thread: "${thread.name}"`,
                            severity: thread.severity || 2,
                            sceneReferences: thread.development?.map((d: any) => ({
                                sceneId: '', // Will be populated later
                                sceneTitle: `Scene ${d.sceneIndex + 1}`,
                                excerpt: d.note,
                            })) || [],
                            dismissed: false,
                            resolved: false,
                        });
                    }
                });
                break;

            case 'character-arcs':
                parsed.characters?.forEach((char: any) => {
                    if (char.arcStatus === 'incomplete') {
                        insights.push({
                            id: crypto.randomUUID(),
                            type: 'warning',
                            category: 'character',
                            message: `Incomplete character arc for "${char.name}": ${char.arcDescription}`,
                            severity: 2,
                            sceneReferences: char.keyMoments?.slice(0, 3).map((m: any) => ({
                                sceneId: '',
                                sceneTitle: `Scene ${m.sceneIndex + 1}`,
                                excerpt: m.moment,
                            })) || [],
                            dismissed: false,
                            resolved: false,
                        });
                    }
                });
                break;

            case 'timeline':
                parsed.inconsistencies?.forEach((issue: any) => {
                    insights.push({
                        id: crypto.randomUUID(),
                        type: 'error',
                        category: 'timeline',
                        message: issue.description,
                        severity: issue.severity || 2,
                        sceneReferences: issue.sceneIndices?.map((idx: number) => ({
                            sceneId: '',
                            sceneTitle: `Scene ${idx + 1}`,
                        })) || [],
                        dismissed: false,
                        resolved: false,
                    });
                });
                break;

            case 'contradictions':
                parsed.contradictions?.forEach((contradiction: any) => {
                    insights.push({
                        id: crypto.randomUUID(),
                        type: 'error',
                        category: contradiction.type || 'plot',
                        message: contradiction.description,
                        severity: contradiction.severity || 2,
                        autoSuggest: contradiction.suggestion,
                        sceneReferences: contradiction.sceneIndices?.map((idx: number) => ({
                            sceneId: '',
                            sceneTitle: `Scene ${idx + 1}`,
                        })) || [],
                        dismissed: false,
                        resolved: false,
                    });
                });
                break;

            case 'alpha-reader':
                parsed.concerns?.forEach((concern: any) => {
                    insights.push({
                        id: crypto.randomUUID(),
                        type: 'warning',
                        category: 'plot',
                        message: concern.issue,
                        severity: 2,
                        autoSuggest: concern.suggestion,
                        sceneReferences: concern.sceneIndices?.map((idx: number) => ({
                            sceneId: '',
                            sceneTitle: `Scene ${idx + 1}`,
                        })) || [],
                        dismissed: false,
                        resolved: false,
                    });
                });
                break;

            case 'beta-reader':
                if (parsed.rating < 3) {
                    insights.push({
                        id: crypto.randomUUID(),
                        type: 'warning',
                        category: 'plot',
                        message: `Overall rating: ${parsed.rating}/5. Consider addressing reader feedback.`,
                        severity: 2,
                        dismissed: false,
                        resolved: false,
                    });
                }
                break;
        }

        return insights;
    }

    private determineScope(scopeIds: string[], nodes: DocumentNode[]): 'full' | 'act' | 'chapter' | 'scene' {
        if (scopeIds.length === 0) return 'full';

        const firstNode = nodes.find(n => n.id === scopeIds[0]);
        if (!firstNode) return 'full';

        return firstNode.type as any;
    }
}
