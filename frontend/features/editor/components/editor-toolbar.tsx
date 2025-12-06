'use client';

import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
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

interface ToolbarButtonProps {
    icon: React.ElementType;
    label: string;
    shortcut?: string;
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
}

function ToolbarButton({ icon: Icon, label, shortcut, onClick, isActive, disabled }: ToolbarButtonProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClick}
                    disabled={disabled}
                    className={`h-8 w-8 rounded-full ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <Icon className="h-4 w-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="flex items-center gap-2">
                <span>{label}</span>
                {shortcut && <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">{shortcut}</kbd>}
            </TooltipContent>
        </Tooltip>
    );
}

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
        <TooltipProvider delayDuration={300}>
            <div className="sticky top-0 z-20 mx-auto max-w-3xl mt-4 mb-6 rounded-full border border-border/40 bg-background/80 backdrop-blur-md shadow-sm px-4 py-2 flex items-center gap-1 transition-all hover:border-border/60 hover:shadow-md supports-[backdrop-filter]:bg-background/60">
                {/* History */}
                <div className="flex items-center gap-0.5">
                    <ToolbarButton
                        icon={Undo}
                        label="Undo"
                        shortcut="⌘Z"
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                    />
                    <ToolbarButton
                        icon={Redo}
                        label="Redo"
                        shortcut="⌘⇧Z"
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                    />
                </div>

                <Separator orientation="vertical" className="h-6 mx-1 bg-border/50" />

                {/* Basic Formatting */}
                <div className="flex items-center gap-0.5">
                    <ToolbarButton
                        icon={Bold}
                        label="Bold"
                        shortcut="⌘B"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        isActive={editor.isActive('bold')}
                    />
                    <ToolbarButton
                        icon={Italic}
                        label="Italic"
                        shortcut="⌘I"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        isActive={editor.isActive('italic')}
                    />
                    <ToolbarButton
                        icon={Strikethrough}
                        label="Strikethrough"
                        shortcut="⌘⇧S"
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        isActive={editor.isActive('strike')}
                    />
                </div>

                <Separator orientation="vertical" className="h-6 mx-1 bg-border/50" />

                {/* Lists & Structure */}
                <div className="flex items-center gap-0.5">
                    <ToolbarButton
                        icon={List}
                        label="Bullet List"
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        isActive={editor.isActive('bulletList')}
                    />
                    <ToolbarButton
                        icon={ListOrdered}
                        label="Numbered List"
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        isActive={editor.isActive('orderedList')}
                    />
                    <ToolbarButton
                        icon={Quote}
                        label="Quote"
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        isActive={editor.isActive('blockquote')}
                    />
                </div>

                {onInsertSection && (
                    <>
                        <Separator orientation="vertical" className="h-6 mx-1 bg-border/50" />
                        <ToolbarButton
                            icon={Square}
                            label="Insert Section"
                            onClick={onInsertSection}
                        />
                    </>
                )}

                <div className="flex-1" />

                <FormatMenu />
            </div>
        </TooltipProvider>
    );
}

