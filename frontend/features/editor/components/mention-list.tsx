'use client';

import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { cn } from '@/lib/utils';

// Types for mention suggestion items
interface MentionItem {
    id: string;
    name: string;
    category?: string;
}

interface MentionListProps {
    items: MentionItem[];
    command: (item: { id: string; label: string }) => void;
}

export interface MentionListRef {
    onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>((props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
        const item = props.items[index];
        if (item) {
            props.command({ id: item.id, label: item.name });
        }
    };

    const upHandler = () => {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
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
            if (event.key === 'ArrowUp') {
                upHandler();
                return true;
            }

            if (event.key === 'ArrowDown') {
                downHandler();
                return true;
            }

            if (event.key === 'Enter') {
                enterHandler();
                return true;
            }

            return false;
        },
    }));

    return (
        <div className="bg-popover text-popover-foreground border rounded-md shadow-md overflow-hidden p-1 min-w-[150px]">
            {props.items.length ? (
                props.items.map((item, index) => (
                    <button
                        className={cn(
                            'flex w-full items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none',
                            index === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                        )}
                        key={index}
                        onClick={() => selectItem(index)}
                    >
                        {item.name} <span className="ml-auto text-xs text-muted-foreground opacity-50">{item.category}</span>
                    </button>
                ))
            ) : (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">No result</div>
            )}
        </div>
    );
});

MentionList.displayName = 'MentionList';

