'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Clock, StickyNote, MessageSquare, BarChart3 } from 'lucide-react';
import { StoryTimeline } from './story-timeline';
import { SceneNotesPanel } from './scene-notes-panel';

/**
 * Right panel tabs for Write mode
 * - timeline: Scene navigation and overview
 * - notes: Per-scene freeform notes (Phase 1)
 * - comments: Revision comments (Phase 4)
 * - analysis: Prose analysis (Phase 4)
 */
export type RightPanelTab = 'timeline' | 'notes' | 'comments' | 'analysis';

interface WriteRightPanelProps {
    projectId: string;
    seriesId: string;
    activeSceneId: string | null;
    activeSceneWordCount: number;
    onCollapse?: () => void;
}

interface TabButtonProps {
    id: RightPanelTab;
    icon: React.ReactNode;
    label: string;
    activeTab: RightPanelTab;
    onClick: (tab: RightPanelTab) => void;
    disabled?: boolean;
    badge?: number;
}

function TabButton({ id, icon, label, activeTab, onClick, disabled, badge }: TabButtonProps) {
    const isActive = activeTab === id;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onClick(id)}
                    disabled={disabled}
                    className={cn(
                        "min-h-11 min-w-11 relative transition-all duration-200",
                        isActive
                            ? "bg-primary/10 text-primary shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                >
                    {icon}
                    {badge && badge > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-medium">
                            {badge > 9 ? '9+' : badge}
                        </span>
                    )}
                </Button>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={8}>
                <span>{label}</span>
                {disabled && <span className="text-muted-foreground ml-1">(Coming soon)</span>}
            </TooltipContent>
        </Tooltip>
    );
}

/**
 * WriteRightPanel - Tabbed panel for Write mode right sidebar
 * 
 * Features:
 * - Icon-only tabs with tooltips (not cluttered)
 * - Responsive: 44px touch targets
 * - Collapsible
 * - Shows only contextually relevant tabs
 */
export function WriteRightPanel({
    projectId,
    // seriesId removed - unused
    activeSceneId,
    activeSceneWordCount,
    // onCollapse removed - unused
}: WriteRightPanelProps) {
    const [activeTab, setActiveTab] = useState<RightPanelTab>('timeline');

    return (
        <TooltipProvider delayDuration={300}>
            <div className="h-full flex flex-col bg-background/50">
                {/* Tab Bar - Below the absolute toggle buttons (pt-12 accounts for them) */}
                <div className="flex-shrink-0 border-b border-border/50 p-1.5 pt-12 flex items-center justify-center gap-1 bg-muted/20">
                    {/* Tab buttons - centered */}
                    <TabButton
                        id="timeline"
                        icon={<Clock className="h-4 w-4" />}
                        label="Timeline"
                        activeTab={activeTab}
                        onClick={setActiveTab}
                    />
                    <TabButton
                        id="notes"
                        icon={<StickyNote className="h-4 w-4" />}
                        label="Scene Notes"
                        activeTab={activeTab}
                        onClick={setActiveTab}
                    />
                    <TabButton
                        id="comments"
                        icon={<MessageSquare className="h-4 w-4" />}
                        label="Comments"
                        activeTab={activeTab}
                        onClick={setActiveTab}
                        disabled  // Phase 4 feature
                    />
                    <TabButton
                        id="analysis"
                        icon={<BarChart3 className="h-4 w-4" />}
                        label="Prose Analysis"
                        activeTab={activeTab}
                        onClick={setActiveTab}
                        disabled  // Phase 4 feature
                    />
                </div>

                {/* Content Area */}
                <div className="flex-1 min-h-0 overflow-hidden">
                    {activeTab === 'timeline' && (
                        <StoryTimeline
                            projectId={projectId}
                            activeSceneWordCount={activeSceneWordCount}
                            hideHeader
                        />
                    )}

                    {activeTab === 'notes' && (
                        <SceneNotesPanel
                            sceneId={activeSceneId}
                            projectId={projectId}
                        />
                    )}

                    {activeTab === 'comments' && (
                        <ComingSoonPlaceholder
                            title="Comments"
                            description="Inline revision notes and comments. Coming in Phase 4."
                            icon={<MessageSquare className="h-8 w-8" />}
                        />
                    )}

                    {activeTab === 'analysis' && (
                        <ComingSoonPlaceholder
                            title="Prose Analysis"
                            description="Writing style analysis and suggestions. Coming in Phase 4."
                            icon={<BarChart3 className="h-8 w-8" />}
                        />
                    )}
                </div>
            </div>
        </TooltipProvider>
    );
}

/**
 * Placeholder for features coming in future phases
 */
function ComingSoonPlaceholder({
    title,
    description,
    icon,
}: {
    title: string;
    description: string;
    icon: React.ReactNode;
}) {
    return (
        <div className="h-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                {icon}
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">{title}</h3>
            <p className="text-xs max-w-[200px]">{description}</p>
        </div>
    );
}
