'use client';

import { useLiveQuery, invalidateQueries } from '@/hooks/use-live-query';
import { useSnippetRepository } from '@/hooks/use-snippet-repository';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, FileText, Trash2, MoreVertical } from 'lucide-react';
import { useState } from 'react';
// uuidv4 removed - unused
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from '@/shared/utils/toast-service';
import { useConfirmation } from '@/hooks/use-confirmation';

export function SnippetList({ projectId, onSelect }: { projectId: string, onSelect: (id: string) => void }) {
    const snippetRepo = useSnippetRepository();
    const [search, setSearch] = useState('');
    const { confirm, ConfirmationDialog } = useConfirmation();

    const snippets = useLiveQuery(
        () => snippetRepo.getByProject(projectId),
        [projectId]
    );

    const filteredSnippets = snippets?.filter(s =>
        s.title.toLowerCase().includes(search.toLowerCase())
    );

    const createSnippet = async () => {
        const newSnippet = await snippetRepo.create({
            projectId,
            title: 'New Snippet',
        });
        invalidateQueries(); // Refresh snippet list
        onSelect(newSnippet.id);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const confirmed = await confirm({
            title: 'Delete Snippet',
            description: 'Are you sure you want to delete this snippet? This action cannot be undone.',
            confirmText: 'Delete',
            variant: 'destructive'
        });

        if (confirmed) {
            await snippetRepo.delete(id);
            invalidateQueries(); // Refresh snippet list
            toast.success('Snippet deleted');
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-2 space-y-2">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search snippets..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Button className="w-full justify-start" size="sm" onClick={createSnippet}>
                    <Plus className="mr-2 h-4 w-4" /> New Snippet
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredSnippets?.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-8">
                        No snippets found.
                    </div>
                )}
                {filteredSnippets?.map(snippet => (
                    <div key={snippet.id} className="group flex items-center justify-between p-2 hover:bg-accent rounded-md cursor-pointer" onClick={() => onSelect(snippet.id)}>
                        <div className="flex items-center gap-2 overflow-hidden">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate text-sm font-medium">{snippet.title}</span>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                                    <MoreVertical className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => handleDelete(snippet.id, e)} className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ))}
            </div>

            <ConfirmationDialog />
        </div>
    );
}
