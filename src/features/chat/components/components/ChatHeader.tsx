'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Pin, Archive, Download, Trash2, Settings as SettingsIcon } from 'lucide-react';

interface ChatHeaderProps {
    threadName: string;
    isPinned: boolean;
    onNameChange: (name: string) => void;
    onPin: () => void;
    onArchive: () => void;
    onExport: () => void;
    onDelete: () => void;
    onOpenSettings: () => void;
}

/**
 * Chat Header Component  
 * Displays thread name with inline editing and action menu
 */
export function ChatHeader({
    threadName,
    isPinned,
    onNameChange,
    onPin,
    onArchive,
    onExport,
    onDelete,
    onOpenSettings,
}: ChatHeaderProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(threadName);

    const handleSaveName = () => {
        onNameChange(name);
        setIsEditing(false);
    };

    return (
        <div className="border-b p-3 flex items-center gap-2 bg-background z-10">
            {isEditing ? (
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveName();
                        if (e.key === 'Escape') {
                            setName(threadName);
                            setIsEditing(false);
                        }
                    }}
                    className="flex-1"
                    autoFocus
                />
            ) : (
                <h2
                    className="flex-1 font-semibold cursor-pointer hover:text-primary"
                    onClick={() => setIsEditing(true)}
                >
                    {threadName}
                </h2>
            )}

            {/* Actions Menu */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onPin}>
                        <Pin className="h-4 w-4 mr-2" />
                        {isPinned ? 'Unpin' : 'Pin'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onArchive}>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onOpenSettings}>
                        <SettingsIcon className="h-4 w-4 mr-2" />
                        Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onDelete} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
