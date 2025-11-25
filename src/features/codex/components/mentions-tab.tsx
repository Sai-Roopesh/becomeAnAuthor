'use client';

interface MentionsTabProps {
    entityId: string;
    entityName: string;
}

export function MentionsTab({ entityId, entityName }: MentionsTabProps) {
    // TODO: Implement mention tracking across manuscript, summaries, codex, snippets, chats

    return (
        <div className="max-w-3xl space-y-4">
            <div>
                <h3 className="font-medium">Mentions</h3>
                <p className="text-sm text-muted-foreground">
                    Track where "{entityName}" is mentioned throughout your project.
                </p>
            </div>

            <div className="text-sm text-muted-foreground text-center py-12 border rounded-lg">
                Mention tracking coming soon...
            </div>
        </div>
    );
}
