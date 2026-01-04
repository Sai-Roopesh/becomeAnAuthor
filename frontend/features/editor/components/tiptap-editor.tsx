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
import { CollaborationPanel } from '@/components/collaboration-panel';
import { SaveStatusIndicator } from '@/components/ui/save-status-indicator';
import { useFormatStore } from '@/store/use-format-store';
import { Section } from '@/lib/tiptap-extensions/section-node';
import { AI_DEFAULTS } from '@/lib/config/constants';
import { TypewriterExtension } from '../extensions/TypewriterExtension';

import Mention from '@tiptap/extension-mention';
import { createCodexSuggestion } from './suggestion';
import { useAppServices } from '@/infrastructure/di/AppContext';
import { useContextAssembly } from '@/hooks/use-context-assembly';
import { assembleContext as assembleCodexContext } from '@/shared/utils/context-engine';
import type { TiptapContent } from '@/shared/types/tiptap';
import type { EditorView } from '@tiptap/pm/view';
import type { ContextItem } from '@/components/context-selector';
import { getStructure, loadScene } from '@/core/tauri/commands';
import { TauriNodeRepository } from '@/infrastructure/repositories/TauriNodeRepository';

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
    const [customRoomId, setCustomRoomId] = useState<string | undefined>(undefined);
    const { ydoc, status: collabStatus, peers, roomId, isJoinedRoom } = useCollaboration({
        sceneId,
        projectId,
        enabled: true,
        enableP2P,
        customRoomId,
    });

    // Handle joining an external room
    const handleJoinRoom = useCallback((externalRoomId: string) => {
        setCustomRoomId(externalRoomId);
        setEnableP2P(true);
    }, []);

    // Handle leaving external room (back to own room)
    const handleLeaveRoom = useCallback(() => {
        setCustomRoomId(undefined);
    }, []);

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
            // Typewriter mode - keeps cursor vertically centered while typing
            TypewriterExtension.configure({
                enabled: false, // Will be synced from formatSettings
                offsetPercent: 40,
                smoothScroll: true,
                scrollThreshold: 20,
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
                class: 'prose dark:prose-invert max-w-full focus:outline-none h-full px-8 py-6',
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

    // Sync Typewriter extension state with formatSettings
    useEffect(() => {
        if (!editor) return;

        // Update TypewriterExtension when settings change
        editor.commands.setTypewriterEnabled(formatSettings.typewriterMode);
        editor.commands.setTypewriterOffset(formatSettings.typewriterOffset);
    }, [editor, formatSettings.typewriterMode, formatSettings.typewriterOffset]);

    const { generateStream, isGenerating, model, cancel } = useAI({
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

        // Calculate expected paragraphs for structural guidance
        const targetWords = options.wordCount || 400;
        const expectedParagraphs = Math.ceil(targetWords / 80); // ~80 words per paragraph

        const prompt = `You MUST write EXACTLY ${targetWords} words (give or take 20 words). This is a strict requirement.

${codexContext}
CONTINUATION FROM:
${lastContext}${additionalContext}

CRITICAL WORD COUNT REQUIREMENT:
- Write EXACTLY ${targetWords} words (acceptable range: ${targetWords - 20} to ${targetWords + 20} words)
- Structure your response in ${expectedParagraphs} paragraphs, each approximately 80 words
- Do NOT stop early. Do NOT go significantly over.
- Count your words mentally as you write.

STYLE REQUIREMENTS:
- ${getModeGuidance(options.mode || 'continue-writing')}
- Show, don't tell: Use vivid sensory details (sight, sound, touch, smell, taste)
- No filter words: Avoid "saw," "felt," "heard," "seemed," "appeared"
- Active voice: Choose strong, specific verbs
- Narrative drive: Maintain or increase tension

GOOD EXAMPLE OF CONTINUATION:
[Context] "The door stood ajar."
[Output] "Hinges creaked—metal on metal, sharp in the silence. Beyond, shadows pooled thick. A floorboard groaned. Not empty, then."

${options.instructions || 'Continue the story naturally from the current context.'}

YOUR CONTINUATION (EXACTLY ${targetWords} words in ${expectedParagraphs} paragraphs):`;

        // generatedText variable removed - unused

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
                onChunk: () => {
                    // generatedText += chunk;
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
                        isJoinedRoom={isJoinedRoom}
                        onToggle={setEnableP2P}
                        onJoinRoom={handleJoinRoom}
                        onLeaveRoom={handleLeaveRoom}
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


