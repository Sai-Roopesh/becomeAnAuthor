'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Book, Folder, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { DocumentNode, Scene } from '@/domain/entities/types';
import { useManuscriptNodes } from '../hooks/use-manuscript-nodes';

interface ManuscriptTreeSelectorProps {
    projectId: string;
    selected: string[];
    onSelect: (ids: string[]) => void;
}

export function ManuscriptTreeSelector({ projectId, selected, onSelect }: ManuscriptTreeSelectorProps) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    // ✅ Architecture compliant: Use hook that wraps repository
    const nodes = useManuscriptNodes(projectId);

    if (!nodes) return null;

    const acts = nodes.filter(n => n.type === 'act');
    const getChildren = (parentId: string) => nodes.filter(n => n.parentId === parentId);

    const toggleExpanded = (nodeId: string) => {
        setExpanded(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
    };

    const toggleSelected = (nodeId: string, checked: boolean) => {
        if (checked) {
            onSelect([...selected, nodeId]);
        } else {
            onSelect(selected.filter(id => id !== nodeId));
        }
    };

    const renderNode = (node: DocumentNode | Scene, level: number): React.ReactElement => {
        const children = getChildren(node.id);
        const isExpanded = expanded[node.id];
        const isSelected = selected.includes(node.id);
        const Icon = node.type === 'scene' ? FileText : node.type === 'chapter' ? Folder : Book;
        const hasChildren = children.length > 0;

        return (
            <div key={node.id}>
                <div
                    className="flex items-center gap-2 py-1.5 px-2 hover:bg-accent rounded cursor-pointer"
                    style={{ paddingLeft: `${level * 16 + 8}px` }}
                >
                    {hasChildren && (
                        <button
                            onClick={() => toggleExpanded(node.id)}
                            className="p-0.5 hover:bg-accent-foreground/10 rounded"
                        >
                            {isExpanded ? (
                                <ChevronDown className="h-3 w-3" />
                            ) : (
                                <ChevronRight className="h-3 w-3" />
                            )}
                        </button>
                    )}
                    {!hasChildren && <div className="w-4" />}

                    <Checkbox
                        id={node.id}
                        checked={isSelected}
                        onCheckedChange={(checked) => toggleSelected(node.id, checked as boolean)}
                    />

                    <Icon className="h-4 w-4 text-muted-foreground" />

                    <label
                        htmlFor={node.id}
                        className="flex-1 text-sm cursor-pointer"
                    >
                        {node.title}
                    </label>
                </div>

                {hasChildren && isExpanded && (
                    <div>
                        {children.map(child => renderNode(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="border rounded-lg">
            <div className="p-2 border-b bg-muted/50">
                <span className="text-xs font-medium text-muted-foreground">
                    Select Acts, Chapters, or Scenes
                </span>
            </div>
            <ScrollArea className="h-64">
                <div className="p-2">
                    {acts.map(act => renderNode(act, 0))}
                    {acts.length === 0 && (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No manuscript structure found. Create acts in the Write tab first.
                        </div>
                    )}
                </div>
            </ScrollArea>
            {selected.length > 0 && (
                <div className="p-2 border-t bg-muted/50 text-xs text-muted-foreground">
                    {selected.length} item{selected.length !== 1 ? 's' : ''} selected
                </div>
            )}
        </div>
    );
}
