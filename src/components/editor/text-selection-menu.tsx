'use client';

import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Expand, RefreshCw, Minimize2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { TextReplaceDialog } from './text-replace-dialog';

interface TextSelectionMenuProps {
    editor: Editor;
}

type ReplaceAction = 'expand' | 'rephrase' | 'shorten' | null;

export function TextSelectionMenu({ editor }: TextSelectionMenuProps) {
    const [action, setAction] = useState<ReplaceAction>(null);
    const [selectedText, setSelectedText] = useState('');
    const [showMenu, setShowMenu] = useState(false);

    useEffect(() => {
        const updateMenu = () => {
            const { from, to } = editor.state.selection;
            if (from !== to) {
                const text = editor.state.doc.textBetween(from, to);
                const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
                setShowMenu(wordCount >= 4);
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
            alert('Please select at least 4 words');
            return;
        }

        setSelectedText(text);
        setAction(actionType);
        setShowMenu(false);
    };

    if (!showMenu) {
        return null;
    }

    return (
        <>
            <div className="fixed top-20 right-8 z-50 bg-background border rounded-md shadow-lg flex p-1 gap-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAction('expand')}
                    className="h-7"
                >
                    <Expand className="h-3 w-3 mr-1" />
                    Expand
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAction('rephrase')}
                    className="h-7"
                >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Rephrase
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAction('shorten')}
                    className="h-7"
                >
                    <Minimize2 className="h-3 w-3 mr-1" />
                    Shorten
                </Button>
            </div>

            {action && (
                <TextReplaceDialog
                    action={action}
                    selectedText={selectedText}
                    editor={editor}
                    onClose={() => {
                        setAction(null);
                        setShowMenu(false);
                    }}
                />
            )}
        </>
    );
}
