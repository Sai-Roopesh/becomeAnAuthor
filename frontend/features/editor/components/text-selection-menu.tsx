"use client";

import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Expand, RefreshCw, Link2, Minimize2, Wand2 } from "lucide-react";
import { useEffect, useState, useRef, memo, useCallback } from "react";
import { TextReplaceDialog } from "./text-replace-dialog";
import type { EditorStateManager } from "@/lib/core/editor-state-manager";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import "tippy.js/dist/tippy.css";

interface TextSelectionMenuProps {
  editor: Editor;
  projectId: string;
  seriesId: string;
  sceneId: string;
  editorStateManager: EditorStateManager | null;
  onRequestCodexLink?: (payload: {
    selectedText: string;
    range: { from: number; to: number };
    source: "selection-bubble" | "context-menu";
  }) => void;
}

type ReplaceAction = "expand" | "rephrase" | "shorten" | "tweak" | null;

export const TextSelectionMenu = memo(function TextSelectionMenu({
  editor,
  projectId,
  seriesId,
  sceneId,
  editorStateManager,
  onRequestCodexLink,
}: TextSelectionMenuProps) {
  const [action, setAction] = useState<ReplaceAction>(null);
  const [selectedText, setSelectedText] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const tippyRef = useRef<TippyInstance | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const contextTippyRef = useRef<TippyInstance | null>(null);
  const contextPositionRef = useRef<{
    x: number;
    y: number;
  } | null>(null);

  const handleAction = useCallback(
    (actionType: ReplaceAction) => {
      const { from, to } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to);
      setSelectedText(text);
      setAction(actionType);
      // Hide tippy when action is taken
      tippyRef.current?.hide();
    },
    [editor],
  );

  const handleClose = useCallback(() => {
    setAction(null);
    setSelectedText("");
  }, []);

  const requestCodexLink = useCallback(
    (source: "selection-bubble" | "context-menu") => {
      const { from, to } = editor.state.selection;
      if (from === to) return;

      const text = editor.state.doc.textBetween(from, to);
      onRequestCodexLink?.({
        selectedText: text,
        range: { from, to },
        source,
      });

      tippyRef.current?.hide();
      contextTippyRef.current?.hide();
    },
    [editor, onRequestCodexLink],
  );

  useEffect(() => {
    if (!menuRef.current) return;

    // Create tippy instance attached to the editor view
    const tippyInstance = tippy(document.body, {
      getReferenceClientRect: () => {
        const { from, to } = editor.state.selection;
        if (from === to) {
          return new DOMRect(-1000, -1000, 0, 0); // Hide when no selection
        }
        const start = editor.view.coordsAtPos(from);
        const end = editor.view.coordsAtPos(to);

        // Return bounding rect of selection
        return new DOMRect(
          start.left,
          start.top,
          end.right - start.left,
          end.bottom - start.top,
        );
      },
      appendTo: () => document.body,
      content: menuRef.current,
      showOnCreate: false,
      interactive: true,
      trigger: "manual",
      placement: "top",
      offset: [0, 10],
      animation: "fade",
      duration: 150,
      zIndex: 1080,
      maxWidth: "none",
      popperOptions: {
        modifiers: [
          {
            name: "preventOverflow",
            options: {
              padding: 8,
              boundary: "viewport",
            },
          },
          {
            name: "flip",
            options: {
              fallbackPlacements: ["bottom", "top-start", "bottom-start"],
            },
          },
        ],
      },
    });

    tippyRef.current = tippyInstance;

    const updateVisibility = () => {
      const { from, to } = editor.state.selection;
      if (from !== to && !action) {
        tippyInstance.setProps({
          getReferenceClientRect: () => {
            const start = editor.view.coordsAtPos(from);
            const end = editor.view.coordsAtPos(to);
            return new DOMRect(
              start.left,
              start.top,
              end.right - start.left,
              end.bottom - start.top,
            );
          },
        });
        tippyInstance.show();
      } else {
        tippyInstance.hide();
      }
    };

    editor.on("selectionUpdate", updateVisibility);

    return () => {
      editor.off("selectionUpdate", updateVisibility);
      tippyInstance.destroy();
      tippyRef.current = null;
    };
  }, [editor, action]);

  useEffect(() => {
    if (!contextMenuRef.current) return;

    const contextInstance = tippy(document.body, {
      getReferenceClientRect: () => {
        if (!contextPositionRef.current) {
          return new DOMRect(-1000, -1000, 0, 0);
        }
        return new DOMRect(
          contextPositionRef.current.x,
          contextPositionRef.current.y,
          0,
          0,
        );
      },
      appendTo: () => document.body,
      content: contextMenuRef.current,
      showOnCreate: false,
      interactive: true,
      trigger: "manual",
      placement: "right-start",
      offset: [0, 8],
      animation: "fade",
      duration: 120,
      zIndex: 1080,
    });

    contextTippyRef.current = contextInstance;

    const handleContextMenu = (event: MouseEvent) => {
      const { from, to } = editor.state.selection;
      if (from === to) return;

      const target = event.target;
      if (!(target instanceof Node) || !editor.view.dom.contains(target)) {
        return;
      }

      event.preventDefault();
      contextPositionRef.current = { x: event.clientX, y: event.clientY };
      contextInstance.setProps({
        getReferenceClientRect: () =>
          new DOMRect(event.clientX, event.clientY, 0, 0),
      });
      contextInstance.show();
    };

    const hideContextMenu = () => contextInstance.hide();

    editor.view.dom.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("scroll", hideContextMenu, true);
    document.addEventListener("mousedown", hideContextMenu);

    return () => {
      editor.view.dom.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("scroll", hideContextMenu, true);
      document.removeEventListener("mousedown", hideContextMenu);
      contextInstance.destroy();
      contextTippyRef.current = null;
    };
  }, [editor]);

  return (
    <>
      {/* Hidden menu template for tippy */}
      <div
        ref={menuRef}
        className="max-w-[calc(100vw-1rem)] overflow-x-auto rounded-lg border bg-background p-1 shadow-lg"
      >
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              handleAction("tweak");
            }}
            className="h-8 shrink-0 px-3"
          >
            <Wand2 className="h-4 w-4 mr-1.5" />
            Tweak & Generate
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              handleAction("expand");
            }}
            className="h-8 shrink-0 px-3"
          >
            <Expand className="h-4 w-4 mr-1.5" />
            Expand
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              handleAction("rephrase");
            }}
            className="h-8 shrink-0 px-3"
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Rephrase
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              handleAction("shorten");
            }}
            className="h-8 shrink-0 px-3"
          >
            <Minimize2 className="h-4 w-4 mr-1.5" />
            Shorten
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(event) => {
              event.preventDefault();
              requestCodexLink("selection-bubble");
            }}
            className="h-8 shrink-0 px-3"
          >
            <Link2 className="h-4 w-4 mr-1.5" />
            Link to Codex
          </Button>
        </div>
      </div>

      {/* Hidden context menu template for right-click selection link */}
      <div
        ref={contextMenuRef}
        className="rounded-md border bg-background p-1 shadow-md"
      >
        <Button
          variant="ghost"
          size="sm"
          onMouseDown={(event) => {
            event.preventDefault();
            requestCodexLink("context-menu");
          }}
          className="h-8 px-3"
        >
          <Link2 className="h-4 w-4 mr-1.5" />
          Link to Codex
        </Button>
      </div>

      {action && (
        <TextReplaceDialog
          action={action === "tweak" ? "rephrase" : action}
          selectedText={selectedText}
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
