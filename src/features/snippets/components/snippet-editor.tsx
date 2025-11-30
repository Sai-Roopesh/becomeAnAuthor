'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pin, PinOff, Trash2, MoreVertical } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfirmation } from '@/hooks/use-confirmation';
import { useSnippetRepository } from '@/hooks/use-snippet-repository';

export function SnippetEditor({ snippetId, onClose }: { snippetId: string, onClose?: () => void }) {
    const snippetRepo = useSnippetRepository();
    const [title, setTitle] = useState('');
    const [pinned, setPinned] = useState(false);
    const [initialContent, setInitialContent] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadSnippet = async () => {
            const snippet = await snippetRepo.get(snippetId);
            if (snippet) {
                setTitle(snippet.title);
                setPinned(snippet.pinned);
                setInitialContent(snippet.content);
            }
            setIsLoading(false);
        };
        loadSnippet();
    }, [snippetId, snippetRepo]);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Typography,
            Placeholder.configure({
                placeholder: 'Write something amazing...',
            }),
        ],
        content: initialContent,
        editorProps: {
            attributes: {
                class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[300px] p-4',
            },
        },
        immediatelyRender: false,
    }, [initialContent]); // Re-create editor when initialContent changes (loaded)

    const debouncedTitle = useDebounce(title, 500);
    const [content, setContent] = useState<any>(null);
    const debouncedContent = useDebounce(content, 1000);

    // Sync Title
    useEffect(() => {
        if (debouncedTitle) {
            snippetRepo.update(snippetId, { title: debouncedTitle });
        }
    }, [debouncedTitle, snippetId, snippetRepo]);

    // Sync Content
    useEffect(() => {
        if (editor) {
            const updateHandler = () => setContent(editor.getJSON());
            editor.on('update', updateHandler);
            return () => { editor.off('update', updateHandler); };
        }
    }, [editor]);

    useEffect(() => {
        if (debouncedContent) {
            snippetRepo.update(snippetId, { content: debouncedContent });
        }
    }, [debouncedContent, snippetId, snippetRepo]);

    const togglePin = async () => {
        const newPinned = !pinned;
        setPinned(newPinned);
        await snippetRepo.togglePin(snippetId);
    };

    const { confirm, ConfirmationDialog } = useConfirmation();

    const handleDelete = async () => {
        const confirmed = await confirm({
            title: 'Delete Snippet',
            description: 'Are you sure you want to delete this snippet? This action cannot be undone.',
            confirmText: 'Delete',
            variant: 'destructive'
        });

        if (confirmed) {
            await snippetRepo.delete(snippetId);
            if (onClose) onClose();
        }
    };

    if (isLoading) return <div className="p-4">Loading...</div>;

    return (
        <div className="flex flex-col h-full bg-background border-l">
            <div className="flex items-center gap-2 p-2 border-b">
                <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="font-semibold border-none shadow-none focus-visible:ring-0 px-2 h-8"
                    placeholder="Snippet Title"
                />
                <Button variant="ghost" size="icon" onClick={togglePin} title={pinned ? "Unpin" : "Pin to sidebar"}>
                    {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="flex-1 overflow-y-auto">
                <EditorContent editor={editor} />
            </div>

            <ConfirmationDialog />
        </div>
    );
}
