'use client';

import { useMentions } from '@/hooks/use-mentions';
import { Loader2, FileText, MessageSquare, BookOpen, Archive } from 'lucide-react';

interface MentionsTabProps {
    entityId: string;
    entityName: string;
}

// Map source types to icons
const sourceIcons: Record<string, React.ReactNode> = {
    scene: <FileText className="w-4 h-4" />,
    codex: <BookOpen className="w-4 h-4" />,
    snippet: <Archive className="w-4 h-4" />,
    chat: <MessageSquare className="w-4 h-4" />,
};

export function MentionsTab({ entityId, entityName }: MentionsTabProps) {
    const { mentions, count, loading, error, refresh } = useMentions(entityId);

    return (
        <div className="max-w-3xl space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-medium">Mentions ({count})</h3>
                    <p className="text-sm text-muted-foreground">
                        Where "{entityName}" appears in your project.
                    </p>
                </div>
                <button
                    onClick={refresh}
                    className="text-sm text-muted-foreground hover:text-foreground"
                    disabled={loading}
                >
                    Refresh
                </button>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-12 border rounded-lg">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Scanning project...</span>
                </div>
            )}

            {error && (
                <div className="text-sm text-destructive text-center py-8 border rounded-lg border-destructive/20">
                    {error}
                </div>
            )}

            {!loading && !error && mentions.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-12 border rounded-lg">
                    No mentions found for "{entityName}"
                </div>
            )}

            {!loading && !error && mentions.length > 0 && (
                <div className="space-y-2">
                    {mentions.map((mention) => (
                        <div
                            key={mention.id}
                            className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                            <div className="flex items-center gap-2 text-sm font-medium">
                                {sourceIcons[mention.sourceType] || <FileText className="w-4 h-4" />}
                                <span className="capitalize">{mention.sourceType}</span>
                                <span className="text-muted-foreground">•</span>
                                <span>{mention.sourceTitle}</span>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                {mention.context}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

