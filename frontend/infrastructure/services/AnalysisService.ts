import type { IAnalysisService } from '@/domain/services/IAnalysisService';
import type { IAnalysisRepository } from '@/domain/repositories/IAnalysisRepository';
import type { INodeRepository } from '@/domain/repositories/INodeRepository';
import type { ICodexRepository } from '@/domain/repositories/ICodexRepository';
import type { IProjectRepository } from '@/domain/repositories/IProjectRepository';
import type { StoryAnalysis, Scene, DocumentNode, CodexEntry, AnalysisInsight } from '@/domain/entities/types';
import type {
    ParsedAnalysisResult,
    PlotThread,
    CharacterArc,
    TimelineInconsistency,
    Contradiction,
    ReaderConcern,
} from '@/domain/entities/analysis-types';
import { generateText } from '@/lib/ai';
import {
    SYNOPSIS_PROMPT,
    PLOT_THREADS_PROMPT,
    CHARACTER_ARCS_PROMPT,
    TIMELINE_PROMPT,
    CONTRADICTIONS_PROMPT,
    ALPHA_READER_PROMPT,
    BETA_READER_PROMPT,
} from '@/shared/prompts/analysis-prompts';

/**
 * Service for running AI-powered story analyses
 * Dependencies injected via constructor
 * Series-first: uses projectRepo to get seriesId for codex lookups
 */
export class AnalysisService implements IAnalysisService {
    constructor(
        private nodeRepo: INodeRepository,
        private codexRepo: ICodexRepository,
        private analysisRepo: IAnalysisRepository,
        private projectRepo: IProjectRepository
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

        // Series-first: fetch project to get seriesId for codex lookup
        const project = await this.projectRepo.get(projectId);
        const seriesId = project?.seriesId;
        const codexEntries = seriesId
            ? await this.codexRepo.getBySeries(seriesId)
            : [];

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
                    analysisType: type as import('@/domain/entities/types').StoryAnalysis['analysisType'],
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

    private getPromptForType(type: string, scenes: Scene[], codex: CodexEntry[]): string {
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

    private parseResponse(type: string, responseText: string): ParsedAnalysisResult {
        try {
            // Try to extract JSON from response (handle cases where AI adds extra text)
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            // Sanitize JSON string to remove control characters
            const jsonStr = jsonMatch[0]
                .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
                .replace(/\r\n/g, '\\n')  // Normalize line endings
                .replace(/\n/g, '\\n')    // Escape remaining newlines
                .replace(/\t/g, '\\t');   // Escape tabs

            let parsed;
            try {
                parsed = JSON.parse(jsonStr);
            } catch (parseError) {
                // If sanitization didn't work, try a more aggressive approach
                console.warn('First parse attempt failed, trying aggressive sanitization:', parseError);
                const aggressiveClean = jsonMatch[0].replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
                parsed = JSON.parse(aggressiveClean);
            }

            // Convert parsed data to insights format
            const insights = this.convertToInsights(type, parsed);

            // Serialize metrics to ensure no Promises or functions
            const metrics = JSON.parse(JSON.stringify(parsed));

            // Extract summary
            const summary = this.extractSummary(type, parsed);

            // With exactOptionalPropertyTypes: true, we must not assign undefined to optional properties
            // Instead, conditionally include them only if they have values
            return {
                ...(summary !== undefined && { summary }),
                insights,
                ...(metrics && { metrics }),
            };
        } catch (error) {
            console.error('Failed to parse AI response:', error);
            console.error('Response text:', responseText.substring(0, 500)); // Log first 500 chars
            // Fallback: treat entire response as summary
            return {
                summary: responseText,
                insights: [],
                metrics: {},
            };
        }
    }

    private extractSummary(type: string, parsed: Record<string, unknown>): string | undefined {
        switch (type) {
            case 'synopsis':
                return parsed['summary'] as string | undefined;
            case 'plot-threads': {
                const threads = parsed['threads'] as PlotThread[] | undefined;
                return `Found ${threads?.length || 0} plot threads`;
            }
            case 'character-arcs': {
                const characters = parsed['characters'] as CharacterArc[] | undefined;
                return `Analyzed ${characters?.length || 0} characters`;
            }
            case 'timeline': {
                const events = parsed['events'] as unknown[] | undefined;
                const inconsistencies = parsed['inconsistencies'] as TimelineInconsistency[] | undefined;
                return `${events?.length || 0} temporal markers found, ${inconsistencies?.length || 0} issues detected`;
            }
            case 'contradictions': {
                const contradictions = parsed['contradictions'] as Contradiction[] | undefined;
                return `${contradictions?.length || 0} contradictions found`;
            }
            case 'alpha-reader':
                return parsed['overallImpression'] as string | undefined;
            case 'beta-reader':
                return `Rating: ${parsed['rating']}/5 - ${parsed['enjoyment']}`;
            default:
                return undefined;
        }
    }

    private convertToInsights(type: string, parsed: Record<string, unknown>): AnalysisInsight[] {
        const insights: AnalysisInsight[] = [];

        switch (type) {
            case 'plot-threads': {
                const threads = parsed['threads'] as PlotThread[] | undefined;
                threads?.forEach((thread) => {
                    if (thread.status === 'unresolved') {
                        insights.push({
                            id: crypto.randomUUID(),
                            type: 'warning',
                            category: 'plot',
                            message: `Unresolved plot thread: "${thread.name}"`,
                            severity: thread.severity || 2,
                            sceneReferences: thread.development?.map((d) => ({
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
            }

            case 'character-arcs': {
                const characters = parsed['characters'] as CharacterArc[] | undefined;
                characters?.forEach((char) => {
                    if (char.arcStatus === 'incomplete') {
                        insights.push({
                            id: crypto.randomUUID(),
                            type: 'warning',
                            category: 'character',
                            message: `Incomplete character arc for "${char.name}": ${char.arcDescription}`,
                            severity: 2,
                            sceneReferences: char.keyMoments?.slice(0, 3).map((m) => ({
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
            }

            case 'timeline': {
                const inconsistencies = parsed['inconsistencies'] as TimelineInconsistency[] | undefined;
                inconsistencies?.forEach((issue) => {
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
            }

            case 'contradictions': {
                const contradictions = parsed['contradictions'] as Contradiction[] | undefined;
                contradictions?.forEach((contradiction) => {
                    insights.push({
                        id: crypto.randomUUID(),
                        type: 'error',
                        category: (contradiction.type === 'logic' ? 'plot' : contradiction.type) || 'plot',
                        message: contradiction.description,
                        severity: contradiction.severity || 2,
                        ...(contradiction.suggestion && { autoSuggest: contradiction.suggestion }),
                        sceneReferences: contradiction.sceneIndices?.map((idx: number) => ({
                            sceneId: '',
                            sceneTitle: `Scene ${idx + 1}`,
                        })) || [],
                        dismissed: false,
                        resolved: false,
                    });
                });
                break;
            }

            case 'alpha-reader': {
                const concerns = parsed['concerns'] as ReaderConcern[] | undefined;
                concerns?.forEach((concern) => {
                    insights.push({
                        id: crypto.randomUUID(),
                        type: 'warning',
                        category: 'plot',
                        message: concern.issue,
                        severity: 2,
                        ...(concern.suggestion && { autoSuggest: concern.suggestion }),
                        sceneReferences: concern.sceneIndices?.map((idx: number) => ({
                            sceneId: '',
                            sceneTitle: `Scene ${idx + 1}`,
                        })) || [],
                        dismissed: false,
                        resolved: false,
                    });
                });
                break;
            }

            case 'beta-reader': {
                const rating = parsed['rating'] as number | undefined;
                if (rating !== undefined && rating < 3) {
                    insights.push({
                        id: crypto.randomUUID(),
                        type: 'warning',
                        category: 'plot',
                        message: `Overall rating: ${rating}/5. Consider addressing reader feedback.`,
                        severity: 2,
                        dismissed: false,
                        resolved: false,
                    });
                }
                break;
            }
        }

        return insights;
    }

    private determineScope(scopeIds: string[], nodes: DocumentNode[]): 'full' | 'act' | 'chapter' | 'scene' {
        if (scopeIds.length === 0) return 'full';

        const firstNode = nodes.find(n => n.id === scopeIds[0]);
        if (!firstNode) return 'full';

        return firstNode.type as 'act' | 'chapter' | 'scene';
    }
}
