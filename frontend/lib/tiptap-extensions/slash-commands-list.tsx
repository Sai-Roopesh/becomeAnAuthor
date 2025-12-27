'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card } from '@/components/ui/card';
import type { SlashCommandItem } from './slash-commands';

interface SlashCommandsListProps {
    items: SlashCommandItem[];
    command: (item: SlashCommandItem) => void;
}

export interface SlashCommandsListRef {
    onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const SlashCommandsList = forwardRef<SlashCommandsListRef, SlashCommandsListProps>((props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        setSelectedIndex(0);
    }, [props.items]);

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
                return true;
            }

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setSelectedIndex((selectedIndex + 1) % props.items.length);
                return true;
            }

            if (event.key === 'Enter') {
                event.preventDefault();
                selectItem(selectedIndex);
                return true;
            }

            return false;
        },
    }));

    const selectItem = (index: number) => {
        const item = props.items[index];
        if (item) {
            props.command(item);
        }
    };

    if (props.items.length === 0) {
        return (
            <Card className="p-3 shadow-lg border">
                <div className="text-sm text-muted-foreground">No commands found</div>
            </Card>
        );
    }

    return (
        <Card className="p-1 max-h-80 overflow-auto shadow-lg border min-w-[280px]">
            {props.items.map((item, index) => (
                <button
                    key={item.title}
                    onClick={() => selectItem(index)}
                    className={`flex items-start gap-3 w-full px-3 py-2 text-left rounded-md transition-colors ${index === selectedIndex
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-muted/50'
                        }`}
                >
                    {/* Icon */}
                    <span className="flex-shrink-0 mt-0.5">
                        {item.icon}
                    </span>
                    {/* Text */}
                    <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{item.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                            {item.description}
                        </div>
                    </div>
                </button>
            ))}

            {/* Footer hint */}
            <div className="mt-1 px-3 py-1.5 border-t text-[10px] text-muted-foreground flex items-center gap-2">
                <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">↑↓</kbd>
                <span>navigate</span>
                <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">↵</kbd>
                <span>select</span>
                <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">esc</kbd>
                <span>close</span>
            </div>
        </Card>
    );
});

SlashCommandsList.displayName = 'SlashCommandsList';
