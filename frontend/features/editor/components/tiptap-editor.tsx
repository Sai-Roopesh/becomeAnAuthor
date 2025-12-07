'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { useAutoSave } from '@/hooks/use-auto-save';
import { useAI } from '@/hooks/use-ai';
import { EditorToolbar } from './editor-toolbar';
import { TextSelectionMenu } from './text-selection-menu';
import { ContinueWritingMenu } from './continue-writing-menu';
import { useFormatStore } from '@/store/use-format-store';
import { Section } from '@/lib/tiptap-extensions/section-node';
import { AI_DEFAULTS } from '@/lib/config/constants';

import Mention from '@tiptap/extension-mention';
import { createCodexSuggestion } from './suggestion';
import { useCodexRepository } from '@/hooks/use-codex-repository';
import { useNodeRepository } from '@/hooks/use-node-repository';

export function TiptapEditor({
    sceneId,
    projectId,
    content,
    onWordCountChange
}: {
    sceneId: string,
    projectId: string,
    content: any,
    onWordCountChange?: (count: number) => void
}) {
    const formatSettings = useFormatStore();
    const [showContinueMenu, setShowContinueMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
    const previousSceneIdRef = useRef<string | null>(null);
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const codexRepo = useCodexRepository();
    const nodeRepo = useNodeRepository(); // ✅ Add repository access

    // Create suggestion configuration with projectId and repository
    const suggestion = useMemo(
        () => createCodexSuggestion(projectId, codexRepo),
        [projectId, codexRepo]
    );

    // Get cursor position in the editor
    const getCursorPosition = useCallback((view: any) => {
        const { state } = view;
        const { selection } = state;

        // Get the DOM coordinates of the cursor
        const coords = view.coordsAtPos(selection.from);

        return {
            x: coords.left,
            y: coords.bottom + 8, // Position slightly below the cursor
        };
    }, []);

    // Validate content is proper Tiptap structure before passing to editor
    // Empty objects {} cause "Unknown node type: undefined" errors
    const validatedContent = (content && typeof content === 'object' && content.type === 'doc' && Array.isArray(content.content))
        ? content
        : { type: 'doc', content: [{ type: 'paragraph' }] };

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Typography,
            CharacterCount,
            Section,
            Placeholder.configure({
                placeholder: 'Start writing your masterpiece... Type / for commands or press Cmd+J to continue',
            }),
            Mention.configure({
                HTMLAttributes: {
                    class: 'mention',
                },
                suggestion,
            }),
        ],
        content: validatedContent,
        onUpdate: ({ editor }) => {
            if (onWordCountChange) {
                const words = editor.storage.characterCount.words();
                onWordCountChange(words);
            }
            // Note: Auto-linking of @mentions will be handled separately
            // to avoid any potential issues with the editor
        },
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert max-w-full focus:outline-none min-h-[500px] px-8 py-6',
            },
            handleKeyDown: (view, event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'j') {
                    event.preventDefault();
                    const pos = getCursorPosition(view);
                    setMenuPosition(pos);
                    setShowContinueMenu(true);
                    return true;
                }
                return false;
            },
        },
    });

    useEffect(() => {
        if (!editor) return;

        // When scene changes, save previous scene and load new scene
        const handleSceneSwitch = async () => {
            if (previousSceneIdRef.current !== sceneId) {
                console.log(`[SceneSwitch] Switching from ${previousSceneIdRef.current} to ${sceneId}`);

                // Step 1: Save the previous scene's content before switching
                if (previousSceneIdRef.current !== null && editor && !editor.isDestroyed) {
                    try {
                        const oldSceneContent = editor.getJSON();
                        const oldSceneId = previousSceneIdRef.current;

                        console.log(`[SceneSwitch] Captured content for scene ${oldSceneId}, has ${oldSceneContent.content?.length || 0} nodes`);

                        const { saveCoordinator } = await import('@/lib/core/save-coordinator');
                        await saveCoordinator.scheduleSave(
                            oldSceneId,
                            () => oldSceneContent
                        );
                        console.log(`[SceneSwitch] Save completed for ${oldSceneId}`);
                    } catch (error) {
                        console.error('[SceneSwitch] Failed to save scene before switch:', error);
                    }
                }

                // Step 2: Fetch FRESH content DIRECTLY from backend, bypassing ALL caches
                console.log(`[SceneSwitch] Fetching fresh content for scene ${sceneId} from BACKEND`);
                try {
                    const { getStructure, loadScene } = await import('@/lib/tauri/commands');
                    const { getCurrentProjectPath } = await import('@/infrastructure/repositories/TauriNodeRepository');

                    const projectPath = getCurrentProjectPath();
                    if (!projectPath) throw new Error('No project path');

                    // Get structure to find the scene file
                    const structure = await getStructure(projectPath);

                    // Flatten and find the scene
                    const flattenStructure = (nodes: any[]): any[] => {
                        const result: any[] = [];
                        for (const node of nodes) {
                            result.push(node);
                            if (node.children?.length) {
                                result.push(...flattenStructure(node.children));
                            }
                        }
                        return result;
                    };

                    const allNodes = flattenStructure(structure);
                    const sceneNode = allNodes.find(n => n.id === sceneId);

                    if (sceneNode?.file) {
                        // Load scene content DIRECTLY from backend file
                        const scene = await loadScene(projectPath, sceneNode.file);

                        // Parse the content
                        let parsedContent;
                        try {
                            parsedContent = typeof scene.content === 'string'
                                ? JSON.parse(scene.content)
                                : scene.content;
                        } catch {
                            parsedContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: scene.content }] }] };
                        }

                        console.log(`[SceneSwitch] Loaded FRESH content from file, has ${parsedContent.content?.length || 0} nodes`);
                        console.log(`[SceneSwitch] Content preview:`, JSON.stringify(parsedContent).substring(0, 150));
                        editor.commands.setContent(parsedContent);
                    } else {
                        console.warn(`[SceneSwitch] Scene ${sceneId} has no file, using empty`);
                        editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph' }] });
                    }
                } catch (error) {
                    console.error('[SceneSwitch] Failed to fetch from backend:', error);
                    // Fallback to prop
                    editor.commands.setContent(validatedContent);
                }

                previousSceneIdRef.current = sceneId;
            }
        };

        handleSceneSwitch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sceneId, editor]); // validatedContent removed - we fetch fresh from backend now

    useAutoSave(sceneId, editor);

    // Typewriter Scrolling - Keep current line centered
    useEffect(() => {
        if (!editor || !formatSettings.typewriterMode || !editorContainerRef.current) return;

        const scrollToCenter = () => {
            const container = editorContainerRef.current;
            if (!container) return;

            try {
                const { from } = editor.state.selection;
                const coords = editor.view.coordsAtPos(from);
                const containerRect = container.getBoundingClientRect();

                // Calculate where we want the cursor to be (40% from top)
                const targetY = containerRect.height * 0.4;
                const cursorRelativeY = coords.top - containerRect.top;
                const scrollDelta = cursorRelativeY - targetY;

                if (Math.abs(scrollDelta) > 20) { // Only scroll if more than 20px off
                    container.scrollBy({
                        top: scrollDelta,
                        behavior: 'smooth'
                    });
                }
            } catch (e) {
                // Ignore errors from coordsAtPos when selection is invalid
            }
        };

        // Listen for selection/cursor changes
        editor.on('selectionUpdate', scrollToCenter);

        return () => {
            editor.off('selectionUpdate', scrollToCenter);
        };
    }, [editor, formatSettings.typewriterMode]);

    const { generateStream, isGenerating, model, setModel, cancel } = useAI({
        system: 'You are a creative writing assistant helping to continue a story.',
        streaming: true,
        persistModel: true,
        operationName: 'Continue Writing',
    });

    const generate = async (options: any) => {
        if (!editor) return;

        const currentText = editor.getText();
        const lastContext = currentText.slice(-AI_DEFAULTS.CONTEXT_WINDOW_CHARS);

        const prompt = `Context: ${lastContext}\n\n${options.instructions || `Write approximately ${options.wordCount || 200} words continuing from this context.`}`;

        let generatedText = '';

        await generateStream(
            {
                prompt,
                maxTokens: options.wordCount ? options.wordCount * 2 : AI_DEFAULTS.MAX_TOKENS,
                temperature: AI_DEFAULTS.TEMPERATURE,
            },
            {
                onChunk: (chunk) => {
                    generatedText += chunk;
                },
                onComplete: async (fullText) => {
                    if (fullText && editor) {
                        editor.chain().focus().insertContent(fullText).run();
                    }

                    const { saveCoordinator } = await import('@/lib/core/save-coordinator');
                    await saveCoordinator.scheduleSave(sceneId, () => editor!.getJSON());

                    // Close the continue writing menu after successful generation
                    setShowContinueMenu(false);
                },
            }
        );
    };

    useEffect(() => {
        if (editor && onWordCountChange) {
            onWordCountChange(editor.storage.characterCount.words());
        }
    }, [editor, onWordCountChange]);

    useEffect(() => {
        if (editor) {
            editor.view.dom.setAttribute(
                'style',
                `font-family: ${formatSettings.fontFamily}; font-size: ${formatSettings.fontSize}px; line-height: ${formatSettings.lineHeight}; text-align: ${formatSettings.alignment};`
            );
        }
    }, [editor, formatSettings]);

    if (!editor) {
        return null;
    }

    const handleInsertSection = () => {
        editor
            .chain()
            .focus()
            .insertContent({
                type: 'section',
                content: [{ type: 'paragraph' }],
            })
            .run();
    };

    const handleMenuClose = (open: boolean) => {
        setShowContinueMenu(open);
        if (!open) {
            setMenuPosition(null);
        }
    };

    return (
        <div className="w-full h-full flex flex-col">
            <EditorToolbar
                editor={editor}
                isGenerating={isGenerating}
                onInsertSection={handleInsertSection}
            />
            <TextSelectionMenu editor={editor} projectId={projectId} />
            <ContinueWritingMenu
                open={showContinueMenu}
                onOpenChange={handleMenuClose}
                onGenerate={generate}
                projectId={projectId}
                isGenerating={isGenerating}
                onCancel={cancel}
                position={menuPosition}
            />
            <div
                ref={editorContainerRef}
                className={`flex-1 overflow-y-auto p-4 ${formatSettings.typewriterMode ? 'scroll-smooth' : ''}`}
            >
                <div className="mx-auto" style={{ maxWidth: `${formatSettings.pageWidth}px` }}>
                    <EditorContent editor={editor} />
                </div>
            </div>
        </div>
    );
}


