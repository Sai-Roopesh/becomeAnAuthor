/**
 * Collaboration Panel Component
 * 
 * Shows collaboration status, connected peers, and sharing options.
 * Per CODING_GUIDELINES.md: Feature-Sliced Design
 */

'use client';

import { Users, Wifi, WifiOff, Loader2, Copy, CheckCheck, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useState } from 'react';
import type { CollaborationStatus, CollaborationPeer } from '@/domain/entities/types';
import { TIMING } from '@/lib/config/timing';

interface CollaborationPanelProps {
    status: CollaborationStatus;
    peers: CollaborationPeer[];
    roomId: string;
    enabled: boolean;
    isJoinedRoom?: boolean;
    onToggle: (enabled: boolean) => void;
    onJoinRoom?: (roomId: string) => void;
    onLeaveRoom?: () => void;
}

export function CollaborationPanel({
    status,
    peers,
    roomId,
    enabled,
    isJoinedRoom = false,
    onToggle,
    onJoinRoom,
    onLeaveRoom,
}: CollaborationPanelProps) {
    const [copied, setCopied] = useState(false);
    const [joinRoomInput, setJoinRoomInput] = useState('');
    const [joinError, setJoinError] = useState<string | null>(null);

    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId);
        setCopied(true);
        setTimeout(() => setCopied(false), TIMING.COPIED_FEEDBACK_MS);
    };

    const handleJoinRoom = () => {
        const trimmed = joinRoomInput.trim();
        if (!trimmed) {
            setJoinError('Please enter a room ID');
            return;
        }
        if (!trimmed.startsWith('becomeauthor-')) {
            setJoinError('Invalid room ID format');
            return;
        }
        setJoinError(null);
        setJoinRoomInput('');
        onJoinRoom?.(trimmed);
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'synced':
                return <Wifi className="h-4 w-4 text-green-500" />;
            case 'syncing':
            case 'connecting':
                return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />;
            default:
                return <WifiOff className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'synced':
                return isJoinedRoom ? 'Joined' : 'Connected';
            case 'syncing':
                return 'Syncing...';
            case 'connecting':
                return 'Connecting...';
            default:
                return 'Offline';
        }
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                    {getStatusIcon()}
                    <Users className="h-4 w-4" />
                    {peers.length > 0 && (
                        <Badge variant="secondary" className="h-5 px-1.5">
                            {peers.length}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold">Collaboration</h4>
                        <Badge variant={status === 'synced' ? 'default' : 'secondary'}>
                            {getStatusText()}
                        </Badge>
                    </div>

                    {/* Toggle */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                            Enable P2P Sync
                        </span>
                        <Button
                            variant={enabled ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onToggle(!enabled)}
                        >
                            {enabled ? 'On' : 'Off'}
                        </Button>
                    </div>

                    {enabled && (
                        <>
                            {/* Joined Room Indicator */}
                            {isJoinedRoom && onLeaveRoom && (
                                <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-md">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-blue-600 dark:text-blue-400">
                                            Joined external room
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={onLeaveRoom}
                                            className="h-7 text-xs"
                                        >
                                            Leave
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Your Room ID - for sharing */}
                            <div className="space-y-2">
                                <span className="text-sm font-medium">
                                    {isJoinedRoom ? 'Current Room ID' : 'Your Room ID'}
                                </span>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 px-2 py-1.5 bg-muted rounded text-xs truncate font-mono">
                                        {roomId}
                                    </code>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 shrink-0"
                                        onClick={copyRoomId}
                                    >
                                        {copied ? (
                                            <CheckCheck className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Share this ID with collaborators
                                </p>
                            </div>

                            {/* Join Room - for joining others */}
                            {!isJoinedRoom && onJoinRoom && (
                                <div className="space-y-2 pt-2 border-t">
                                    <span className="text-sm font-medium">
                                        Join Another Room
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            placeholder="Paste room ID..."
                                            value={joinRoomInput}
                                            onChange={(e) => {
                                                setJoinRoomInput(e.target.value);
                                                setJoinError(null);
                                            }}
                                            className="h-8 text-xs font-mono"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleJoinRoom();
                                            }}
                                        />
                                        <Button
                                            variant="default"
                                            size="sm"
                                            className="h-8 shrink-0"
                                            onClick={handleJoinRoom}
                                        >
                                            <LogIn className="h-3 w-3 mr-1" />
                                            Join
                                        </Button>
                                    </div>
                                    {joinError && (
                                        <p className="text-xs text-red-500">{joinError}</p>
                                    )}
                                </div>
                            )}

                            {/* Connected Peers */}
                            <div className="space-y-2 pt-2 border-t">
                                <span className="text-sm text-muted-foreground">
                                    Connected Peers ({peers.length})
                                </span>
                                {peers.length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic">
                                        No other collaborators connected
                                    </p>
                                ) : (
                                    <div className="space-y-1">
                                        {peers.map((peer) => (
                                            <div
                                                key={peer.id}
                                                className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                                            >
                                                <div
                                                    className="h-3 w-3 rounded-full"
                                                    style={{ backgroundColor: peer.color }}
                                                />
                                                <span className="text-sm">{peer.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
