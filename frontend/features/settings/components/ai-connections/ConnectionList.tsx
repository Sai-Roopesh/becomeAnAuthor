'use client';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus } from 'lucide-react';
import { AIConnection, AI_VENDORS } from '@/lib/config/ai-vendors';
import { VendorLogo } from '../VendorLogo';

interface ConnectionListProps {
    connections: AIConnection[];
    selectedId: string;
    onSelect: (id: string) => void;
    onAddNew: () => void;
}

/**
 * Left sidebar displaying list of AI connections.
 */
export function ConnectionList({ connections, selectedId, onSelect, onAddNew }: ConnectionListProps) {
    return (
        <div className="w-64 flex flex-col gap-4">
            <ScrollArea className="flex-1 border rounded-md">
                <div className="p-2 space-y-2">
                    {connections.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No connections yet
                        </div>
                    ) : (
                        connections.map((conn) => {
                            const vendor = AI_VENDORS[conn.provider];
                            return (
                                <button
                                    key={conn.id}
                                    onClick={() => onSelect(conn.id)}
                                    className={`
                                        w-full p-3 rounded-md text-left transition-colors
                                        hover:bg-accent
                                        ${selectedId === conn.id ? 'bg-accent border-2 border-primary' : 'border border-border'}
                                    `}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <VendorLogo providerId={conn.provider} size={20} />
                                        <span className="font-medium text-sm truncate">{conn.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">{vendor.name}</span>
                                        {conn.enabled ? (
                                            <span className="text-xs bg-green-500/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">
                                                Active
                                            </span>
                                        ) : (
                                            <span className="text-xs bg-gray-500/20 text-gray-700 dark:text-gray-400 px-1.5 py-0.5 rounded">
                                                Disabled
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </ScrollArea>

            <Button onClick={onAddNew} className="w-full" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add New Connection
            </Button>
        </div>
    );
}
