'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card } from '@/components/ui/card';

interface SlashCommandsListProps {
    items: any[];
    command: any;
}

export const SlashCommandsList = forwardRef((props: SlashCommandsListProps, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        setSelectedIndex(0);
    }, [props.items]);

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'ArrowUp') {
                setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
                return true;
            }

            if (event.key === 'ArrowDown') {
                setSelectedIndex((selectedIndex + 1) % props.items.length);
                return true;
            }

            if (event.key === 'Enter') {
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

    return (
        <Card className="p-1 max-h-80 overflow-auto">
            {props.items.length > 0 ? (
                props.items.map((item, index) => (
                    <button
                        key={index}
                        onClick={() => selectItem(index)}
                        className={`flex items-start gap-2 w-full px-3 py-2 text-left rounded hover:bg-accent transition-colors ${index === selectedIndex ? 'bg-accent' : ''
                            }`}
                    >
                        <span className="text-xl">{item.icon}</span>
                        <div>
                            <div className="font-medium text-sm">{item.title}</div>
                            <div className="text-xs text-muted-foreground">{item.description}</div>
                        </div>
                    </button>
                ))
            ) : (
                <div className="px-3 py-2 text-sm text-muted-foreground">No results</div>
            )}
        </Card>
    );
});

SlashCommandsList.displayName = 'SlashCommandsList';
