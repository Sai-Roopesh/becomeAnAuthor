'use client';

import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import {
    Bold,
    Italic,
    Strikethrough,
    List,
    ListOrdered,
    Square,
    Heading1,
    Heading2,
    Quote,
    Undo,
    Redo
} from 'lucide-react';
import { FormatMenu } from './format-menu';
import { Separator } from '@/components/ui/separator';

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
        <div className="sticky top-0 z-20 mx-auto max-w-3xl mt-4 mb-6 rounded-full border border-border/40 bg-background/80 backdrop-blur-md shadow-sm px-4 py-2 flex items-center gap-1 transition-all hover:border-border/60 hover:shadow-md supports-[backdrop-filter]:bg-background/60">
            {/* History */}
            <div className="flex items-center gap-0.5">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                >
                    <Undo className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                >
                    <Redo className="h-4 w-4" />
                </Button>
            </div>

            <Separator orientation="vertical" className="h-6 mx-1 bg-border/50" />

            {/* Basic Formatting */}
            <div className="flex items-center gap-0.5">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`h-8 w-8 rounded-full ${editor.isActive('bold') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <Bold className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`h-8 w-8 rounded-full ${editor.isActive('italic') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <Italic className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={`h-8 w-8 rounded-full ${editor.isActive('strike') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <Strikethrough className="h-4 w-4" />
                </Button>
            </div>

            <Separator orientation="vertical" className="h-6 mx-1 bg-border/50" />

            {/* Lists & Structure */}
            <div className="flex items-center gap-0.5">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`h-8 w-8 rounded-full ${editor.isActive('bulletList') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <List className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`h-8 w-8 rounded-full ${editor.isActive('orderedList') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <ListOrdered className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={`h-8 w-8 rounded-full ${editor.isActive('blockquote') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <Quote className="h-4 w-4" />
                </Button>
            </div>

            {onInsertSection && (
                <>
                    <Separator orientation="vertical" className="h-6 mx-1 bg-border/50" />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onInsertSection}
                        title="Insert Section"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
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
