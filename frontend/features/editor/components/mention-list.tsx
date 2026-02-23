"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { cn } from "@/lib/utils";

// Types for mention suggestion items
interface MentionItem {
  id: string;
  name: string;
  category?: string;
  matchedAlias?: string;
}

interface MentionListProps {
  items: MentionItem[];
  command: (item: { id: string; label: string }) => void;
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  (props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
      const item = props.items[index];
      if (item) {
        props.command({ id: item.id, label: item.name });
      }
    };

    const upHandler = () => {
      setSelectedIndex(
        (selectedIndex + props.items.length - 1) % props.items.length,
      );
    };

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % props.items.length);
    };

    const enterHandler = () => {
      selectItem(selectedIndex);
    };

    useEffect(() => {
      setSelectedIndex(0);
    }, [props.items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === "ArrowUp") {
          upHandler();
          return true;
        }

        if (event.key === "ArrowDown") {
          downHandler();
          return true;
        }

        if (event.key === "Enter") {
          enterHandler();
          return true;
        }

        return false;
      },
    }));

    return (
      <div className="bg-popover text-popover-foreground border rounded-md shadow-md overflow-hidden p-1 min-w-select-sm">
        {props.items.length > 0 && (
          <div className="px-2 py-1 text-[11px] text-muted-foreground border-b mb-1">
            <span>Use </span>
            <kbd>Up/Down</kbd>
            <span> to navigate, </span>
            <kbd>Enter</kbd>
            <span> to tag</span>
          </div>
        )}
        {props.items.length ? (
          props.items.map((item, index) => (
            <button
              className={cn(
                "flex w-full items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none",
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent hover:text-accent-foreground",
              )}
              key={index}
              onClick={() => selectItem(index)}
            >
              <span className="truncate">
                @{item.name}
                {item.matchedAlias ? (
                  <span className="ml-1 text-xs text-muted-foreground opacity-70">
                    via {item.matchedAlias}
                  </span>
                ) : null}
              </span>
              <span className="ml-auto text-xs text-muted-foreground opacity-50">
                {item.category}
              </span>
            </button>
          ))
        ) : (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            No codex matches. Add entries in Codex to tag with @.
          </div>
        )}
      </div>
    );
  },
);

MentionList.displayName = "MentionList";
