'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProjectStore } from '@/store/use-project-store';
import { cn } from '@/lib/utils';
import { DocumentNode } from '@/lib/types';
import { ChevronRight, ChevronDown, Plus, FileText, Folder, Book, Users } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreateNodeDialog } from '@/components/create-node-dialog';
import { SnippetList } from '@/components/snippets/snippet-list';
import { CodexList } from '@/components/codex/codex-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ProjectSettingsDialog } from '@/components/project-settings-dialog';

export function ProjectNavigation({ projectId, onSelectSnippet }: { projectId: string, onSelectSnippet?: (id: string) => void }) {
    const project = useLiveQuery(() => db.projects.get(projectId));
    const nodes = useLiveQuery(
        () => db.nodes.where('projectId').equals(projectId).sortBy('order')
    );
    const { activeSceneId, setActiveSceneId } = useProjectStore();
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const [dialogState, setDialogState] = useState<{
        open: boolean;
        parentId: string | null;
        type: 'act' | 'chapter' | 'scene';
    }>({ open: false, parentId: null, type: 'act' });

    const openCreateDialog = (parentId: string | null, type: 'act' | 'chapter' | 'scene') => {
        setDialogState({ open: true, parentId, type });
    };

    if (!project) return null;

    // Build Tree
    const acts = nodes?.filter(n => n.type === 'act') || [];
    const getChildren = (parentId: string) => nodes?.filter(n => n.parentId === parentId) || [];

    const renderNode = (node: DocumentNode, level: number) => {
        const children = getChildren(node.id);
        const isScene = node.type === 'scene';
        const Icon = isScene ? FileText : (node.type === 'chapter' ? Folder : Book);

        return (
            <div key={node.id} className="select-none">
                <div
                    className={cn(
                        "flex items-center gap-2 p-1 hover:bg-accent rounded cursor-pointer text-sm group",
                        activeSceneId === node.id && "bg-accent font-medium"
                    )}
                    style={{ paddingLeft: `${level * 12 + 4}px` }}
                    onClick={() => isScene && setActiveSceneId(node.id)}
                >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate flex-1">{node.title}</span>

                    {!isScene && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                                e.stopPropagation();
                                openCreateDialog(node.id, node.type === 'act' ? 'chapter' : 'scene');
                            }}
                        >
                            <Plus className="h-3 w-3" />
                        </Button>
                    )}
                </div>

                {!isScene && children.map(child => renderNode(child, level + 1))}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-muted/10 border-r">
            <div className="p-4 border-b flex items-center justify-between">
                <div className="min-w-0">
                    <h2 className="font-semibold truncate" title={project.title}>{project.title}</h2>
                    <p className="text-xs text-muted-foreground truncate">{project.author}</p>
                </div>
                <ProjectSettingsDialog projectId={projectId} />
            </div>

            <Tabs defaultValue="manuscript" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="grid w-full grid-cols-3 rounded-none border-b bg-transparent p-0">
                    <TabsTrigger value="manuscript" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2">
                        <Book className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Manuscript</span>
                    </TabsTrigger>
                    <TabsTrigger value="codex" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2">
                        <Users className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Codex</span>
                    </TabsTrigger>
                    <TabsTrigger value="snippets" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2">
                        <FileText className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Snippets</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="manuscript" className="flex-1 overflow-hidden flex flex-col m-0">
                    <div className="p-2 border-b flex justify-between items-center bg-background/50">
                        <span className="text-xs font-medium text-muted-foreground">Structure</span>
                        <Button variant="ghost" size="sm" className="h-6 w-6" onClick={() => openCreateDialog(null, 'act')}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-2">
                            {acts.map(act => renderNode(act, 0))}
                            {acts.length === 0 && (
                                <div className="p-4 text-center text-xs text-muted-foreground">
                                    No acts yet. Click + to start.
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="codex" className="flex-1 overflow-hidden m-0">
                    <CodexList projectId={projectId} />
                </TabsContent>

                <TabsContent value="snippets" className="flex-1 overflow-hidden m-0">
                    <SnippetList projectId={projectId} onSelect={(id) => onSelectSnippet?.(id)} />
                </TabsContent>
            </Tabs>

            <CreateNodeDialog
                open={dialogState.open}
                onOpenChange={(open) => setDialogState(prev => ({ ...prev, open }))}
                projectId={projectId}
                parentId={dialogState.parentId}
                type={dialogState.type}
            />
        </div>
    );
}
