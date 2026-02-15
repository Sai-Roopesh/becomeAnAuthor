import type { Editor, Range } from "@tiptap/core";
import type { ReactNode } from "react";

/** Context passed to slash command handlers */
export interface SlashCommandContext {
  editor: Editor;
  range: Range;
}

/** A slash command item */
export interface SlashCommandItem {
  title: string;
  description: string;
  icon: ReactNode;
  command: (ctx: SlashCommandContext) => void;
  keywords?: string[];
}
