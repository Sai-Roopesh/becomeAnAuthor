'use client';

import { DocumentNode } from '@/domain/entities/types';
import { useProjectStore } from '@/store/use-project-store';
import { isElementNode } from '@/shared/types/tiptap';
import { FileText, MoreVertical, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SceneCodexBadges } from './scene-codex-badges';
import { SceneLinkPanel } from './scene-link-panel';
import { useState } from 'react';

interface SceneCardProps {
    scene: DocumentNode;
    seriesId: string;  // Required - series-first architecture
}

export function SceneCard({ scene, seriesId }: SceneCardProps) {
    const { setActiveSceneId, setViewMode } = useProjectStore();
    const [linkPanelOpen, setLinkPanelOpen] = useState(false);

    const openScene = () => {
        setActiveSceneId(scene.id);
        setViewMode('write');
    };

    // Extract text content from Tiptap JSON for preview
    const getTextPreview = (): string => {
        if (scene.type !== 'scene' || !('content' in scene)) return '';
        const content = scene.content;
        const firstNode = content?.content?.[0];
        if (!firstNode || !isElementNode(firstNode)) return 'No summary yet...';
        const firstContent = firstNode.content?.[0];
        if (!firstContent || !('text' in firstContent)) return 'No summary yet...';
        return firstContent.text.slice(0, 150) + '...';
    };

    const wordCount = scene.type === 'scene' && 'wordCount' in scene ? scene.wordCount : 0;

    return (
        <div className="border rounded-lg p-3 hover:bg-accent/50 transition-colors group cursor-pointer" onClick={openScene}>
            {/* Codex Badges Row */}
            <div className="mb-2" onClick={(e) => e.stopPropagation()}>
                <SceneCodexBadges
                    sceneId={scene.id}
                    projectId={scene.projectId}
                    seriesId={seriesId}
                    maxBadges={4}
                    size="sm"
                />
            </div>

            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <h4 className="font-medium text-sm truncate">{scene.title}</h4>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        >
                            <MoreVertical className="h-3 w-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openScene(); }}>
                            Edit Scene
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLinkPanelOpen(true); }}>
                            <Link2 className="h-3.5 w-3.5 mr-2" />
                            Link Codex
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            Set POV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            Add Subtitle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            Delete Scene
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-3 mb-2">
                {getTextPreview()}
            </p>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{wordCount} words</span>
                {scene.type === 'scene' && 'status' in scene && scene.status && (
                    <span className="px-2 py-0.5 bg-muted rounded text-xs">{scene.status}</span>
                )}
            </div>

            {/* Link Panel (triggered from menu) */}
            <SceneLinkPanel
                sceneId={scene.id}
                projectId={scene.projectId}
                seriesId={seriesId}
                open={linkPanelOpen}
                onOpenChange={setLinkPanelOpen}
            />
        </div>
    );
}
