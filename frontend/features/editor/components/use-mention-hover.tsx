"use client";

import { useEffect, useRef } from "react";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { createRoot, Root } from "react-dom/client";
import { CodexMentionTooltip } from "./codex-mention-tooltip";
import type { Editor } from "@tiptap/core";
import type { ICodexRepository } from "@/domain/repositories/ICodexRepository";

interface UseMentionHoverProps {
    editor: Editor | null;
    seriesId: string;
    containerRef: React.RefObject<HTMLDivElement | null>;
    codexRepo: ICodexRepository;
    onOpenDetail?: ((codexId: string) => void) | undefined;
}

/**
 * Hook to add hover tooltips to @mention nodes in the editor.
 * Uses event delegation to detect hovers on .mention elements.
 */
export function useMentionHover({
    editor,
    seriesId,
    containerRef,
    codexRepo,
    onOpenDetail,
}: UseMentionHoverProps) {
    const tippyInstanceRef = useRef<TippyInstance | null>(null);
    const reactRootRef = useRef<Root | null>(null);

    useEffect(() => {
        if (!editor || !containerRef.current) return;

        const container = containerRef.current;

        const handleMouseEnter = async (event: MouseEvent) => {
            const target = event.target as HTMLElement;

            // Check if hovering over a mention node
            const mentionEl = target.closest(".mention") as HTMLElement | null;
            if (!mentionEl) return;

            // Only show tooltip for mentions in the editor content (ProseMirror),
            // not in popups or suggestion lists
            const isInEditorContent = mentionEl.closest(".ProseMirror");
            if (!isInEditorContent) return;

            // Get the codex ID from the data attribute
            const codexId = mentionEl.getAttribute("data-id");
            if (!codexId) return;

            // Destroy previous tooltip if exists
            if (tippyInstanceRef.current) {
                tippyInstanceRef.current.destroy();
                tippyInstanceRef.current = null;
            }

            // Cleanup previous React root
            if (reactRootRef.current) {
                reactRootRef.current.unmount();
                reactRootRef.current = null;
            }

            // Fetch entry data (outside React context)
            let entry = null;
            try {
                const entries = await codexRepo.getBySeries(seriesId);
                entry = entries.find((e) => e.id === codexId) || null;
            } catch {
                entry = null;
            }

            // Create new tooltip content
            const tooltipContent = document.createElement("div");
            tooltipContent.className = "bg-popover text-popover-foreground rounded-md border shadow-md overflow-hidden";

            // Mount React component into tooltip
            const root = createRoot(tooltipContent);
            reactRootRef.current = root;
            root.render(
                <CodexMentionTooltip
                    entry={entry}
                    onOpenDetail={onOpenDetail}
                />
            );

            // Create tippy instance
            tippyInstanceRef.current = tippy(mentionEl, {
                content: tooltipContent,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
                appendTo: document.body,
                // Enable flip to reposition when near screen edges
                popperOptions: {
                    modifiers: [
                        {
                            name: "flip",
                            options: {
                                fallbackPlacements: ["top-start", "top", "bottom"],
                            },
                        },
                        {
                            name: "preventOverflow",
                            options: {
                                boundary: "viewport",
                            },
                        },
                    ],
                },
                onHidden: () => {
                    // Cleanup on hide
                    if (reactRootRef.current) {
                        reactRootRef.current.unmount();
                        reactRootRef.current = null;
                    }
                },
            });

            tippyInstanceRef.current.show();
        };

        const handleMouseLeave = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const mentionEl = target.closest(".mention");

            if (!mentionEl) return;

            // Check if moving to the tooltip itself
            const relatedTarget = event.relatedTarget as HTMLElement | null;
            if (relatedTarget?.closest(".tippy-box")) {
                return; // Don't hide if moving to tooltip
            }

            // Delay to allow moving to tooltip
            setTimeout(() => {
                if (tippyInstanceRef.current && !tippyInstanceRef.current.state.isShown) {
                    return;
                }

                // Check if mouse is over tippy content
                const tippyEl = document.querySelector(".tippy-box:hover");
                if (tippyEl) return;

                tippyInstanceRef.current?.hide();
            }, 100);
        };

        // Add event listeners with delegation
        container.addEventListener("mouseenter", handleMouseEnter, true);
        container.addEventListener("mouseleave", handleMouseLeave, true);

        return () => {
            container.removeEventListener("mouseenter", handleMouseEnter, true);
            container.removeEventListener("mouseleave", handleMouseLeave, true);

            if (tippyInstanceRef.current) {
                tippyInstanceRef.current.destroy();
                tippyInstanceRef.current = null;
            }

            if (reactRootRef.current) {
                reactRootRef.current.unmount();
                reactRootRef.current = null;
            }
        };
    }, [editor, seriesId, containerRef, codexRepo, onOpenDetail]);
}

