'use client';

import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Expand, RefreshCw, Minimize2 } from 'lucide-react';
import { useEffect, useRef, memo } from 'react';
import { TextReplaceDialog } from './text-replace-dialog';
import {
    useDialogState,
    textSelectionReducer,
    initialTextSelectionState
} from '@/hooks/use-dialog-state';
import type { EditorStateManager } from '@/lib/core/editor-state-manager';
import { EDITOR_CONSTANTS } from '@/lib/config/constants';

interface TextSelectionMenuProps {
    editor: Editor;
    projectId: string;
    seriesId: string;  // Required - series-first architecture
    sceneId: string;  // Required for save tracking
    editorStateManager: EditorStateManager | null;  // Required for immediate save
}

type ReplaceAction = 'expand' | 'rephrase' | 'shorten' | null;

export const TextSelectionMenu = memo(function TextSelectionMenu({ editor, projectId, seriesId, sceneId, editorStateManager }: TextSelectionMenuProps) {
    // Replace 4 useState calls with single useReducer
    const [state, dispatch] = useDialogState(
        initialTextSelectionState,
        textSelectionReducer
    );
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateMenu = () => {
            const { from, to } = editor.state.selection;
            if (from !== to) {
                const text = editor.state.doc.textBetween(from, to);
                const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

                if (wordCount >= EDITOR_CONSTANTS.MIN_SELECTION_WORDS) {
                    // Get the DOM position of the selection
                    const { view } = editor;
                    const start = view.coordsAtPos(from);
                    const end = view.coordsAtPos(to);

                    // Position menu above the selection, centered
                    const centerX = (start.left + end.right) / 2;
                    dispatch({
                        type: 'SHOW_MENU',
                        payload: {
                            text,
                            position: {
                                top: start.top - EDITOR_CONSTANTS.MENU_OFFSET_PX,
                                left: centerX,
                            }
                        }
                    });
                } else {
                    dispatch({ type: 'HIDE_MENU' });
                }
            } else {
                dispatch({ type: 'HIDE_MENU' });
            }
        };

        editor.on('selectionUpdate', updateMenu);
        editor.on('update', updateMenu);

        return () => {
            editor.off('selectionUpdate', updateMenu);
            editor.off('update', updateMenu);
        };
    }, [editor, dispatch]);

    const handleAction = (actionType: ReplaceAction) => {
        const { from, to } = editor.state.selection;
        const text = editor.state.doc.textBetween(from, to);

        const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
        if (wordCount < 4) {
            return;
        }

        // Set the action to open dialog
        dispatch({ type: 'SET_ACTION', payload: actionType });
    };

    const handleClose = () => {
        dispatch({ type: 'SET_ACTION', payload: null });
    };

    if (!state.showMenu && !state.action) {
        return null;
    }

    return (
        <>
            {state.showMenu && !state.action && (
                <div
                    ref={menuRef}
                    className="fixed z-50 bg-background border rounded-lg shadow-lg flex items-center gap-1 p-1"
                    style={{
                        top: `${state.menuPosition.top}px`,
                        left: `${state.menuPosition.left}px`,
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
                </div>
            )}

            {state.action && (
                <TextReplaceDialog
                    action={state.action}
                    selectedText={state.selectedText}
                    editor={editor}
                    onClose={handleClose}
                    projectId={projectId}
                    seriesId={seriesId}
                    sceneId={sceneId}
                    editorStateManager={editorStateManager}
                />
            )}
        </>
    );
});
