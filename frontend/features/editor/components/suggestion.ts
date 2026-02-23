import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { MentionList, MentionListRef } from "./mention-list";
import type { ICodexRepository } from "@/domain/repositories/ICodexRepository";
import type { Editor } from "@tiptap/core";

// Type for Tiptap suggestion callback props
interface SuggestionProps {
  editor: Editor;
  clientRect?: (() => DOMRect | null) | null;
  items: Array<{
    id: string;
    name: string;
    category: string;
    matchedAlias?: string;
  }>;
  command: (item: { id: string; label: string }) => void;
  event?: KeyboardEvent;
}

// Type for onKeyDown specifically (Tiptap only passes event)
interface SuggestionKeyDownProps {
  event: KeyboardEvent;
}

/**
 * Creates a Tiptap suggestion configuration for codex mentions
 * Factory function to allow dependency injection of seriesId and repository
 * Series-first: uses seriesId for codex lookups
 */
export const createCodexSuggestion = (
  seriesId: string,
  codexRepo: ICodexRepository,
) => ({
  items: async ({ query }: { query: string }) => {
    const entries = await codexRepo.getBySeries(seriesId);
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return entries.slice(0, 5).map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category || "uncategorized",
      }));
    }

    return entries
      .map((item) => {
        const normalizedName = item.name.toLowerCase();
        const aliases = item.aliases ?? [];
        const normalizedAliases = aliases.map((alias) => alias.toLowerCase());
        const aliasMatch = aliases.find((alias) =>
          alias.toLowerCase().includes(normalizedQuery),
        );

        let score = 0;
        if (normalizedName.startsWith(normalizedQuery)) {
          score = 4;
        } else if (normalizedName.includes(normalizedQuery)) {
          score = 3;
        } else if (
          normalizedAliases.some((alias) => alias.startsWith(normalizedQuery))
        ) {
          score = 2;
        } else if (aliasMatch) {
          score = 1;
        }

        return { item, score, aliasMatch };
      })
      .filter((row) => row.score > 0)
      .sort(
        (a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name),
      )
      .slice(0, 10)
      .map(({ item, aliasMatch }) => ({
        id: item.id,
        name: item.name,
        category: item.category || "uncategorized",
        matchedAlias: aliasMatch,
      }));
  },

  render: () => {
    let component: ReactRenderer<MentionListRef>;
    let popup: TippyInstance[];

    return {
      onStart: (props: SuggestionProps) => {
        component = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        popup = tippy("body", {
          getReferenceClientRect: () => {
            const rect = props.clientRect?.();
            return rect || new DOMRect(0, 0, 0, 0);
          },
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
        });
      },

      onUpdate(props: SuggestionProps) {
        component.updateProps(props);

        if (!props.clientRect) {
          return;
        }

        popup?.[0]?.setProps({
          getReferenceClientRect: () => {
            const rect = props.clientRect?.();
            return rect || new DOMRect(0, 0, 0, 0);
          },
        });
      },

      onKeyDown(props: SuggestionKeyDownProps) {
        if (props.event.key === "Escape") {
          popup?.[0]?.hide();
          return true;
        }

        return component.ref?.onKeyDown({ event: props.event }) ?? false;
      },

      onExit() {
        popup?.[0]?.destroy();
        component.destroy();
      },
    };
  },
});
