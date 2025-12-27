import type { DocumentNode, CodexCategory } from '@/domain/entities/types';
import { User, MapPin, Scroll, BookOpen, Sparkles } from 'lucide-react';

/**
 * Category configuration for timeline lanes.
 */
export const CATEGORY_CONFIG: Record<
    CodexCategory,
    { icon: typeof User; color: string; bgColor: string; borderColor: string }
> = {
    character: {
        icon: User,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-950/30',
        borderColor: 'border-blue-200 dark:border-blue-800',
    },
    location: {
        icon: MapPin,
        color: 'text-green-600',
        bgColor: 'bg-green-50 dark:bg-green-950/30',
        borderColor: 'border-green-200 dark:border-green-800',
    },
    subplot: {
        icon: Scroll,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50 dark:bg-purple-950/30',
        borderColor: 'border-purple-200 dark:border-purple-800',
    },
    item: {
        icon: Sparkles,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50 dark:bg-amber-950/30',
        borderColor: 'border-amber-200 dark:border-amber-800',
    },
    lore: {
        icon: BookOpen,
        color: 'text-rose-600',
        bgColor: 'bg-rose-50 dark:bg-rose-950/30',
        borderColor: 'border-rose-200 dark:border-rose-800',
    },
};

/**
 * Extract scenes in order from the node tree.
 */
export function extractScenes(nodes: DocumentNode[]): DocumentNode[] {
    const acts = nodes.filter((n) => n.type === 'act').sort((a, b) => a.order - b.order);
    const allScenes: DocumentNode[] = [];

    acts.forEach((act) => {
        const chapters = nodes
            .filter((n) => n.type === 'chapter' && n.parentId === act.id)
            .sort((a, b) => a.order - b.order);

        chapters.forEach((chapter) => {
            const chapterScenes = nodes
                .filter((n) => n.type === 'scene' && n.parentId === chapter.id)
                .sort((a, b) => a.order - b.order);
            allScenes.push(...chapterScenes);
        });
    });

    return allScenes;
}

/**
 * Calculate chapter boundaries for timeline markers.
 */
export function calculateChapterBoundaries(
    nodes: DocumentNode[]
): { id: string; title: string; startIndex: number }[] {
    const boundaries: { id: string; title: string; startIndex: number }[] = [];
    let currentIndex = 0;

    const acts = nodes.filter((n) => n.type === 'act').sort((a, b) => a.order - b.order);
    acts.forEach((act) => {
        const chapters = nodes
            .filter((n) => n.type === 'chapter' && n.parentId === act.id)
            .sort((a, b) => a.order - b.order);

        chapters.forEach((chapter) => {
            const chapterScenes = nodes.filter((n) => n.type === 'scene' && n.parentId === chapter.id);
            boundaries.push({
                id: chapter.id,
                title: chapter.title,
                startIndex: currentIndex,
            });
            currentIndex += chapterScenes.length;
        });
    });

    return boundaries;
}


