import { Extension, Editor, type Range } from "@tiptap/core";
import Suggestion, {
  type SuggestionOptions,
  type SuggestionProps,
  type SuggestionKeyDownProps,
} from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { SlashCommandsList } from "./slash-commands-list";
import {
  Sparkles,
  BookMarked,
  Minus,
  FileText,
  PenTool,
  Link2,
} from "lucide-react";
import type { SlashCommandItem } from "./slash-command-types";

function getSelectionMenuPosition(editor: Editor): { x: number; y: number } {
  const coords = editor.view.coordsAtPos(editor.state.selection.from);
  return { x: coords.left, y: coords.bottom + 8 };
}

/**
 * Get all available slash commands
 *
 * Commands:
 * - /spark - AI-powered writing prompts
 * - /beat - Scene beat marker
 * - /continue - Continue writing with AI
 * - /link codex - Open codex linking picker
 * - /section - Colored section block
 * - /divider - Horizontal rule
 */
export function getSuggestionItems(query: string): SlashCommandItem[] {
  const items: SlashCommandItem[] = [
    {
      title: "Spark Ideas",
      description: "Get AI-powered writing prompts for this scene",
      icon: <Sparkles className="h-4 w-4 text-amber-500" />,
      keywords: ["spark", "ai", "prompt", "idea", "generate", "inspire"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        // Dispatch event to open Spark popover
        const event = new CustomEvent("openSparkPopover", {
          detail: {
            position: getSelectionMenuPosition(editor),
          },
        });
        window.dispatchEvent(event);
      },
    },
    {
      title: "Scene Beat",
      description: "A pivotal moment where something important changes",
      icon: <BookMarked className="h-4 w-4 text-purple-500" />,
      keywords: ["beat", "scene", "moment", "pivot"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        // Trigger scene beat dialog
        const event = new CustomEvent("openSceneBeat", {
          detail: {
            position: getSelectionMenuPosition(editor),
          },
        });
        window.dispatchEvent(event);
      },
    },
    {
      title: "Continue Writing",
      description: "AI-assisted continuation of your story",
      icon: <PenTool className="h-4 w-4 text-blue-500" />,
      keywords: ["continue", "write", "ai", "generate"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        // Trigger AI generation menu (Cmd+J equivalent)
        const event = new CustomEvent("continueWriting", {
          detail: {
            position: getSelectionMenuPosition(editor),
          },
        });
        window.dispatchEvent(event);
      },
    },
    {
      title: "Link to Codex",
      description: "Link selected text or cursor position to a codex entry",
      icon: <Link2 className="h-4 w-4 text-emerald-500" />,
      keywords: ["link", "codex", "character", "location", "entity"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        const event = new CustomEvent("openCodexLinkPicker", {
          detail: {
            position: getSelectionMenuPosition(editor),
          },
        });
        window.dispatchEvent(event);
      },
    },
    {
      title: "Section",
      description: "Create a colored section block",
      icon: <FileText className="h-4 w-4 text-green-500" />,
      keywords: ["section", "block", "color", "container"],
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({
            type: "section",
            content: [{ type: "paragraph" }],
          })
          .run();
      },
    },
    {
      title: "Divider",
      description: "Insert a scene divider",
      icon: <Minus className="h-4 w-4 text-muted-foreground" />,
      keywords: ["divider", "horizontal", "rule", "break", "separator"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
  ];

  // Filter by query
  if (!query) return items;

  const lowerQuery = query.toLowerCase();
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery) ||
      item.keywords?.some((kw) => kw.includes(lowerQuery)),
  );
}

/**
 * Slash Commands Extension
 *
 * Provides a command palette triggered by typing "/" in the editor.
 * Uses Tiptap's Suggestion plugin for the dropdown UI.
 */
export const SlashCommands = Extension.create({
  name: "slashCommands",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: Range;
          props: SlashCommandItem;
        }) => {
          props.command({ editor, range });
        },
      } as Partial<SuggestionOptions>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => getSuggestionItems(query),
        render: () => {
          let component: ReactRenderer | null = null;
          let popup: TippyInstance[] | null = null;

          return {
            onStart: (props: SuggestionProps<SlashCommandItem>) => {
              component = new ReactRenderer(SlashCommandsList, {
                props: {
                  items: props.items,
                  command: props.command,
                },
                editor: props.editor,
              });

              if (!props.clientRect) return;

              popup = tippy("body", {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
              });
            },

            onUpdate(props: SuggestionProps<SlashCommandItem>) {
              component?.updateProps({
                items: props.items,
                command: props.command,
              });

              if (popup?.[0] && props.clientRect) {
                popup[0].setProps({
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                });
              }
            },

            onKeyDown(props: SuggestionKeyDownProps) {
              if (props.event?.key === "Escape") {
                popup?.[0]?.hide();
                return true;
              }

              return (
                (
                  component?.ref as unknown as {
                    onKeyDown?: (props: unknown) => boolean;
                  }
                )?.onKeyDown?.(props) ?? false
              );
            },

            onExit() {
              popup?.[0]?.destroy();
              component?.destroy();
            },
          };
        },
      }),
    ];
  },
});
