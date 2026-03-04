"use client";

import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Square,
  Quote,
  Undo,
  Redo,
} from "lucide-react";
import { FormatMenu } from "./format-menu";
import { Separator } from "@/components/ui/separator";
import { formatShortcut } from "@/shared/utils/platform";
import { cn } from "@/lib/utils";

interface ToolbarButtonProps {
  icon: React.ElementType;
  label: string;
  shortcut?: string;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
}

function ToolbarButton({
  icon: Icon,
  label,
  shortcut,
  onClick,
  isActive,
  disabled,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
          className={`h-8 w-8 rounded-full ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="flex items-center gap-2">
        <span>{label}</span>
        {shortcut && (
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export function EditorToolbar({
  editor,
  onInsertSection,
  className,
}: {
  editor: Editor;
  onInsertSection?: () => void;
  className?: string;
}) {
  const undoShortcut = formatShortcut("z");
  const redoShortcut = formatShortcut("z", { useShift: true });
  const boldShortcut = formatShortcut("b");
  const italicShortcut = formatShortcut("i");
  const strikeShortcut = formatShortcut("s", { useShift: true });

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "flex min-w-0 items-center gap-1 overflow-x-auto px-1 py-1 [&::-webkit-scrollbar]:hidden",
          className,
        )}
      >
        {/* History */}
        <div className="flex shrink-0 items-center gap-0.5">
          <ToolbarButton
            icon={Undo}
            label="Undo"
            shortcut={undoShortcut}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          />
          <ToolbarButton
            icon={Redo}
            label="Redo"
            shortcut={redoShortcut}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          />
        </div>

        <Separator orientation="vertical" className="h-6 mx-1 bg-border/50" />

        {/* Basic Formatting */}
        <div className="flex shrink-0 items-center gap-0.5">
          <ToolbarButton
            icon={Bold}
            label="Bold"
            shortcut={boldShortcut}
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
          />
          <ToolbarButton
            icon={Italic}
            label="Italic"
            shortcut={italicShortcut}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
          />
          <ToolbarButton
            icon={Strikethrough}
            label="Strikethrough"
            shortcut={strikeShortcut}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive("strike")}
          />
        </div>

        <Separator orientation="vertical" className="h-6 mx-1 bg-border/50" />

        {/* Lists & Structure */}
        <div className="flex shrink-0 items-center gap-0.5">
          <ToolbarButton
            icon={List}
            label="Bullet List"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
          />
          <ToolbarButton
            icon={ListOrdered}
            label="Numbered List"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
          />
          <ToolbarButton
            icon={Quote}
            label="Quote"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive("blockquote")}
          />
        </div>

        {onInsertSection && (
          <>
            <Separator
              orientation="vertical"
              className="h-6 mx-1 bg-border/50"
            />
            <ToolbarButton
              icon={Square}
              label="Insert Section"
              onClick={onInsertSection}
            />
          </>
        )}

        <div className="shrink-0">
          <FormatMenu />
        </div>
      </div>
    </TooltipProvider>
  );
}
