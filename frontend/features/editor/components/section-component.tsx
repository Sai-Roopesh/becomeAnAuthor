'use client';

import { NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, ChevronRight, MoreVertical, Palette, EyeOff, Copy, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { FEATURE_FLAGS } from '@/lib/config/constants';

// Section node attributes
interface SectionAttrs {
    title: string;
    color: string;
    excludeFromAI: boolean;
    collapsed: boolean;
}

export function SectionComponent({ node, updateAttributes, deleteNode }: NodeViewProps) {
    const [isEditing, setIsEditing] = useState(false);
    const attrs = node.attrs as SectionAttrs;
    const { title, color, excludeFromAI, collapsed } = attrs;

    const colors = [
        { name: 'Blue', value: '#3b82f6' },
        { name: 'Green', value: '#10b981' },
        { name: 'Yellow', value: '#f59e0b' },
        { name: 'Red', value: '#ef4444' },
        { name: 'Purple', value: '#8b5cf6' },
        { name: 'Pink', value: '#ec4899' },
        { name: 'Gray', value: '#6b7280' },
    ];

    const handleCopy = () => {
        // Get the text content
        const text = node.textContent;
        navigator.clipboard.writeText(text);
    };

    const handleDissolve = () => {
        // Feature hidden by FEATURE_FLAGS
    };

    return (
        <NodeViewWrapper className="my-4">
            <div
                className="border-l-4 rounded-md overflow-hidden"
                style={{ borderColor: color }}
            >
                {/* Header */}
                <div className="bg-muted/30 p-2 flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateAttributes({ collapsed: !collapsed })}
                    >
                        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>

                    {isEditing ? (
                        <Input
                            value={title}
                            onChange={(e) => updateAttributes({ title: e.target.value })}
                            onBlur={() => setIsEditing(false)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') setIsEditing(false);
                            }}
                            className="h-7 flex-1"
                            autoFocus
                        />
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="flex-1 text-left font-medium text-sm"
                        >
                            {title}
                        </button>
                    )}

                    {excludeFromAI && (
                        <div className="text-xs bg-orange-500/20 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded">
                            <EyeOff className="h-3 w-3 inline mr-1" />
                            Hidden from AI
                        </div>
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={() => updateAttributes({ excludeFromAI: !excludeFromAI })}
                            >
                                <EyeOff className="h-4 w-4 mr-2" />
                                {excludeFromAI ? 'Include in AI' : 'Exclude from AI'}
                            </DropdownMenuItem>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <Palette className="h-4 w-4 mr-2" />
                                        Change Color
                                    </DropdownMenuItem>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent side="right">
                                    {colors.map((c) => (
                                        <DropdownMenuItem
                                            key={c.value}
                                            onClick={() => updateAttributes({ color: c.value })}
                                        >
                                            <div
                                                className="h-4 w-4 rounded mr-2"
                                                style={{ backgroundColor: c.value }}
                                            />
                                            {c.name}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenuItem onClick={handleCopy}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Content
                            </DropdownMenuItem>

                            {FEATURE_FLAGS.DISSOLVE_SECTION && (
                                <DropdownMenuItem onClick={handleDissolve}>
                                    <ChevronDown className="h-4 w-4 mr-2" />
                                    Dissolve Section
                                </DropdownMenuItem>
                            )}

                            <DropdownMenuItem onClick={deleteNode} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Section
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Content */}
                {!collapsed && (
                    <div className="p-4 bg-background/50">
                        <NodeViewContent className="section-content" />
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    );
}
