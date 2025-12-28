'use client';

import { cn } from '@/lib/utils';
import { useProjectStore } from '@/store/use-project-store';
import { FileText } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface StatusBarItem {
    id: string;
    content: React.ReactNode;
    tooltip?: string;
    onClick?: () => void;
    position?: 'left' | 'right';
}

interface StatusBarProps {
    /** Word count for current scene */
    sceneWordCount?: number;
    /** Total word count for project */
    projectWordCount?: number;
    /** Custom items to display */
    items?: StatusBarItem[];
    /** Whether the status bar is visible */
    visible?: boolean;
    /** Class name for custom styling */
    className?: string;
}

/**
 * StatusBar - Bottom status bar for persistent UI elements
 * 
 * Features:
 * - Word count display (scene and project)
 * - Sprint timer slot (Phase 5)
 * - Goal progress slot (Phase 5)
 * - Auto-hides when empty
 * - 32px height, responsive content
 * 
 * @example
 * <StatusBar
 *   sceneWordCount={523}
 *   projectWordCount={45000}
 *   items={[
 *     { id: 'sprint', content: <SprintTimer />, position: 'right' }
 *   ]}
 * />
 */
export function StatusBar({
    sceneWordCount,
    projectWordCount,
    items = [],
    visible = true,
    className,
}: StatusBarProps) {
    const { viewMode } = useProjectStore();

    // Only show in write mode for now
    const shouldShow = visible && viewMode === 'write';

    if (!shouldShow) return null;

    const leftItems = items.filter(item => item.position !== 'right');
    const rightItems = items.filter(item => item.position === 'right');

    return (
        <TooltipProvider delayDuration={300}>
            <div
                className={cn(
                    "flex-shrink-0 h-8 border-t border-border/50",
                    "bg-muted/30 backdrop-blur-sm",
                    "px-4 flex items-center gap-4 text-xs",
                    "transition-all duration-200",
                    className
                )}
            >
                {/* Left section: Word counts */}
                <div className="flex items-center gap-4">
                    {/* Scene word count */}
                    {sceneWordCount !== undefined && (
                        <StatusItem
                            icon={<FileText className="h-3 w-3" />}
                            label="Scene"
                            value={sceneWordCount.toLocaleString()}
                            tooltip="Words in current scene"
                        />
                    )}

                    {/* Project word count */}
                    {projectWordCount !== undefined && (
                        <StatusItem
                            icon={<FileText className="h-3 w-3" />}
                            label="Total"
                            value={projectWordCount.toLocaleString()}
                            tooltip="Total words in project"
                        />
                    )}

                    {/* Custom left items */}
                    {leftItems.map(item => (
                        <div
                            key={item.id}
                            onClick={item.onClick}
                            className={cn(item.onClick && "cursor-pointer hover:text-foreground")}
                        >
                            {item.tooltip ? (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span>{item.content}</span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">{item.tooltip}</TooltipContent>
                                </Tooltip>
                            ) : (
                                item.content
                            )}
                        </div>
                    ))}
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Right section: Sprint, goals, etc. */}
                <div className="flex items-center gap-4">
                    {/* Custom right items */}
                    {rightItems.map(item => (
                        <div
                            key={item.id}
                            onClick={item.onClick}
                            className={cn(item.onClick && "cursor-pointer hover:text-foreground")}
                        >
                            {item.tooltip ? (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span>{item.content}</span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">{item.tooltip}</TooltipContent>
                                </Tooltip>
                            ) : (
                                item.content
                            )}
                        </div>
                    ))}

                    {/* Placeholder for future features */}
                    {/* Sprint timer slot - Phase 5 */}
                    {/* <SprintTimer /> */}

                    {/* Goal progress slot - Phase 5 */}
                    {/* <GoalProgress /> */}
                </div>
            </div>
        </TooltipProvider>
    );
}

/**
 * Individual status item with icon, label, and value
 */
function StatusItem({
    icon,
    label,
    value,
    tooltip,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    tooltip?: string;
}) {
    const content = (
        <div className="flex items-center gap-1.5 text-muted-foreground">
            {icon}
            <span className="hidden sm:inline text-muted-foreground/70">{label}:</span>
            <span className="font-medium text-foreground">{value}</span>
        </div>
    );

    if (tooltip) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>{content}</TooltipTrigger>
                <TooltipContent side="top">{tooltip}</TooltipContent>
            </Tooltip>
        );
    }

    return content;
}

/**
 * Hook to compute project word count from all scenes
 * This will be implemented when we integrate the status bar
 */
// export function useProjectWordCount(projectId: string): number {
//     const scenes = useLiveQuery(...);
//     return scenes?.reduce((sum, scene) => sum + (scene.wordCount || 0), 0) || 0;
// }
