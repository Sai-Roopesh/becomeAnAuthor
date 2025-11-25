'use client';

import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Strikethrough, List, ListOrdered, Square } from 'lucide-react';
import { FormatMenu } from './format-menu';

export function EditorToolbar({
    editor,
    isGenerating,
    onInsertSection
}: {
    editor: Editor;
    isGenerating: boolean;
    onInsertSection?: () => void;
}) {
    return (
        <div className="border-b p-2 flex items-center gap-1">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={editor.isActive('bold') ? 'bg-accent' : ''}
            >
                <Bold className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={editor.isActive('italic') ? 'bg-accent' : ''}
            >
                <Italic className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={editor.isActive('strike') ? 'bg-accent' : ''}
            >
                <Strikethrough className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={editor.isActive('bulletList') ? 'bg-accent' : ''}
            >
                <List className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={editor.isActive('orderedList') ? 'bg-accent' : ''}
            >
                <ListOrdered className="h-4 w-4" />
            </Button>

            {onInsertSection && (
                <>
                    <div className="w-px h-6 bg-border mx-1" />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onInsertSection}
                        title="Insert Section"
                    >
                        <Square className="h-4 w-4" />
                    </Button>
                </>
            )}

            <div className="flex-1" />

            <FormatMenu />
        </div>
    );
}
