'use client';

import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Expand, RefreshCw, Minimize2, Sparkles } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { TextReplaceDialog } from './text-replace-dialog';

interface TextSelectionMenuProps {
    editor: Editor;
}

type ReplaceAction = 'expand' | 'rephrase' | 'shorten' | null;

export function TextSelectionMenu({ editor }: TextSelectionMenuProps) {
    const [action, setAction] = useState<ReplaceAction>(null);
    const [selectedText, setSelectedText] = useState('');
    const [showMenu, setShowMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateMenu = () => {
            const { from, to } = editor.state.selection;
            if (from !== to) {
                const text = editor.state.doc.textBetween(from, to);
                const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

                if (wordCount >= 4) {
                    setShowMenu(true);
                    // Get the DOM position of the selection
                    const { view } = editor;
                    const start = view.coordsAtPos(from);
                    const end = view.coordsAtPos(to);

                    // Position menu above the selection, centered
                    const centerX = (start.left + end.right) / 2;
                    setMenuPosition({
                        top: start.top - 50, // 50px above selection
                        left: centerX,
                    });
                } else {
                    setShowMenu(false);
                }
            } else {
                setShowMenu(false);
            }
        };

        editor.on('selectionUpdate', updateMenu);
        editor.on('update', updateMenu);

        return () => {
            editor.off('selectionUpdate', updateMenu);
            editor.off('update', updateMenu);
        };
    }, [editor]);

    const handleAction = (actionType: ReplaceAction) => {
        const { from, to } = editor.state.selection;
        const text = editor.state.doc.textBetween(from, to);

        const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
        if (wordCount < 4) {
            return;
        }

        // Immediately set the text and action to open dialog
        setSelectedText(text);
        setAction(actionType);
    };

    const handleClose = () => {
        setAction(null);
        // Don't hide menu immediately, let it update naturally
    };

    if (!showMenu && !action) {
        return null;
    }

    return (
        <>
            {showMenu && !action && (
                <div
                    ref={menuRef}
                    className="fixed z-50 bg-background border rounded-lg shadow-lg flex items-center gap-1 p-1"
                    style={{
                        top: `${menuPosition.top}px`,
                        left: `${menuPosition.left}px`,
                        transform: 'translateX(-50%)', // Center horizontally
                    }}
                >
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAction('expand')}
                        className="h-8 px-3"
                    >
                        <Expand className="h-4 w-4 mr-1.5" />
                        Expand
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAction('rephrase')}
                        className="h-8 px-3"
                    >
                        <RefreshCw className="h-4 w-4 mr-1.5" />
                        Rephrase
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAction('shorten')}
                        className="h-8 px-3"
                    >
                        <Minimize2 className="h-4 w-4 mr-1.5" />
                        Shorten
                    </Button>
                    <div className="h-4 w-px bg-border mx-1" />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAction('expand')}
                        className="h-8 px-3 text-primary"
                    >
                        <Sparkles className="h-4 w-4 mr-1.5" />
                        Tweak & Generate
                    </Button>
                </div>
            )}

            {action && (
                <TextReplaceDialog
                    action={action}
                    selectedText={selectedText}
                    editor={editor}
                    onClose={handleClose}
                />
            )}
        </>
    );
}
