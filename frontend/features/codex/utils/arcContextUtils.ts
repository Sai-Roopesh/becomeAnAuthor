/**
 * Arc Context Utilities
 * Helper functions for building rich AI context from character arc points
 * Includes Phase 5 enhancements (Knowledge State, Emotional State, Goals/Motivations)
 */

import type { ArcPoint, CodexEntry, Project } from '@/domain/entities/types';

/**
 * Parse seriesIndex string to extract numeric value
 * Handles formats like "Book 1", "1", "Vol. 2", etc.
 */
function parseSeriesIndex(seriesIndex: string | undefined): number {
    if (!seriesIndex) return 0;
    const match = seriesIndex.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
}

/**
 * Find the most relevant arc point for a given book/project
 * Returns the arc point that best represents the character's state in this book
 * 
 * For series: Uses series index to find arc points from books that come before
 * the current book in the series order.
 */
export function findMostRecentArcPoint(
    arcPoints: ArcPoint[] | undefined,
    project: Project,
    allProjects?: Project[]
): ArcPoint | null {
    if (!arcPoints || arcPoints.length === 0) return null;

    // Find exact match for this book
    const exactMatch = arcPoints.find(p => p.bookId === project.id);
    if (exactMatch) return exactMatch;

    // If project is part of a series and we have all projects, use series order
    if (project.seriesId && allProjects && allProjects.length > 0) {
        const currentIndex = parseSeriesIndex(project.seriesIndex);

        // Get all projects in the same series
        const seriesProjects = allProjects
            .filter(p => p.seriesId === project.seriesId)
            .map(p => ({ ...p, numericIndex: parseSeriesIndex(p.seriesIndex) }))
            .sort((a, b) => a.numericIndex - b.numericIndex);

        // Find arc points from earlier books in the series
        const earlierBookIds = seriesProjects
            .filter(p => p.numericIndex < currentIndex)
            .map(p => p.id);

        if (earlierBookIds.length > 0) {
            // Get arc points from earlier books, sorted by book order (descending) then timestamp
            const earlierPoints = arcPoints
                .filter(p => earlierBookIds.includes(p.bookId))
                .sort((a, b) => {
                    const aProject = seriesProjects.find(p => p.id === a.bookId);
                    const bProject = seriesProjects.find(p => p.id === b.bookId);
                    const aIndex = aProject?.numericIndex ?? 0;
                    const bIndex = bProject?.numericIndex ?? 0;
                    // Later books first, then later timestamps
                    return bIndex - aIndex || b.timestamp - a.timestamp;
                });

            if (earlierPoints.length > 0) {
                return earlierPoints[0] ?? null;
            }
        }
    }

    // Fallback: most recent by timestamp
    const sorted = [...arcPoints].sort((a, b) => a.timestamp - b.timestamp);
    return sorted[sorted.length - 1] || null;
}


/**
 * Build rich AI context string from an arc point
 * Includes all Phase 5 fields for maximum AI context
 */
export function buildArcPointContext(
    entry: CodexEntry,
    arcPoint: ArcPoint,
    includeWarnings: boolean = true
): string {
    let context = `${entry.name} (${arcPoint.eventLabel}):\n`;

    // Basic info
    if (arcPoint.age) context += `- Age: ${arcPoint.age}\n`;
    context += `- ${arcPoint.description}\n`;
    if (arcPoint.status) context += `- Status: ${arcPoint.status}\n`;
    if (arcPoint.location) context += `- Location: ${arcPoint.location}\n`;

    // Phase 5: Knowledge State
    if (arcPoint.knowledgeState) {
        const ks = arcPoint.knowledgeState;
        if (ks.knows && ks.knows.length > 0) {
            context += `- KNOWS: ${ks.knows.join(', ')}\n`;
        }
        if (ks.doesNotKnow && ks.doesNotKnow.length > 0) {
            context += `- DOESN'T KNOW YET: ${ks.doesNotKnow.join(', ')}\n`;
        }
        if (ks.believes && ks.believes.length > 0) {
            context += `- BELIEVES: ${ks.believes.join(', ')}\n`;
        }
        if (ks.misconceptions && ks.misconceptions.length > 0) {
            context += `- MISCONCEPTIONS: ${ks.misconceptions.join(', ')}\n`;
        }
    }

    // Phase 5: Emotional State
    if (arcPoint.emotionalState) {
        const es = arcPoint.emotionalState;
        if (es.primaryEmotion) {
            context += `- EMOTIONAL STATE: ${es.primaryEmotion}`;
            if (es.intensity) context += ` (intensity: ${es.intensity}/10)`;
            context += `\n`;
        }
        if (es.mentalState && es.mentalState.length > 0) {
            context += `- MENTAL STATE: ${es.mentalState.join(', ')}\n`;
        }
        if (es.internalConflict) {
            context += `- INTERNAL CONFLICT: ${es.internalConflict}\n`;
        }
        if (es.trauma && es.trauma.length > 0) {
            context += `- TRAUMA: ${es.trauma.join(', ')}\n`;
        }
    }

    // Phase 5: Goals & Motivations
    if (arcPoint.goalsAndMotivations) {
        const gm = arcPoint.goalsAndMotivations;
        if (gm.primaryGoal) {
            context += `- PRIMARY GOAL: ${gm.primaryGoal}\n`;
        }
        if (gm.secondaryGoals && gm.secondaryGoals.length > 0) {
            context += `- SECONDARY GOALS: ${gm.secondaryGoals.join(', ')}\n`;
        }
        if (gm.fears && gm.fears.length > 0) {
            context += `- FEARS: ${gm.fears.join(', ')}\n`;
        }
        if (gm.desires && gm.desires.length > 0) {
            context += `- DESIRES: ${gm.desires.join(', ')}\n`;
        }
        if (gm.obstacles && gm.obstacles.length > 0) {
            context += `- OBSTACLES: ${gm.obstacles.join(', ')}\n`;
        }
    }

    // Relationships
    if (Object.keys(arcPoint.relationships).length > 0) {
        const relationshipStr = Object.entries(arcPoint.relationships)
            .map(([char, rel]) => `${char}: ${rel}`)
            .join(', ');
        context += `- RELATIONSHIPS: ${relationshipStr}\n`;
    }

    // Critical AI warnings for "doesn't know yet" information
    if (includeWarnings && arcPoint.knowledgeState?.doesNotKnow && arcPoint.knowledgeState.doesNotKnow.length > 0) {
        context += `\n⚠️ CRITICAL: Character does NOT know: ${arcPoint.knowledgeState.doesNotKnow.join(', ')}. `;
        context += `Do not reveal or hint at this information in generated content.\n`;
    }

    return context;
}

/**
 * Build context for @mention suggestions
 * Returns a concise, inline-friendly description
 */
export function buildMentionContext(
    entry: CodexEntry,
    project: Project
): string {
    const arcPoint = findMostRecentArcPoint(entry.arcPoints, project);

    if (!arcPoint) {
        return entry.coreDescription || entry.description || entry.name;
    }

    let context = '';
    if (arcPoint.age) {
        context += `Age ${arcPoint.age}. `;
    }
    context += arcPoint.description;

    // Add emotional state hint if available
    if (arcPoint.emotionalState?.primaryEmotion) {
        context += ` (Currently: ${arcPoint.emotionalState.primaryEmotion})`;
    }

    return context;
}

/**
 * Build complete character state for AI chat context
 * Used when character is included in chat context
 */
export function buildCharacterChatContext(
    entries: CodexEntry[],
    project: Project,
    includeDetailed: boolean = true
): string {
    if (entries.length === 0) return '';

    const contextParts = entries.map(entry => {
        const arcPoint = findMostRecentArcPoint(entry.arcPoints, project);

        if (!arcPoint) {
            // Fallback to core description
            return `${entry.name}: ${entry.coreDescription || entry.description}`;
        }

        // Use detailed context for Phase 5 fields
        return buildArcPointContext(entry, arcPoint, includeDetailed);
    });

    return `CHARACTER STATE (${project.title}):\n\n${contextParts.join('\n\n')}`;
}

/**
 * Analyze character arc progression
 * Detect potential inconsistencies or narrative issues
 */
export function analyzeCharacterArc(entry: CodexEntry): {
    hasArc: boolean;
    pointCount: number;
    hasInconsistencies: boolean;
    issues: string[];
    suggestions: string[];
} {
    const arcPoints = entry.arcPoints || [];
    const issues: string[] = [];
    const suggestions: string[] = [];

    if (arcPoints.length === 0) {
        return {
            hasArc: false,
            pointCount: 0,
            hasInconsistencies: false,
            issues: ['No arc points defined'],
            suggestions: ['Create arc points to track character evolution']
        };
    }

    // Check for age inconsistencies
    const agesWithTimestamp = arcPoints
        .filter(p => p.age !== undefined)
        .map(p => ({ age: p.age!, timestamp: p.timestamp }))
        .sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 1; i < agesWithTimestamp.length; i++) {
        const current = agesWithTimestamp[i];
        const previous = agesWithTimestamp[i - 1];
        if (current && previous && current.age < previous.age) {
            issues.push(`Age decreases from ${previous.age} to ${current.age}`);
        }
    }

    // Check for knowledge state issues - character forgetting things
    const knowledgePoints = arcPoints
        .filter(p => p.knowledgeState?.knows && p.knowledgeState.knows.length > 0)
        .sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 1; i < knowledgePoints.length; i++) {
        const current = knowledgePoints[i];
        const previous = knowledgePoints[i - 1];
        if (!current?.knowledgeState?.knows || !previous?.knowledgeState?.knows) continue;

        const prevKnows = new Set(previous.knowledgeState.knows);
        const currentKnows = new Set(current.knowledgeState.knows);

        // Check if character forgot something they knew
        const forgotten = [...prevKnows].filter(k => !currentKnows.has(k));
        if (forgotten.length > 0) {
            issues.push(`Knowledge lost: ${forgotten.join(', ')} (unless intentional amnesia)`);
        }
    }

    // Suggestions
    if (arcPoints.length < 3) {
        suggestions.push('Consider adding more arc points to track detailed character evolution');
    }

    const hasPhase5Data = arcPoints.some(p =>
        p.knowledgeState || p.emotionalState || p.goalsAndMotivations
    );

    if (!hasPhase5Data) {
        suggestions.push('Add Knowledge State, Emotional State, or Goals to enrich AI context');
    }

    return {
        hasArc: true,
        pointCount: arcPoints.length,
        hasInconsistencies: issues.length > 0,
        issues,
        suggestions
    };
}
