'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { PanelLeft, PanelLeftClose, PanelRight, PanelRightClose } from 'lucide-react';
import { useState, useCallback } from 'react';

interface PanelConfig {
    /** Panel content */
    content: React.ReactNode;
    /** Default size as percentage (0-100) */
    defaultSize?: number;
    /** Minimum size as percentage */
    minSize?: number;
    /** Maximum size as percentage */
    maxSize?: number;
    /** Whether panel can be collapsed */
    collapsible?: boolean;
    /** Whether panel is currently collapsed (controlled) */
    collapsed?: boolean;
    /** Collapse change handler */
    onCollapsedChange?: (collapsed: boolean) => void;
    /** Additional class names */
    className?: string;
}

interface PanelGroupProps {
    /** Left panel configuration */
    left?: PanelConfig;
    /** Center panel content (required) */
    center: React.ReactNode;
    /** Right panel configuration */
    right?: PanelConfig;
    /** Show toggle buttons */
    showToggles?: boolean;
    /** Additional class names for container */
    className?: string;
}

/**
 * PanelGroup - Reusable three-column resizable panel layout
 * 
 * Provides a consistent panel system across all views:
 * - Write mode: Sidebar | Editor | Timeline
 * - Chat mode: Thread list | Chat | (none)
 * - Plan mode: (none) | Plan content | (none)
 * 
 * Features:
 * - Resizable panels with min/max constraints
 * - Collapsible left and right panels
 * - Toggle buttons in corners
 * - Responsive: panels stack on mobile
 * - Consistent styling and animations
 * 
 * @example
 * <PanelGroup
 *   left={{
 *     content: <Sidebar />,
 *     defaultSize: 20,
 *     minSize: 15,
 *     maxSize: 30,
 *     collapsible: true,
 *     collapsed: !showSidebar,
 *     onCollapsedChange: (c) => setShowSidebar(!c),
 *   }}
 *   center={<MainContent />}
 *   right={{
 *     content: <RightPanel />,
 *     defaultSize: 22,
 *     minSize: 18,
 *     maxSize: 30,
 *     collapsible: true,
 *   }}
 *   showToggles
 * />
 */
export function PanelGroup({
    left,
    center,
    right,
    showToggles = true,
    className,
}: PanelGroupProps) {
    // Internal collapsed state for uncontrolled panels
    const [leftCollapsed, setLeftCollapsed] = useState(left?.collapsed ?? false);
    const [rightCollapsed, setRightCollapsed] = useState(right?.collapsed ?? false);

    const isLeftCollapsed = left?.collapsed ?? leftCollapsed;
    const isRightCollapsed = right?.collapsed ?? rightCollapsed;

    const toggleLeft = useCallback(() => {
        const newValue = !isLeftCollapsed;
        if (left?.onCollapsedChange) {
            left.onCollapsedChange(newValue);
        } else {
            setLeftCollapsed(newValue);
        }
    }, [isLeftCollapsed, left]);

    const toggleRight = useCallback(() => {
        const newValue = !isRightCollapsed;
        if (right?.onCollapsedChange) {
            right.onCollapsedChange(newValue);
        } else {
            setRightCollapsed(newValue);
        }
    }, [isRightCollapsed, right]);

    return (
        <div className={cn("h-full flex overflow-hidden relative", className)}>
            {/* Toggle buttons */}
            {showToggles && (
                <>
                    {/* Left toggle */}
                    {left?.collapsible && (
                        <div className="absolute top-2 left-2 z-30">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 bg-background/80 backdrop-blur-sm border border-border/50"
                                        onClick={toggleLeft}
                                    >
                                        {isLeftCollapsed ? (
                                            <PanelLeft className="h-4 w-4" />
                                        ) : (
                                            <PanelLeftClose className="h-4 w-4" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    {isLeftCollapsed ? 'Show sidebar' : 'Hide sidebar'}
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    )}

                    {/* Right toggle */}
                    {right?.collapsible && (
                        <div className="absolute top-2 right-2 z-30">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 bg-background/80 backdrop-blur-sm border border-border/50"
                                        onClick={toggleRight}
                                    >
                                        {isRightCollapsed ? (
                                            <PanelRight className="h-4 w-4" />
                                        ) : (
                                            <PanelRightClose className="h-4 w-4" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    {isRightCollapsed ? 'Show panel' : 'Hide panel'}
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    )}
                </>
            )}

            {/* Panel layout */}
            <ResizablePanelGroup direction="horizontal" className="flex-1">
                {/* Left panel */}
                {left && !isLeftCollapsed && (
                    <>
                        <ResizablePanel
                            defaultSize={left.defaultSize ?? 20}
                            minSize={left.minSize ?? 15}
                            maxSize={left.maxSize ?? 30}
                            className={cn(
                                "bg-background/50 backdrop-blur-sm border-r border-border/50",
                                left.className
                            )}
                        >
                            {left.content}
                        </ResizablePanel>
                        <ResizableHandle className="w-1 bg-transparent hover:bg-primary/20 transition-colors" />
                    </>
                )}

                {/* Center panel */}
                <ResizablePanel
                    defaultSize={calculateCenterSize(left, right, isLeftCollapsed, isRightCollapsed)}
                    className="bg-background/30"
                >
                    {center}
                </ResizablePanel>

                {/* Right panel */}
                {right && !isRightCollapsed && (
                    <>
                        <ResizableHandle className="w-1 bg-transparent hover:bg-primary/20 transition-colors" />
                        <ResizablePanel
                            defaultSize={right.defaultSize ?? 22}
                            minSize={right.minSize ?? 18}
                            maxSize={right.maxSize ?? 30}
                            className={cn(
                                "bg-background/50 backdrop-blur-sm border-l border-border/50",
                                right.className
                            )}
                        >
                            {right.content}
                        </ResizablePanel>
                    </>
                )}
            </ResizablePanelGroup>
        </div>
    );
}

/**
 * Calculate center panel default size based on visible panels
 */
function calculateCenterSize(
    left: PanelConfig | undefined,
    right: PanelConfig | undefined,
    leftCollapsed: boolean,
    rightCollapsed: boolean
): number {
    let size = 100;

    if (left && !leftCollapsed) {
        size -= left.defaultSize ?? 20;
    }
    if (right && !rightCollapsed) {
        size -= right.defaultSize ?? 22;
    }

    return Math.max(size, 30); // Minimum 30% for center
}
