import { logger } from '@/shared/utils/logger';

const log = logger.scope('TiptapEditor');

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Collaboration from '@tiptap/extension-collaboration';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useAI } from '@/hooks/use-ai';
import { EditorStateManager } from '@/lib/core/editor-state-manager';
import type { SaveStatus } from '@/lib/core/editor-state-manager';
import { useCollaboration } from '@/hooks/use-collaboration';
import { EditorToolbar } from './editor-toolbar';
import { TextSelectionMenu } from './text-selection-menu';
import { ContinueWritingMenu } from './continue-writing-menu';
import { CollaborationPanel } from '@/features/collaboration';
import { SaveStatusIndicator } from '@/components/ui/save-status-indicator';
import { useFormatStore } from '@/store/use-format-store';
import { Section } from '@/lib/tiptap-extensions/section-node';
import { AI_DEFAULTS } from '@/lib/config/constants';

import Mention from '@tiptap/extension-mention';
import { createCodexSuggestion } from './suggestion';
import { useAppServices } from '@/infrastructure/di/AppContext';
import { useContextAssembly } from '@/hooks/use-context-assembly';
import { assembleContext as assembleCodexContext } from '@/shared/utils/context-engine';
import type { TiptapContent } from '@/shared/types/tiptap';
import type { EditorView } from '@tiptap/pm/view';
import type { ContextItem } from '@/features/shared/components';

// Structure node from Tauri backend
interface StructureNode {
    id: string;
    type: string;
    file?: string;
    children?: StructureNode[];
}

// Generation options passed from ContinueWritingMenu
interface GenerateOptions {
    wordCount?: number;
    mode?: string;
    instructions?: string;
    selectedContexts?: ContextItem[];
}


export function TiptapEditor({
    sceneId,
    projectId,
    seriesId,  // Required - series-first architecture
    content,
    onWordCountChange
}: {
    sceneId: string,
    projectId: string,
    seriesId: string,  // Required - series-first architecture
    content: TiptapContent | null | undefined,
    onWordCountChange?: (count: number) => void
}) {
    const formatSettings = useFormatStore();
    const [showContinueMenu, setShowContinueMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
    const previousSceneIdRef = useRef<string | null>(null);
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const { codexRepository: codexRepo } = useAppServices();
    const { assembleContext } = useContextAssembly(projectId);

    // Save state management with EditorStateManager
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
    const [lastSaved, setLastSaved] = useState<number | undefined>();
    const editorStateManagerRef = useRef<EditorStateManager | null>(null);

    // Collaboration state
    const [enableP2P, setEnableP2P] = useState(false);
    const { ydoc, status: collabStatus, peers, roomId } = useCollaboration({
        sceneId,
        projectId,
        enabled: true,
        enableP2P,
    });

    // Create suggestion configuration with seriesId and repository (series-first)
    const suggestion = useMemo(
        () => createCodexSuggestion(seriesId, codexRepo),
        [seriesId, codexRepo]
    );

    // Get cursor position in the editor
    const getCursorPosition = useCallback((view: EditorView) => {
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

    // Build extensions array - add Collaboration only when ydoc is ready
    const extensions = useMemo(() => {
        // Use AnyExtension to avoid type narrowing issues with mixed extension types
        const base: Parameters<typeof useEditor>[0]['extensions'] = [
            // When collaborating, use StarterKit without undo/redo (Yjs handles it)
            ydoc ? StarterKit.configure({ undoRedo: false }) : StarterKit,
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
        ];

        // Add Collaboration extension when ydoc is available
        if (ydoc && base) {
            base.push(
                Collaboration.configure({
                    document: ydoc,
                })
            );
        }

        return base;
    }, [suggestion, ydoc]);

    const editor = useEditor({
        immediatelyRender: false,
        extensions,
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
                log.debug(`Switching from ${previousSceneIdRef.current} to ${sceneId}`);

                // Step 1: Flush EditorStateManager before switching
                if (previousSceneIdRef.current !== null && editor && !editor.isDestroyed) {
                    try {
                        log.debug(`Flushing save for scene ${previousSceneIdRef.current}`);

                        if (editorStateManagerRef.current) {
                            await editorStateManagerRef.current.flush();
                        }

                        log.debug(`Save completed for ${previousSceneIdRef.current}`);
                    } catch (error) {
                        console.error('[SceneSwitch] Failed to save scene before switch:', error);
                    }
                }

                // Step 2: Fetch FRESH content DIRECTLY from backend, bypassing ALL caches
                log.debug(`Fetching fresh content for scene ${sceneId} from BACKEND`);
                try {
                    const { getStructure, loadScene } = await import('@/core/tauri/commands');
                    const { TauriNodeRepository } = await import('@/infrastructure/repositories/TauriNodeRepository');

                    const projectPath = TauriNodeRepository.getInstance().getProjectPath();
                    if (!projectPath) throw new Error('No project path');

                    // Get structure to find the scene file
                    const structure = await getStructure(projectPath);

                    // Flatten and find the scene
                    const flattenStructure = (nodes: StructureNode[]): StructureNode[] => {
                        const result: StructureNode[] = [];
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

                        log.debug(`Loaded FRESH content from file`, { nodeCount: parsedContent.content?.length || 0, preview: JSON.stringify(parsedContent).substring(0, 150) });
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

    // Create EditorStateManager when editor is ready
    useEffect(() => {
        if (!editor || !sceneId) return;

        // Create EditorStateManager
        const manager = new EditorStateManager(editor, sceneId, {
            debounceMs: 500,
        });

        // Subscribe to status changes
        const unsubscribe = manager.onStatusChange((status, lastSavedAt) => {
            setSaveStatus(status);
            setLastSaved(lastSavedAt);
        });

        editorStateManagerRef.current = manager;

        return () => {
            unsubscribe();
            manager.destroy();
            editorStateManagerRef.current = null;
        };
    }, [editor, sceneId]);

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
        system: `You are an expert fiction writer specializing in immersive storytelling.

CORE PRINCIPLES:
- Show, don't tell: Use sensory details and actions to convey emotions
- Remove filter words: Eliminate "saw," "felt," "heard," "seemed," "appeared"
- Maintain tension: Every paragraph should pull the reader forward
- Match tone: Adapt seamlessly to the existing narrative voice

WRITING STYLE:
- Active voice over passive
- Strong, specific verbs over weak verb + adverb
- Concise, punchy sentences for action; longer, flowing sentences for reflection
- Vivid sensory details: sight, sound, touch, smell, taste

When continuing a story, extend the narrative naturally while honoring the established world, characters, and tone.`,
        streaming: true,
        persistModel: true,
        operationName: 'Generate',
    });

    const generate = async (options: GenerateOptions) => {
        if (!editor) return;

        const currentText = editor.getText();
        const lastContext = currentText.slice(-AI_DEFAULTS.CONTEXT_WINDOW_CHARS);

        // ✅ Auto-detect @mentioned codex entries from scene content
        const codexContext = await assembleCodexContext(sceneId, '', seriesId);

        // ✅ User-selected additional context  
        const additionalContext = options.selectedContexts && options.selectedContexts.length > 0
            ? '\n\n=== ADDITIONAL CONTEXT ===\n' + await assembleContext(options.selectedContexts)
            : '';

        // Enhanced prompt with style guidelines and examples
        const getModeGuidance = (mode: string) => {
            switch (mode) {
                case 'scene-beat':
                    return 'Create a pivotal moment with clear value change—the scene must end differently than it began.';
                case 'codex-progression':
                    return 'Analyze recent events and suggest how they affect characters, relationships, or world elements.';
                default:
                    return 'Match the existing tone and pacing, maintaining narrative tension.';
            }
        };

        const prompt = `Continue this story with approximately ${options.wordCount || 400} words.

${codexContext}
CONTINUATION FROM:
${lastContext}${additionalContext}

REQUIREMENTS:
- Style: ${getModeGuidance(options.mode || 'continue-writing')}
- Show, don't tell: Use vivid sensory details (sight, sound, touch, smell, taste)
- No filter words: Avoid "saw," "felt," "heard," "seemed," "appeared"
- Active voice: Choose strong, specific verbs
- Narrative drive: Maintain or increase tension

GOOD EXAMPLE OF CONTINUATION:
[Context] "The door stood ajar."
[Output] "Hinges creaked—metal on metal, sharp in the silence. Beyond, shadows pooled thick. A floorboard groaned. Not empty, then."

${options.instructions || 'Continue the story naturally from the current context.'}

YOUR CONTINUATION (approximately ${options.wordCount || 400} words):`;

        let generatedText = '';

        await generateStream(
            {
                prompt,
                // Use word count from UI with fallback
                maxTokens: (await import('@/lib/config/model-specs')).calculateMaxTokens(
                    model,
                    options.wordCount || 400
                ),
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

                    // ✅ NEW: Use EditorStateManager for immediate save
                    if (editorStateManagerRef.current) {
                        await editorStateManagerRef.current.saveImmediate();
                    }

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
            <div className="flex items-center justify-between border-b">
                <EditorToolbar
                    editor={editor}
                    onInsertSection={handleInsertSection}
                />
                <div className="flex items-center gap-4 pr-4">
                    <SaveStatusIndicator status={saveStatus} {...(lastSaved !== undefined && { lastSaved })} />
                    <CollaborationPanel
                        status={collabStatus}
                        peers={peers}
                        roomId={roomId}
                        enabled={enableP2P}
                        onToggle={setEnableP2P}
                    />
                </div>
            </div>
            <TextSelectionMenu
                editor={editor}
                projectId={projectId}
                seriesId={seriesId}
                sceneId={sceneId}
                editorStateManager={editorStateManagerRef.current}
            />
            <ContinueWritingMenu
                open={showContinueMenu}
                onOpenChange={handleMenuClose}
                onGenerate={generate}
                projectId={projectId}
                seriesId={seriesId}
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


