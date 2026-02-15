"use client";

import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Expand, RefreshCw, Minimize2, Wand2 } from "lucide-react";
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
}

type ReplaceAction = "expand" | "rephrase" | "shorten" | "tweak" | null;

export const TextSelectionMenu = memo(function TextSelectionMenu({
  editor,
  projectId,
  seriesId,
  sceneId,
  editorStateManager,
}: TextSelectionMenuProps) {
  const [action, setAction] = useState<ReplaceAction>(null);
  const [selectedText, setSelectedText] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const tippyRef = useRef<TippyInstance | null>(null);

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
        </div>
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
